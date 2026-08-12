import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { OpportunityPipeline } from './server/services/opportunityPipeline.ts';
import { JobLPaymentService } from './server/services/paymentService.ts';
import { CvIntelligenceService } from './server/services/cvIntelligenceService.ts';
import { JobRequirementService } from './server/services/jobRequirementService.ts';
import { ApplicationReadinessService } from './server/services/applicationReadinessService.ts';
import { ApplicationDocumentService } from './server/services/applicationDocumentService.ts';
import { validateExtraction } from "./server/services/cvExtractionValidator.js";
import { AnalyticsService } from './server/services/analyticsService.ts';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// Initialize services
const pipeline = new OpportunityPipeline();
const paymentService = new JobLPaymentService();
const cvService = new CvIntelligenceService();
const jobReqService = new JobRequirementService();
const readinessService = new ApplicationReadinessService();
const docService = new ApplicationDocumentService();
const analytics = new AnalyticsService();

// Log initial landing page view event
analytics.logEvent('landing_page_view', { platform: 'web', initial: true });

// API ROUTES FIRST

// 1. Search Opportunities API
app.get('/api/opportunities/search', async (req, res) => {
  try {
    const { city, province, category, sector, experience, keywords, page } = req.query;

    analytics.logEvent('search_started', {
      city: (city as string) || 'All',
      province: (province as string) || 'All',
      category: (category as string) || 'All',
      sector: (sector as string) || 'All',
      experience: (experience as string) || 'All',
    });

    const xForwardedFor = req.headers['x-forwarded-for'];
    const userIp = typeof xForwardedFor === 'string'
      ? xForwardedFor.split(',')[0].trim()
      : (req.ip || (req.socket && req.socket.remoteAddress) || '');
    const userAgent = (req.headers['user-agent'] as string) || '';

    const queryParams = {
      city: city as string,
      province: province as string,
      category: category as string,
      sector: sector as string,
      experience: experience as string,
      keywords: keywords as string,
      page: page ? parseInt(page as string, 10) : 1,
      userIp,
      userAgent,
    };

    const allValidated = await pipeline.fetchAllValidatedOpportunities(queryParams);
    const filtered = pipeline.scoreAndFilterOpportunities(
      allValidated,
      city as string,
      province as string,
      category as string,
      experience as string,
      sector as string
    );

    res.json({
      success: true,
      count: filtered.length,
      opportunities: filtered,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Get Single Opportunity Detail API
app.get('/api/opportunities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const allValidated = await pipeline.fetchAllValidatedOpportunities();
    const opportunity = allValidated.find((o) => o.id === id);

    if (!opportunity) {
      return res.status(404).json({ success: false, error: 'Opportunity not found' });
    }

    analytics.logEvent('opportunity_clicked', {
      opportunityId: id,
      title: opportunity.title,
      employer: opportunity.employer,
    });

    res.json({ success: true, opportunity });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Source Health Diagnostics API
app.get('/api/sources/health', async (req, res) => {
  try {
    const health = await pipeline.getSourceHealth();
    res.json({ success: true, health });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Create Payment API (Peach Payments / Ozow / Voucher)
app.post('/api/payment/create', async (req, res) => {
  try {
    const { opportunityId, candidateEmail, provider, voucherCode } = req.body;

    analytics.logEvent('payment_started', { opportunityId, candidateEmail, provider });

    const tx = await paymentService.createPayment(
      opportunityId,
      candidateEmail,
      provider,
      voucherCode
    );

    analytics.logEvent('payment_completed', {
      transactionId: tx.transactionId,
      provider: tx.provider,
      amount: tx.amount,
    });

    res.json({ success: true, transaction: tx });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 5. Server-side Verify Payment API
app.get('/api/payment/verify/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;
    const tx = await paymentService.verifyPayment(transactionId);
    res.json({ success: true, verified: true, transaction: tx });
  } catch (error: any) {
    res.status(400).json({ success: false, verified: false, error: error.message });
  }
});

// 6. CV Analysis and Tailoring API (Gemini integration)
app.post('/api/cv/analyze-and-prepare', async (req, res) => {
  try {
    const { candidate, cvText, opportunity, transactionId } = req.body;

    // Verify payment transaction server-side before running preparation!
    if (!transactionId) {
      return res.status(403).json({ success: false, error: 'Verified R5 payment required.' });
    }
    await paymentService.verifyPayment(transactionId);

    analytics.logEvent('cv_analysis_started', {
      opportunityId: opportunity.id,
      candidateEmail: candidate.email,
    });

    const analysis = await cvService.analyzeAndPrepareApplication(
      candidate,
      cvText,
      opportunity
    );

    analytics.logEvent('cv_generated', {
      opportunityId: opportunity.id,
      score: analysis.overallCompatibilityScore,
    });

    analytics.logEvent('application_package_completed', {
      opportunityId: opportunity.id,
    });

    res.json({ success: true, cvAnalysis: analysis });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6b. Real CV Upload and Extraction API (Phase 2A)
app.post('/api/cv/upload-and-extract', async (req, res) => {
  try {
    const { fileName, fileType, fileDataBase64 } = req.body;

    if (!fileName || !fileDataBase64) {
      analytics.logEvent('cv_extraction_failed', {
        reason: 'missing_payload',
        message: 'File name and file content are required.',
      });
      return res.status(400).json({ success: false, error: 'File name and file content are required.' });
    }

    const fileSizeBytes = Math.round((fileDataBase64.length * 3) / 4);

    analytics.logEvent('cv_upload_started', {
      fileName,
      fileType: fileType || 'unknown',
      sizeBytes: fileSizeBytes,
    });

    // Validate size (10 MB max)
    if (fileSizeBytes > 10 * 1024 * 1024) {
      analytics.logEvent('cv_extraction_failed', {
        fileName,
        reason: 'file_too_large',
        message: 'File size exceeds 10MB limit.',
      });
      return res.status(400).json({ success: false, error: 'CV file size exceeds the 10MB limit. Please upload a smaller file.' });
    }

    // Validate file type
    const lowerName = fileName.toLowerCase();
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.rtf'];
    const isAllowedExt = allowedExtensions.some(ext => lowerName.endsWith(ext));

    if (!isAllowedExt) {
      analytics.logEvent('cv_extraction_failed', {
        fileName,
        reason: 'invalid_file_type',
        message: 'Unsupported format.',
      });
      return res.status(400).json({ success: false, error: 'Unsupported file format. Please upload a PDF, DOC, DOCX, or TXT document.' });
    }

    analytics.logEvent('cv_uploaded', {
      fileName,
      fileType: fileType || 'application/pdf',
      sizeBytes: fileSizeBytes,
    });

    const extractedData = await cvService.extractCvContent(fileDataBase64, fileType, fileName);

    const validation = validateExtraction(extractedData.rawExtractedText || '', extractedData);

    analytics.logEvent('cv_extraction_completed', {
      fileName,
      status: validation.status,
      hasFirstName: Boolean(extractedData.firstName),
      hasEmail: Boolean(extractedData.email),
      hasPhone: Boolean(extractedData.phone),
    });

    res.json({
      success: validation.status === 'COMPLETE' || validation.status === 'NEEDS_REVIEW',
      extractionStatus: validation.status,
      extractionReasons: validation.reasons,
      fileName,
      fileType: fileType || 'application/pdf',
      uploadedAt: new Date().toISOString(),
      extractedData,
    });
  } catch (error: any) {
    analytics.logEvent('cv_extraction_failed', {
      error: error.message,
    });
    const message = error.message || 'CV extraction failed.';
    let status = 'FAILED';
    if (message.includes('scanned')) status = 'OCR_REQUIRED';
    else if (message.includes('Unsupported file format')) status = 'UNSUPPORTED_FORMAT';
    
    res.status(400).json({ success: false, error: message, extractionStatus: status });
  }
});

// 6c. Job Requirements Extraction API (Phase 2B)
app.post('/api/job-intelligence/extract-requirements', async (req, res) => {
  try {
    const { opportunityId, opportunity } = req.body;
    let jobData = opportunity;

    if (!jobData && opportunityId) {
      const allValidated = await pipeline.fetchAllValidatedOpportunities();
      jobData = allValidated.find((o) => o.id === opportunityId);
    }

    if (!jobData) {
      return res.status(400).json({ success: false, error: 'Opportunity details or ID required.' });
    }

    const jobRequirements = await jobReqService.extractJobRequirements(jobData);
    res.json({ success: true, jobRequirements });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Job requirements extraction failed.' });
  }
});

// 6d. Candidate / Job Match Intelligence API (Phase 2B)
app.post('/api/job-intelligence/compare', async (req, res) => {
  try {
    const { candidateProfile, opportunityId, opportunity, jobRequirements } = req.body;

    if (!candidateProfile) {
      return res.status(400).json({ success: false, error: 'Candidate profile data is required for comparison.' });
    }

    let reqs = jobRequirements;
    if (!reqs) {
      let jobData = opportunity;
      if (!jobData && opportunityId) {
        const allValidated = await pipeline.fetchAllValidatedOpportunities();
        jobData = allValidated.find((o) => o.id === opportunityId);
      }
      if (!jobData) {
        return res.status(400).json({ success: false, error: 'Opportunity details or job requirements required.' });
      }
      reqs = await jobReqService.extractJobRequirements(jobData);
    }

    const analysis = jobReqService.compareCandidateToJob(candidateProfile, reqs);
    res.json({ success: true, analysis, jobRequirements: reqs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Candidate/Job comparison failed.' });
  }
});

// 6e. Application Readiness & Gap Resolution API (Phase 2C)
app.post('/api/application-readiness/analyze', async (req, res) => {
  try {
    const { candidateProfile, opportunityId, opportunity, jobRequirements, matchAnalysis, candidateConfirmations } = req.body;

    if (!candidateProfile) {
      return res.status(400).json({ success: false, error: 'Candidate profile data is required.' });
    }

    let reqs = jobRequirements;
    let match = matchAnalysis;

    if (!reqs || !match) {
      let jobData = opportunity;
      if (!jobData && opportunityId) {
        const allValidated = await pipeline.fetchAllValidatedOpportunities();
        jobData = allValidated.find((o) => o.id === opportunityId);
      }
      if (!jobData) {
        return res.status(400).json({ success: false, error: 'Opportunity details required for application readiness.' });
      }
      reqs = reqs || (await jobReqService.extractJobRequirements(jobData));
      match = match || jobReqService.compareCandidateToJob(candidateProfile, reqs);
    }

    const readinessAnalysis = readinessService.analyzeReadiness(
      candidateProfile,
      reqs,
      match,
      candidateConfirmations || {}
    );

    res.json({
      success: true,
      readinessAnalysis,
      matchAnalysis: match,
      jobRequirements: reqs,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Application readiness analysis failed.' });
  }
});

// 6f. Application Document Generation & Download API (Phase 2D)
app.post('/api/application-documents/generate-cv', async (req, res) => {
  try {
    const { candidateProfile, opportunityId, opportunity, jobRequirements, matchAnalysis, readinessAnalysis, candidateConfirmations } = req.body;

    if (!candidateProfile) {
      return res.status(400).json({ success: false, error: 'Candidate profile data is required.' });
    }

    let reqs = jobRequirements;
    let match = matchAnalysis;
    let readiness = readinessAnalysis;

    if (!reqs || !match || !readiness) {
      let jobData = opportunity;
      if (!jobData && opportunityId) {
        const allValidated = await pipeline.fetchAllValidatedOpportunities();
        jobData = allValidated.find((o) => o.id === opportunityId);
      }
      if (!jobData) {
        return res.status(400).json({ success: false, error: 'Opportunity details required for document generation.' });
      }
      reqs = reqs || (await jobReqService.extractJobRequirements(jobData));
      match = match || jobReqService.compareCandidateToJob(candidateProfile, reqs);
      readiness = readiness || readinessService.analyzeReadiness(candidateProfile, reqs, match, candidateConfirmations || {});
    }

    const { response } = await docService.generateCV(
      candidateProfile,
      reqs,
      match,
      readiness,
      candidateConfirmations || {}
    );

    res.json({ success: true, document: response });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'CV generation failed.' });
  }
});

app.post('/api/application-documents/generate-cover-letter', async (req, res) => {
  try {
    const { candidateProfile, opportunityId, opportunity, jobRequirements, matchAnalysis, readinessAnalysis, candidateConfirmations } = req.body;

    if (!candidateProfile) {
      return res.status(400).json({ success: false, error: 'Candidate profile data is required.' });
    }

    let reqs = jobRequirements;
    let match = matchAnalysis;
    let readiness = readinessAnalysis;

    if (!reqs || !match || !readiness) {
      let jobData = opportunity;
      if (!jobData && opportunityId) {
        const allValidated = await pipeline.fetchAllValidatedOpportunities();
        jobData = allValidated.find((o) => o.id === opportunityId);
      }
      if (!jobData) {
        return res.status(400).json({ success: false, error: 'Opportunity details required for document generation.' });
      }
      reqs = reqs || (await jobReqService.extractJobRequirements(jobData));
      match = match || jobReqService.compareCandidateToJob(candidateProfile, reqs);
      readiness = readiness || readinessService.analyzeReadiness(candidateProfile, reqs, match, candidateConfirmations || {});
    }

    const { response } = await docService.generateCoverLetter(
      candidateProfile,
      reqs,
      match,
      readiness,
      candidateConfirmations || {}
    );

    res.json({ success: true, document: response });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Cover letter generation failed.' });
  }
});

app.get('/api/application-documents/download/:documentId', (req, res) => {
  try {
    const { documentId } = req.params;
    const stored = docService.getStoredDocument(documentId);

    if (!stored) {
      return res.status(404).send('Document not found or session expired.');
    }

    const filename = `${stored.response.documentType.toLowerCase()}_${stored.response.metadata.jobTitle.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', stored.pdfBuffer.length.toString());
    res.send(stored.pdfBuffer);
  } catch (error: any) {
    res.status(500).send(`Download failed: ${error.message}`);
  }
});

// 7. Log Analytics Event API
app.post('/api/analytics/event', (req, res) => {
  try {
    const { eventName, metadata } = req.body;
    const evt = analytics.logEvent(eventName, metadata);
    res.json({ success: true, event: evt });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 8. Operator Dashboard Stats API
app.get('/api/operator/stats', async (req, res) => {
  try {
    const allValidated = await pipeline.fetchAllValidatedOpportunities();
    const sourceHealth = await pipeline.getSourceHealth();
    const stats = analytics.getStats(allValidated.length, allValidated.length, sourceHealth);
    res.json({ success: true, stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 9. Phase 1B Automated Acceptance Tests API
app.get('/api/tests/phase1b', async (req, res) => {
  try {
    const { runPhase1BAcceptanceTests } = await import('./server/tests/phase1bAcceptance.ts');
    const testResults = await runPhase1BAcceptanceTests();
    res.json({ success: true, ...testResults });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 10. Geographic Integrity & Opportunity Quality Audit API
app.get('/api/tests/geographic-integrity', async (req, res) => {
  try {
    const { GeographicIntegrityAuditSuite } = await import('./server/tests/geographicIntegrityAcceptance');
    const suite = new GeographicIntegrityAuditSuite();
    const auditResults = await suite.runFullSuite();
    res.json({ success: true, ...auditResults });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// VITE MIDDLEWARE SETUP FOR DEV & PRODUCTION SERVING
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`JobL Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
