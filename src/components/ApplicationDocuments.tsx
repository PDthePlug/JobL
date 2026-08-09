import React, { useState } from 'react';
import { Download, FileText, CheckCircle2, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import {
  ExtractedCVData,
  Opportunity,
  JobRequirements,
  JobMatchAnalysis,
  ApplicationReadinessAnalysis,
  GeneratedDocumentResponse,
} from '../types';

interface ApplicationDocumentsProps {
  candidateProfile: ExtractedCVData;
  opportunity: Opportunity;
  jobRequirements?: JobRequirements;
  matchAnalysis?: JobMatchAnalysis;
  readinessAnalysis?: ApplicationReadinessAnalysis;
  candidateConfirmations?: Record<string, string>;
}

export const ApplicationDocuments: React.FC<ApplicationDocumentsProps> = ({
  candidateProfile,
  opportunity,
  jobRequirements,
  matchAnalysis,
  readinessAnalysis,
  candidateConfirmations = {},
}) => {
  const [cvDoc, setCvDoc] = useState<GeneratedDocumentResponse | null>(null);
  const [coverLetterDoc, setCoverLetterDoc] = useState<GeneratedDocumentResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [activePreview, setActivePreview] = useState<'CV' | 'COVER_LETTER' | null>(null);

  const handleGenerateDocuments = async () => {
    setIsGenerating(true);
    setGenerationError(null);

    try {
      // 1. Request CV Generation
      const cvRes = await fetch('/api/application-documents/generate-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateProfile,
          opportunity,
          opportunityId: opportunity.id,
          jobRequirements,
          matchAnalysis,
          readinessAnalysis,
          candidateConfirmations,
        }),
      });

      const cvData = await cvRes.json();
      if (!cvData.success) {
        throw new Error(cvData.error || 'Failed to generate tailored CV.');
      }
      setCvDoc(cvData.document);

      // 2. Request Cover Letter Generation
      const clRes = await fetch('/api/application-documents/generate-cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateProfile,
          opportunity,
          opportunityId: opportunity.id,
          jobRequirements,
          matchAnalysis,
          readinessAnalysis,
          candidateConfirmations,
        }),
      });

      const clData = await clRes.json();
      if (!clData.success) {
        throw new Error(clData.error || 'Failed to generate tailored Cover Letter.');
      }
      setCoverLetterDoc(clData.document);
    } catch (err: any) {
      setGenerationError(err.message || 'An error occurred during document generation.');
    } finally {
      setIsGenerating(false);
    }
  };

  const isReady =
    readinessAnalysis?.readinessState === 'READY_TO_APPLY' ||
    readinessAnalysis?.readinessState === 'READY_AFTER_CONFIRMATION' ||
    !readinessAnalysis;

  return (
    <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 border border-slate-800 shadow-xl space-y-6">
      {/* Header Badge & Title */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            APPLICATION READY
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">Professional Application Documents</h3>
          <p className="text-sm text-slate-400">
            Your tailored, job-specific CV and cover letter prepared for <strong className="text-slate-200">{opportunity.title}</strong> at <strong className="text-slate-200">{opportunity.employer}</strong>.
          </p>
        </div>
      </div>

      {generationError && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-4 rounded-xl text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Document Generation Validation Notice</p>
            <p className="mt-0.5">{generationError}</p>
          </div>
        </div>
      )}

      {/* Main Action Trigger or Documents List */}
      {!cvDoc && !coverLetterDoc ? (
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/60 text-center space-y-4">
          <p className="text-xs text-slate-300 max-w-md mx-auto">
            Click below to compile your verified credentials, employment history, and job readiness analysis into downloadable PDF documents.
          </p>
          <button
            onClick={handleGenerateDocuments}
            disabled={isGenerating || !isReady}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white bg-blue-600 hover:bg-blue-500 active:scale-98 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                Compiling Professional Documents...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-blue-200" />
                Generate Application Documents
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* CV Card */}
          {cvDoc && (
            <div className="bg-slate-800/80 rounded-xl p-5 border border-slate-700 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 text-blue-400">
                  <FileText className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Tailored CV</span>
                </div>
                <h4 className="font-semibold text-white text-base leading-snug">{cvDoc.title}</h4>
                <p className="text-xs text-slate-400">
                  Verified experience, skills, and qualifications formatted to benchmark standard.
                </p>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <a
                  href={cvDoc.downloadUrl}
                  download
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer shadow"
                >
                  <Download className="w-4 h-4" />
                  Download CV (PDF)
                </a>
                <button
                  onClick={() => setActivePreview(activePreview === 'CV' ? null : 'CV')}
                  className="px-3 py-2.5 rounded-lg text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 transition cursor-pointer"
                >
                  {activePreview === 'CV' ? 'Hide' : 'Preview'}
                </button>
              </div>
            </div>
          )}

          {/* Cover Letter Card */}
          {coverLetterDoc && (
            <div className="bg-slate-800/80 rounded-xl p-5 border border-slate-700 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 text-emerald-400">
                  <FileText className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Cover Letter</span>
                </div>
                <h4 className="font-semibold text-white text-base leading-snug">{coverLetterDoc.title}</h4>
                <p className="text-xs text-slate-400">
                  Job-specific application letter grounded in genuine evidence and role requirements.
                </p>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <a
                  href={coverLetterDoc.downloadUrl}
                  download
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer shadow"
                >
                  <Download className="w-4 h-4" />
                  Download Cover Letter (PDF)
                </a>
                <button
                  onClick={() => setActivePreview(activePreview === 'COVER_LETTER' ? null : 'COVER_LETTER')}
                  className="px-3 py-2.5 rounded-lg text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 transition cursor-pointer"
                >
                  {activePreview === 'COVER_LETTER' ? 'Hide' : 'Preview'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Text Preview Accordion */}
      {activePreview && (
        <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-semibold text-slate-300">
              {activePreview === 'CV' ? 'Curriculum Vitae Text Preview' : 'Cover Letter Text Preview'}
            </span>
            <button
              onClick={() => setActivePreview(null)}
              className="text-slate-400 hover:text-white"
            >
              Close
            </button>
          </div>
          <pre className="whitespace-pre-wrap font-sans text-slate-300 leading-relaxed max-h-80 overflow-y-auto">
            {activePreview === 'CV' ? cvDoc?.contentText : coverLetterDoc?.contentText}
          </pre>
        </div>
      )}
    </div>
  );
};
