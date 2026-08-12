import React, { useState } from 'react';
import {
  ApplicationPackage,
  ApplicationReadinessAnalysis,
  ExtractedCVData,
  GeneratedDocumentResponse,
  JobMatchAnalysis,
  JobRequirements,
  Opportunity,
} from '../types';
import {
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  ExternalLink,
  FileCheck,
  FileText,
  Loader2,
} from 'lucide-react';

interface MyApplicationsProps {
  packages: ApplicationPackage[];
  candidateProfile?: ExtractedCVData | null;
  onUpdatePackage?: (pkg: ApplicationPackage) => void;
}

type ApplicationPackageWithDocuments = ApplicationPackage & {
  opportunitySnapshot?: Opportunity;
  jobRequirementsSnapshot?: JobRequirements;
  matchAnalysisSnapshot?: JobMatchAnalysis;
  readinessAnalysisSnapshot?: ApplicationReadinessAnalysis;
  candidateConfirmationsSnapshot?: Record<string, string>;
  generatedDocuments?: {
    cv?: GeneratedDocumentResponse;
    coverLetter?: GeneratedDocumentResponse;
  };
};

type DocumentKind = 'cv' | 'coverLetter';

export const MyApplications: React.FC<MyApplicationsProps> = ({
  packages,
  candidateProfile = null,
  onUpdatePackage,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(packages[0]?.packageId || null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyError, setCopyError] = useState('');
  const [downloadError, setDownloadError] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const writeClipboard = async (text: string) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    if (!copied) throw new Error('Copy is not available in this browser.');
  };

  const copyText = async (id: string, text: string) => {
    setCopyError('');
    try {
      await writeClipboard(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error: any) {
      setCopyError(error?.message || 'Could not copy that text.');
    }
  };

  const saveBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const safeFilename = (value: string) =>
    value
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80) || 'job_application';

  const generateDocument = async (
    pkg: ApplicationPackageWithDocuments,
    kind: DocumentKind
  ): Promise<GeneratedDocumentResponse> => {
    if (!candidateProfile) {
      throw new Error('Your saved CV is required to recreate this PDF.');
    }

    const endpoint =
      kind === 'cv'
        ? '/api/application-documents/generate-cv'
        : '/api/application-documents/generate-cover-letter';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidateProfile,
        opportunityId: pkg.opportunityId,
        opportunity: pkg.opportunitySnapshot,
        jobRequirements: pkg.jobRequirementsSnapshot,
        matchAnalysis: pkg.matchAnalysisSnapshot,
        readinessAnalysis: pkg.readinessAnalysisSnapshot,
        candidateConfirmations: pkg.candidateConfirmationsSnapshot || {},
      }),
    });
    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.success || !data.document) {
      throw new Error(data?.error || 'Could not recreate this PDF.');
    }

    return data.document as GeneratedDocumentResponse;
  };

  const fetchPdfBlob = async (downloadUrl: string) => {
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error('Saved PDF is no longer available.');
    }
    return response.blob();
  };

  const downloadDocument = async (pkg: ApplicationPackageWithDocuments, kind: DocumentKind) => {
    const actionId = `${pkg.packageId}-${kind}`;
    setDownloadingId(actionId);
    setDownloadError('');

    try {
      const currentDocument =
        kind === 'cv' ? pkg.generatedDocuments?.cv : pkg.generatedDocuments?.coverLetter;

      let document = currentDocument;
      let blob: Blob | null = null;

      if (currentDocument?.downloadUrl) {
        try {
          blob = await fetchPdfBlob(currentDocument.downloadUrl);
        } catch {
          // Generated PDFs are currently held by the server process. If that process
          // restarted, recreate the document from the saved candidate profile + job ID.
          document = undefined;
        }
      }

      if (!document || !blob) {
        document = await generateDocument(pkg, kind);
        blob = await fetchPdfBlob(document.downloadUrl);

        const updatedPackage: ApplicationPackageWithDocuments = {
          ...pkg,
          generatedDocuments: {
            ...pkg.generatedDocuments,
            ...(kind === 'cv' ? { cv: document } : { coverLetter: document }),
          },
        };
        onUpdatePackage?.(updatedPackage);
      }

      const suffix = kind === 'cv' ? 'CV' : 'Cover_Letter';
      saveBlob(blob, `${safeFilename(pkg.opportunityTitle)}_${suffix}.pdf`);
    } catch (error: any) {
      setDownloadError(error?.message || 'Could not download that PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  if (packages.length === 0) {
    return (
      <div className="max-w-lg mx-auto py-16 sm:py-20 px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-5">
          <FileCheck className="w-5 h-5 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-950">Nothing here yet</h2>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          When JobL gets an application ready for you, it will be saved here.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 sm:py-10 px-4 sm:px-6 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-[-0.035em]">My applications</h1>
        <p className="text-sm sm:text-base text-slate-500 mt-1.5">Everything JobL has prepared for you, in one place.</p>
      </div>

      {copyError && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-800">{copyError}</div>
      )}
      {downloadError && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-800">{downloadError}</div>
      )}

      <div className="space-y-3">
        {packages.map((basePackage) => {
          const pkg = basePackage as ApplicationPackageWithDocuments;
          const isExpanded = expandedId === pkg.packageId;
          const dateLabel = pkg.createdAt
            ? new Date(pkg.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
            : '';

          return (
            <article key={pkg.packageId} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <button
                type="button"
                aria-expanded={isExpanded}
                onClick={() => setExpandedId(isExpanded ? null : pkg.packageId)}
                className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/70 cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                      <Check className="w-3.5 h-3.5" /> Ready to apply
                    </span>
                    {dateLabel && <><span className="text-slate-300">·</span><span>{dateLabel}</span></>}
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-950 mt-1.5 truncate">{pkg.opportunityTitle}</h2>
                  <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5 truncate"><Building2 className="w-3.5 h-3.5 shrink-0" />{pkg.employerName}</p>
                </div>
                {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />}
              </button>

              {isExpanded && (
                <div className="border-t border-slate-100 p-4 sm:p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-blue-700" /><p className="text-sm font-bold text-slate-950">Tailored CV</p></div>
                      <p className="text-xs text-slate-500 mt-1.5">Prepared for this specific job.</p>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <button type="button" onClick={() => void copyText(`${pkg.packageId}-cv`, pkg.cvAnalysis.tailoredCVText)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 cursor-pointer">
                          {copiedId === `${pkg.packageId}-cv` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedId === `${pkg.packageId}-cv` ? 'Copied' : 'Copy text'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void downloadDocument(pkg, 'cv')}
                          disabled={downloadingId === `${pkg.packageId}-cv` || !candidateProfile}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer"
                          title={!candidateProfile ? 'Save your CV in JobL to recreate this PDF.' : undefined}
                        >
                          {downloadingId === `${pkg.packageId}-cv` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                          {downloadingId === `${pkg.packageId}-cv` ? 'Preparing…' : 'Download PDF'}
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-blue-700" /><p className="text-sm font-bold text-slate-950">Cover letter</p></div>
                      <p className="text-xs text-slate-500 mt-1.5">Written using your real experience.</p>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <button type="button" onClick={() => void copyText(`${pkg.packageId}-cover`, pkg.cvAnalysis.coverLetterMessage)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 cursor-pointer">
                          {copiedId === `${pkg.packageId}-cover` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedId === `${pkg.packageId}-cover` ? 'Copied' : 'Copy text'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void downloadDocument(pkg, 'coverLetter')}
                          disabled={downloadingId === `${pkg.packageId}-coverLetter` || !candidateProfile}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer"
                          title={!candidateProfile ? 'Save your CV in JobL to recreate this PDF.' : undefined}
                        >
                          {downloadingId === `${pkg.packageId}-coverLetter` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                          {downloadingId === `${pkg.packageId}-coverLetter` ? 'Preparing…' : 'Download PDF'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {pkg.originalApplicationUrl && (
                    <a href={pkg.originalApplicationUrl} target="_blank" rel="noopener noreferrer" className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
                      Continue application <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
};
