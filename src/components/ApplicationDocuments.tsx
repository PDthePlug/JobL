import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Download, FileText, Loader2 } from 'lucide-react';
import {
  ApplicationReadinessAnalysis,
  ExtractedCVData,
  GeneratedDocumentResponse,
  JobMatchAnalysis,
  JobRequirements,
  Opportunity,
} from '../types';

export interface GeneratedApplicationDocuments {
  cv?: GeneratedDocumentResponse;
  coverLetter?: GeneratedDocumentResponse;
}

interface ApplicationDocumentsProps {
  candidateProfile: ExtractedCVData;
  opportunity: Opportunity;
  jobRequirements?: JobRequirements;
  matchAnalysis?: JobMatchAnalysis;
  readinessAnalysis?: ApplicationReadinessAnalysis;
  candidateConfirmations?: Record<string, string>;
  autoGenerate?: boolean;
  onDocumentsReady?: (documents: GeneratedApplicationDocuments) => void;
}

export const ApplicationDocuments: React.FC<ApplicationDocumentsProps> = ({
  candidateProfile,
  opportunity,
  jobRequirements,
  matchAnalysis,
  readinessAnalysis,
  candidateConfirmations = {},
  autoGenerate = false,
  onDocumentsReady,
}) => {
  const [cvDoc, setCvDoc] = useState<GeneratedDocumentResponse | null>(null);
  const [coverLetterDoc, setCoverLetterDoc] = useState<GeneratedDocumentResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const autoStarted = useRef(false);

  const requestDocument = useCallback(
    async (kind: 'cv' | 'cover-letter') => {
      const response = await fetch(`/api/application-documents/generate-${kind}`, {
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

      const data = await response.json();
      if (!data.success) {
        throw new Error(
          data.error ||
            (kind === 'cv'
              ? 'Could not create your CV PDF.'
              : 'Could not create your cover letter PDF.')
        );
      }
      return data.document as GeneratedDocumentResponse;
    },
    [candidateProfile, opportunity, jobRequirements, matchAnalysis, readinessAnalysis, candidateConfirmations]
  );

  const generatePdfFiles = useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setGenerationError(null);

    const results = await Promise.allSettled([
      requestDocument('cv'),
      requestDocument('cover-letter'),
    ]);

    let nextCv = cvDoc;
    let nextCover = coverLetterDoc;
    const errors: string[] = [];

    if (results[0].status === 'fulfilled') {
      nextCv = results[0].value;
      setCvDoc(results[0].value);
    } else {
      errors.push(results[0].reason?.message || 'Could not create your CV PDF.');
    }

    if (results[1].status === 'fulfilled') {
      nextCover = results[1].value;
      setCoverLetterDoc(results[1].value);
    } else {
      errors.push(results[1].reason?.message || 'Could not create your cover letter PDF.');
    }

    if (nextCv || nextCover) {
      onDocumentsReady?.({
        cv: nextCv || undefined,
        coverLetter: nextCover || undefined,
      });
    }

    if (errors.length) setGenerationError(errors.join(' '));
    setIsGenerating(false);
  }, [isGenerating, requestDocument, cvDoc, coverLetterDoc, onDocumentsReady]);

  useEffect(() => {
    if (autoGenerate && !autoStarted.current && !cvDoc && !coverLetterDoc) {
      autoStarted.current = true;
      void generatePdfFiles();
    }
  }, [autoGenerate, cvDoc, coverLetterDoc, generatePdfFiles]);

  const hasDocuments = Boolean(cvDoc || coverLetterDoc);

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-950">Download your documents</p>
          <p className="text-xs text-slate-500 mt-1">
            PDF copies of your tailored CV and cover letter.
          </p>
        </div>

        {!hasDocuments && (
          <button
            type="button"
            onClick={() => void generatePdfFiles()}
            disabled={isGenerating}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 hover:border-slate-400 disabled:opacity-50 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Preparing downloads…
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Prepare PDF downloads
              </>
            )}
          </button>
        )}
      </div>

      {isGenerating && !hasDocuments && autoGenerate && (
        <div className="mt-4 rounded-xl bg-white border border-slate-200 p-3.5 flex items-center gap-2.5 text-sm text-slate-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          Preparing your PDF downloads…
        </div>
      )}

      {generationError && (
        <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3.5 flex items-start gap-2.5 text-sm text-red-800">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p>{generationError}</p>
            <button
              type="button"
              onClick={() => void generatePdfFiles()}
              disabled={isGenerating}
              className="mt-2 text-xs font-semibold text-red-900 cursor-pointer disabled:opacity-50"
            >
              Try downloads again
            </button>
          </div>
        </div>
      )}

      {hasDocuments && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {cvDoc && (
            <a
              href={cvDoc.downloadUrl}
              download
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-3 text-xs font-semibold text-slate-800 hover:border-slate-400"
            >
              <Download className="w-4 h-4" />
              Download CV (PDF)
            </a>
          )}
          {coverLetterDoc && (
            <a
              href={coverLetterDoc.downloadUrl}
              download
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-3 text-xs font-semibold text-slate-800 hover:border-slate-400"
            >
              <Download className="w-4 h-4" />
              Download cover letter (PDF)
            </a>
          )}
        </div>
      )}
    </section>
  );
};
