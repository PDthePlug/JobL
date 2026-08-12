import React from 'react';
import { ApplicationReadinessAnalysis, ApplicationReadinessState } from '../types';
import { AlertTriangle, Check, HelpCircle, RefreshCw } from 'lucide-react';

interface ApplicationReadinessDisplayProps {
  analysis: ApplicationReadinessAnalysis | null;
  isLoading?: boolean;
  isRefreshing?: boolean;
  error?: string | null;
  candidateConfirmations?: Record<string, string>;
  onAnswerQuestion?: (questionId: string, requirementId: string, answer: string) => void;
  onProceedToApplication?: () => void;
}

const getStatus = (state: ApplicationReadinessState) => {
  switch (state) {
    case 'READY_TO_APPLY':
      return { label: 'Ready', className: 'bg-emerald-50 text-emerald-800 border-emerald-100' };
    case 'READY_AFTER_CONFIRMATION':
      return { label: 'Almost ready', className: 'bg-blue-50 text-blue-800 border-blue-100' };
    case 'NEEDS_STRENGTHENING':
      return { label: 'A few things to fix', className: 'bg-amber-50 text-amber-800 border-amber-100' };
    case 'INSUFFICIENT_INFORMATION':
    default:
      return { label: 'Need more info', className: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
};

export const ApplicationReadinessDisplay: React.FC<ApplicationReadinessDisplayProps> = ({
  analysis,
  isLoading = false,
  isRefreshing = false,
  error = null,
  candidateConfirmations = {},
  onAnswerQuestion,
}) => {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-center gap-2.5 text-sm text-slate-600">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Checking your CV against this job…
        </div>
      </div>
    );
  }

  if (error && !analysis) {
    return (
      <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
        We couldn’t refresh this check right now. You can still continue with your application.
      </div>
    );
  }

  if (!analysis) return null;

  const status = getStatus(analysis.readinessState);
  const fixItems = [...analysis.strengtheningItems, ...analysis.correctionItems];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="p-5 sm:p-6 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Before you apply</p>
            <h3 className="text-lg font-bold text-slate-950 mt-1">Are you ready for this job?</h3>
          </div>
          <div className="flex items-center gap-2">
            {isRefreshing && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Updating
              </span>
            )}
            <span className={`inline-flex self-start rounded-full border px-3 py-1.5 text-xs font-semibold ${status.className}`}>
              {status.label}
            </span>
          </div>
        </div>
        {analysis.readinessSummary && (
          <p className="text-sm text-slate-600 leading-relaxed mt-4">{analysis.readinessSummary}</p>
        )}
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {error && (
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-3.5 py-3 text-xs text-amber-900">
            Your answer is selected, but JobL couldn’t refresh the readiness summary right now. You can try another answer or continue.
          </div>
        )}

        {analysis.readyItems.length > 0 && (
          <section>
            <h4 className="text-sm font-semibold text-slate-950 mb-3">You’re good on</h4>
            <div className="flex flex-wrap gap-2">
              {analysis.readyItems.map((item) => (
                <span key={item.id} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100 px-3 py-1.5 text-xs font-medium">
                  <Check className="w-3.5 h-3.5" />
                  {item.title}
                </span>
              ))}
            </div>
          </section>
        )}

        {analysis.candidateQuestions.length > 0 && (
          <section>
            <h4 className="text-sm font-semibold text-slate-950 mb-3">Just confirm these</h4>
            <div className="space-y-3">
              {analysis.candidateQuestions.map((question) => {
                const currentAnswer =
                  candidateConfirmations[question.relatedRequirementId] ||
                  candidateConfirmations[question.questionId];

                return (
                  <div key={question.questionId} className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                    <div className="flex items-start gap-2.5">
                      <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <p className="text-sm font-medium text-slate-900">{question.question}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {['YES', 'NO', 'NOT_SURE'].map((option) => {
                        const selected = currentAnswer === option;
                        const label = option === 'YES' ? 'Yes' : option === 'NO' ? 'No' : 'Not sure';
                        return (
                          <button
                            type="button"
                            key={option}
                            aria-pressed={selected}
                            disabled={isRefreshing && !selected}
                            onClick={() =>
                              onAnswerQuestion?.(
                                question.questionId,
                                question.relatedRequirementId,
                                option
                              )
                            }
                            className={`rounded-lg px-3.5 py-2 text-xs font-semibold border transition-colors cursor-pointer disabled:cursor-wait disabled:opacity-60 ${
                              selected
                                ? 'bg-slate-950 border-slate-950 text-white'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            {selected && <Check className="w-3.5 h-3.5 inline mr-1" />}
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {fixItems.length > 0 && (
          <section>
            <h4 className="text-sm font-semibold text-slate-950 mb-3">Fix these first</h4>
            <div className="space-y-2.5">
              {fixItems.map((item) => (
                <div key={item.id} className="flex items-start gap-2.5 rounded-xl bg-amber-50/60 border border-amber-100 p-3.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-950">{item.title}</p>
                    {(item.actionRequired || item.explanation) && (
                      <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                        {item.actionRequired || item.explanation}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
