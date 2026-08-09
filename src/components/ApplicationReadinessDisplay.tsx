import React from 'react';
import {
  ApplicationReadinessAnalysis,
  ApplicationReadinessState,
  ReadinessItem,
  CandidateQuestion,
} from '../types';
import { CheckCircle2, HelpCircle, AlertTriangle, ShieldCheck, Sparkles, ArrowRight, Check } from 'lucide-react';

interface ApplicationReadinessDisplayProps {
  analysis: ApplicationReadinessAnalysis | null;
  isLoading?: boolean;
  error?: string | null;
  candidateConfirmations?: Record<string, string>;
  onAnswerQuestion?: (questionId: string, requirementId: string, answer: string) => void;
  onProceedToApplication?: () => void;
}

export const ApplicationReadinessDisplay: React.FC<ApplicationReadinessDisplayProps> = ({
  analysis,
  isLoading = false,
  error = null,
  candidateConfirmations = {},
  onAnswerQuestion,
  onProceedToApplication,
}) => {
  if (isLoading) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center animate-pulse space-y-3">
        <div className="w-8 h-8 rounded-full bg-blue-200 mx-auto"></div>
        <div className="h-4 bg-slate-200 rounded w-1/2 mx-auto"></div>
        <div className="h-3 bg-slate-200 rounded w-3/4 mx-auto"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-900 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Readiness Analysis Notice</p>
          <p className="mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const getReadinessBadge = (state: ApplicationReadinessState) => {
    switch (state) {
      case 'READY_TO_APPLY':
        return {
          label: 'Ready to Apply',
          bg: 'bg-emerald-100 text-emerald-950 border-emerald-300',
          dot: 'bg-emerald-600',
        };
      case 'READY_AFTER_CONFIRMATION':
        return {
          label: 'Ready After Confirmation',
          bg: 'bg-blue-100 text-blue-950 border-blue-300',
          dot: 'bg-blue-600',
        };
      case 'NEEDS_STRENGTHENING':
        return {
          label: 'Needs Strengthening',
          bg: 'bg-amber-100 text-amber-950 border-amber-300',
          dot: 'bg-amber-600',
        };
      case 'INSUFFICIENT_INFORMATION':
      default:
        return {
          label: 'Needs Information',
          bg: 'bg-slate-100 text-slate-900 border-slate-300',
          dot: 'bg-slate-600',
        };
    }
  };

  const badge = getReadinessBadge(analysis.readinessState);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden my-4 text-slate-800">
      {/* Header Bar */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              YOUR APPLICATION READINESS
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white mt-0.5">
            {analysis.jobTitle}
          </h3>
        </div>

        <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black border ${badge.bg}`}>
          <span className={`w-2 h-2 rounded-full ${badge.dot}`}></span>
          <span>{badge.label}</span>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-6 text-xs sm:text-sm">
        {/* Readiness Summary */}
        <p className="text-slate-800 bg-blue-50/80 p-3.5 rounded-xl border border-blue-200 leading-relaxed font-semibold">
          {analysis.readinessSummary}
        </p>

        {/* 1. READY ITEMS */}
        {analysis.readyItems.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>READY ({analysis.readyItems.length})</span>
            </h4>
            <div className="space-y-2">
              {analysis.readyItems.map((item) => (
                <div key={item.id} className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3 flex items-start gap-3">
                  <span className="text-emerald-700 font-extrabold text-sm shrink-0 mt-0.5">✓</span>
                  <div className="flex-1">
                    <p className="font-bold text-emerald-950">{item.title}</p>
                    <p className="text-xs text-emerald-800 mt-0.5">{item.explanation}</p>
                    {item.relatedEvidence && (
                      <p className="text-[11px] text-emerald-900 mt-1 italic bg-white/80 p-2 rounded border border-emerald-200 font-mono">
                        "{item.relatedEvidence}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. CONFIRMATION ITEMS & CANDIDATE QUESTIONS */}
        {analysis.candidateQuestions.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              <span>NEEDS CONFIRMATION ({analysis.candidateQuestions.length})</span>
            </h4>
            <div className="space-y-3">
              {analysis.candidateQuestions.map((q) => {
                const currentAnswer = candidateConfirmations[q.relatedRequirementId] || candidateConfirmations[q.questionId];

                return (
                  <div key={q.questionId} className="bg-blue-50/70 border border-blue-200 rounded-xl p-4">
                    <p className="font-bold text-slate-900 text-sm mb-1">{q.question}</p>
                    <p className="text-xs text-slate-600 mb-3">
                      Your CV does not explicitly state this details. Please confirm your status:
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      {['YES', 'NO', 'NOT_SURE'].map((opt) => {
                        const isSelected = currentAnswer === opt;
                        return (
                          <button
                            key={opt}
                            onClick={() => onAnswerQuestion?.(q.questionId, q.relatedRequirementId, opt)}
                            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                              isSelected
                                ? 'bg-blue-700 text-white shadow-sm border border-blue-800'
                                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                            <span>{opt === 'YES' ? 'Yes, I have this' : opt === 'NO' ? 'No, I do not' : 'Not Sure'}</span>
                          </button>
                        );
                      })}
                    </div>

                    {currentAnswer && (
                      <div className="mt-3 pt-2 border-t border-blue-200/80 flex items-center justify-between text-[11px] text-blue-950 font-medium">
                        <span>Status: Answer recorded</span>
                        <span className="bg-blue-200/80 text-blue-950 px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[10px]">
                          Candidate Confirmed
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. STRENGTHEN ITEMS */}
        {analysis.strengtheningItems.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>STRENGTHEN BEFORE APPLYING ({analysis.strengtheningItems.length})</span>
            </h4>
            <div className="space-y-2">
              {analysis.strengtheningItems.map((item) => (
                <div key={item.id} className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 flex items-start gap-3">
                  <span className="text-amber-700 font-extrabold text-sm shrink-0 mt-0.5">△</span>
                  <div className="flex-1">
                    <p className="font-bold text-amber-950">{item.title}</p>
                    <p className="text-xs text-amber-900 mt-0.5">{item.explanation}</p>
                    {item.actionRequired && (
                      <p className="text-xs text-amber-950 font-medium mt-1 bg-amber-100/60 p-2 rounded border border-amber-200/80">
                        Action: {item.actionRequired}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. CORRECTION ITEMS */}
        {analysis.correctionItems.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>ACTION REQUIRED ({analysis.correctionItems.length})</span>
            </h4>
            <div className="space-y-2">
              {analysis.correctionItems.map((item) => (
                <div key={item.id} className="bg-rose-50/70 border border-rose-200 rounded-xl p-3 flex items-start gap-3">
                  <span className="text-rose-700 font-extrabold text-sm shrink-0 mt-0.5">!</span>
                  <div className="flex-1">
                    <p className="font-bold text-rose-950">{item.title}</p>
                    <p className="text-xs text-rose-900 mt-0.5">{item.explanation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Proceed Action Button */}
        {onProceedToApplication && (
          <div className="pt-2 border-t border-slate-200">
            <button
              onClick={onProceedToApplication}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>Proceed with Application Preparation</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
