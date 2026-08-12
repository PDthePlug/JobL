import React, { useState } from 'react';
import { Opportunity, CandidateLead, PaymentTransaction, CVAnalysisResult, ApplicationPackage, ExtractedCVData, JobRequirements, JobMatchAnalysis, ApplicationReadinessAnalysis } from '../types';
import { X, Sparkles, CheckCircle2, ShieldCheck, CreditCard, Lock, Copy, Check, ExternalLink, ArrowRight, FileText, AlertCircle, RefreshCw, Upload } from 'lucide-react';
import { ApplicationDocuments } from './ApplicationDocuments';

interface ApplicationReadinessFlowProps {
  opportunity: Opportunity;
  onClose: () => void;
  onCompletePackage: (pkg: ApplicationPackage) => void;
  jobRequirements?: JobRequirements;
  matchAnalysis?: JobMatchAnalysis;
  readinessAnalysis?: ApplicationReadinessAnalysis;
  candidateConfirmations?: Record<string, string>;
}

export const ApplicationReadinessFlow: React.FC<ApplicationReadinessFlowProps> = ({
  opportunity,
  onClose,
  onCompletePackage,
  jobRequirements,
  matchAnalysis,
  readinessAnalysis,
  candidateConfirmations,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 1: Lead Capture
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [locationCity, setLocationCity] = useState(opportunity.location.city || 'Johannesburg');
  const [popiaAgreed, setPopiaAgreed] = useState(false);
  const [leadError, setLeadError] = useState('');

  // Step 2: Payment
  const [paymentMethod, setPaymentMethod] = useState<'PEACH_PAYMENTS' | 'OZOW_EFT' | 'JOBL_VOUCHER'>('JOBL_VOUCHER');
  const [voucherCode, setVoucherCode] = useState('JOBL-R5-FREE-2026');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentTransaction, setPaymentTransaction] = useState<PaymentTransaction | null>(null);
  const [paymentError, setPaymentError] = useState('');

  // Step 3: CV Text & Upload
  const [candidateProfile, setCandidateProfile] = useState<ExtractedCVData | null>(() => {
    try {
      const stored = localStorage.getItem('jobl_candidate_cv_profile');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.extractedData || null;
      }
    } catch {}
    return null;
  });

  const [cvText, setCvText] = useState(() => {
    try {
      const stored = localStorage.getItem('jobl_candidate_cv_profile');
      if (stored) {
        const parsed = JSON.parse(stored);
        const ext = parsed.extractedData;
        if (ext) {
          let text = `${ext.firstName || ''} ${ext.surname || ''}\n`.trim();
          if (ext.phone) text += `Phone: ${ext.phone}\n`;
          if (ext.email) text += `Email: ${ext.email}\n`;
          if (ext.location) text += `Location: ${ext.location}\n`;
          if (ext.professionalProfile) text += `\nProfile:\n${ext.professionalProfile}\n`;
          if (ext.employmentHistory?.length) {
            text += `\nWork Experience:\n` + ext.employmentHistory.map((h: any) => `- ${h.jobTitle} at ${h.employer} (${h.employmentDates || ''})`).join('\n') + '\n';
          }
          if (ext.education?.length) {
            text += `\nEducation:\n` + ext.education.map((ed: any) => `- ${ed.qualification} at ${ed.institution} (${ed.year || ''})`).join('\n') + '\n';
          }
          if (ext.skills?.length) text += `\nSkills: ${ext.skills.join(', ')}`;
          return text;
        }
      }
    } catch {}
    return '';
  });
  const [isExtractingCv, setIsExtractingCv] = useState(false);
  const [step3UploadError, setStep3UploadError] = useState('');

  const handleStep3FileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStep3UploadError('');
    setIsExtractingCv(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const resultStr = reader.result as string;
          const base64Data = resultStr.split(',')[1] || resultStr;

          const res = await fetch('/api/cv/upload-and-extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: file.name,
              fileType: file.type || 'application/pdf',
              fileDataBase64: base64Data,
            }),
          });

          const data = await res.json();
          if (!data.success) {
            throw new Error(data.error || 'CV extraction failed');
          }

          const ext = data.extractedData;
          let text = `${ext.firstName || ''} ${ext.surname || ''}\n`.trim();
          if (ext.phone) text += `Phone: ${ext.phone}\n`;
          if (ext.email) text += `Email: ${ext.email}\n`;
          if (ext.location) text += `Location: ${ext.location}\n`;
          if (ext.professionalProfile) text += `\nProfile:\n${ext.professionalProfile}\n`;
          if (ext.employmentHistory?.length) {
            text += `\nWork Experience:\n` + ext.employmentHistory.map((h: any) => `- ${h.jobTitle || 'Role'} at ${h.employer || 'Company'} (${h.employmentDates || ''})`).join('\n') + '\n';
          }
          if (ext.education?.length) {
            text += `\nEducation:\n` + ext.education.map((ed: any) => `- ${ed.qualification || 'Qualification'} at ${ed.institution || 'Institution'} (${ed.year || ''})`).join('\n') + '\n';
          }
          if (ext.skills?.length) text += `\nSkills: ${ext.skills.join(', ')}`;

          setCvText(text);
          setIsExtractingCv(false);
        } catch (err: any) {
          setIsExtractingCv(false);
          setStep3UploadError(err.message || 'Error processing CV file.');
        }
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsExtractingCv(false);
      setStep3UploadError(err.message || 'Error reading file.');
    }
  };

  // Step 4: AI Processing
  const [isGenerating, setIsGenerating] = useState(false);
  const [cvAnalysis, setCvAnalysis] = useState<CVAnalysisResult | null>(null);
  const [generationError, setGenerationError] = useState('');

  // Step 5: Completed Package
  const [createdPackage, setCreatedPackage] = useState<ApplicationPackage | null>(null);
  const [copiedCv, setCopiedCv] = useState(false);
  const [copiedCoverLetter, setCopiedCoverLetter] = useState(false);

  // Step 1 Handler: Submit Lead
  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLeadError('');

    if (!firstName.trim() || !surname.trim()) {
      setLeadError('Please enter your full first name and surname.');
      return;
    }
    if (!phone.trim() || phone.length < 10) {
      setLeadError('Please enter a valid South African phone number (e.g. 082 123 4567).');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setLeadError('Please enter a valid email address.');
      return;
    }
    if (!popiaAgreed) {
      setLeadError('You must agree to the POPIA data protection terms to proceed.');
      return;
    }

    setStep(2);
  };

  // Step 2 Handler: Process R5 Payment
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError('');
    setIsProcessingPayment(true);

    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityId: opportunity.id,
          candidateEmail: email,
          provider: paymentMethod,
          voucherCode: paymentMethod === 'JOBL_VOUCHER' ? voucherCode : undefined,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Payment transaction failed.');
      }

      setPaymentTransaction(data.transaction);
      setIsProcessingPayment(false);
      setStep(3);
    } catch (err: any) {
      setIsProcessingPayment(false);
      setPaymentError(err.message || 'Payment failed. Please verify voucher or details.');
    }
  };

  // Step 3 & 4 Handler: Generate Application Package
  const handleGeneratePackage = async () => {
    if (!paymentTransaction) return;

    setStep(4);
    setIsGenerating(true);
    setGenerationError('');

    const candidateLead: CandidateLead = {
      firstName,
      surname,
      phone,
      email,
      locationCity,
      locationProvince: opportunity.location.province,
      popiaConsent: {
        agreed: true,
        timestamp: new Date().toISOString(),
        purpose: 'JobL Application Readiness Service & Employer Referral',
        consentVersion: '1.0-POPIA-ZA',
      },
    };

    try {
      const res = await fetch('/api/cv/analyze-and-prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate: candidateLead,
          cvText,
          opportunity,
          transactionId: paymentTransaction.transactionId,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate tailored application package.');
      }

      const analysis: CVAnalysisResult = data.cvAnalysis;
      setCvAnalysis(analysis);

      const pkg: ApplicationPackage = {
        packageId: `PKG-${Date.now()}`,
        opportunityId: opportunity.id,
        opportunityTitle: opportunity.title,
        employerName: opportunity.employer,
        candidateLead,
        paymentTransaction,
        cvAnalysis: analysis,
        createdAt: new Date().toISOString(),
        originalApplicationUrl: opportunity.sourceProvenance.applicationDestination,
        status: 'READY',
      };

      setCreatedPackage(pkg);
      onCompletePackage(pkg);
      setIsGenerating(false);
      setStep(5);
    } catch (err: any) {
      setIsGenerating(false);
      setGenerationError(err.message || 'An error occurred while building your package.');
    }
  };

  // Step 5 Copy Helpers
  const copyToClipboard = (text: string, type: 'cv' | 'cover') => {
    navigator.clipboard.writeText(text);
    if (type === 'cv') {
      setCopiedCv(true);
      setTimeout(() => setCopiedCv(false), 2500);
    } else {
      setCopiedCoverLetter(true);
      setTimeout(() => setCopiedCoverLetter(false), 2500);
    }
  };

  const handleExternalHandoff = () => {
    // Log Analytics event
    fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName: 'external_application_clicked',
        metadata: {
          opportunityId: opportunity.id,
          employer: opportunity.employer,
          candidateEmail: email,
        },
      }),
    });

    window.open(opportunity.sourceProvenance.applicationDestination, '_blank', 'noopener,noreferrer');
  };

  const steps = [
    { n: 1, label: 'Details' },
    { n: 2, label: 'Payment' },
    { n: 3, label: 'CV' },
    { n: 4, label: 'Package' },
  ];
  const activeStepIndex = step === 5 ? 3 : step - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative bg-white w-full sm:max-w-xl sm:rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden my-0 sm:my-6 flex flex-col max-h-[94vh] sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="shrink-0 px-5 sm:px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 mb-1">Application readiness</p>
              <h2 className="text-base sm:text-lg font-semibold text-slate-900 tracking-tight leading-snug truncate">
                {opportunity.title}
              </h2>
              <p className="text-sm text-slate-500 mt-0.5 truncate">{opportunity.employer}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper */}
          <div className="mt-5 flex items-center gap-2">
            {steps.map((s, i) => {
              const done = i < activeStepIndex;
              const current = i === activeStepIndex;
              return (
                <div key={s.n} className="flex items-center gap-2 flex-1 min-w-0">
                  <div
                    className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0
                      ${current ? 'bg-slate-900 text-white' : done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}
                    `}
                  >
                    {done ? '✓' : s.n}
                  </div>
                  <span className={`text-xs font-medium truncate hidden sm:inline ${current ? 'text-slate-900' : 'text-slate-400'}`}>
                    {s.label}
                  </span>
                  {i < steps.length - 1 && (
                    <div className={`flex-1 h-px ${done ? 'bg-emerald-300' : 'bg-slate-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* STEP 1: CANDIDATE LEAD CAPTURE */}
        {step === 1 && (
          <form onSubmit={handleLeadSubmit} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 text-slate-800">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm text-slate-700">
              <p className="font-medium flex items-center gap-1.5 text-slate-900">
                <ShieldCheck className="w-4 h-4 text-slate-500" />
                Candidate Contact Details
              </p>
              <p className="mt-1 text-blue-800">
                Provide your contact details so JobL can personalize your application package and cover letter for {opportunity.employer}.
              </p>
            </div>

            {leadError && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{leadError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">First Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Thabo"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Surname *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mokoena"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Mobile Phone (SA) *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 082 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. thabo@example.co.za"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Your Current Location</label>
              <input
                type="text"
                value={locationCity}
                onChange={(e) => setLocationCity(e.target.value)}
                placeholder="e.g. Soweto, Johannesburg"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
              />
            </div>

            {/* POPIA Consent Checkbox */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={popiaAgreed}
                  onChange={(e) => setPopiaAgreed(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs text-slate-700 leading-snug">
                  <strong>POPIA Consent:</strong> I agree to JobL processing my contact details and profile solely for the purpose of generating my tailored application package and referring me to the employer's official portal.
                </span>
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Proceed to R5 Payment Gate</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: R5 PAYMENT GATEWAY */}
        {step === 2 && (
          <form onSubmit={handlePaymentSubmit} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 text-slate-800">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Readiness fee</p>
                <p className="text-2xl font-semibold text-slate-900 mt-0.5">R5 <span className="text-sm font-normal text-slate-400">ZAR</span></p>
              </div>
              <span className="text-xs font-medium text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                Per vacancy
              </span>
            </div>

            {paymentError && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}

            <div className="space-y-3">
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Select Payment Rail</label>

              {/* Voucher Redemption Option */}
              <label className={`block border p-3.5 rounded-xl cursor-pointer transition-all ${
                paymentMethod === 'JOBL_VOUCHER' ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20' : 'border-slate-200 hover:bg-slate-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'JOBL_VOUCHER'}
                      onChange={() => setPaymentMethod('JOBL_VOUCHER')}
                      className="text-amber-500 focus:ring-amber-500"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900">JobL Community Voucher Code</p>
                      <p className="text-[11px] text-slate-500">Free candidate access code for testing/community access</p>
                    </div>
                  </div>
                  <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded">
                    Free / Access
                  </span>
                </div>

                {paymentMethod === 'JOBL_VOUCHER' && (
                  <div className="mt-3 pt-3 border-t border-amber-200/80">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Enter Code:</label>
                    <input
                      type="text"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value)}
                      placeholder="e.g. JOBL-R5-FREE-2026"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Pre-filled code <strong>JOBL-R5-FREE-2026</strong> is active for community evaluation.
                    </p>
                  </div>
                )}
              </label>

              {/* Peach Payments Option */}
              <label className={`block border p-3.5 rounded-xl cursor-pointer transition-all ${
                paymentMethod === 'PEACH_PAYMENTS' ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20' : 'border-slate-200 hover:bg-slate-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'PEACH_PAYMENTS'}
                      onChange={() => setPaymentMethod('PEACH_PAYMENTS')}
                      className="text-amber-500 focus:ring-amber-500"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900">Peach Payments (SA Card / Capitec Pay / EFT)</p>
                      <p className="text-[11px] text-slate-500">Secure R5.00 South African card or bank checkout</p>
                    </div>
                  </div>
                  <CreditCard className="w-4 h-4 text-slate-400" />
                </div>
              </label>

              {/* Ozow EFT Option */}
              <label className={`block border p-3.5 rounded-xl cursor-pointer transition-all ${
                paymentMethod === 'OZOW_EFT' ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20' : 'border-slate-200 hover:bg-slate-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'OZOW_EFT'}
                      onChange={() => setPaymentMethod('OZOW_EFT')}
                      className="text-amber-500 focus:ring-amber-500"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900">Ozow Instant EFT</p>
                      <p className="text-[11px] text-slate-500">Instant bank transfer for Capitec, FNB, Absa, Standard Bank, Nedbank</p>
                    </div>
                  </div>
                  <Lock className="w-4 h-4 text-slate-400" />
                </div>
              </label>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isProcessingPayment}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-xl text-sm transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                {isProcessingPayment ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Payment...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm R5 Payment / Voucher</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: CANDIDATE EXPERIENCE & CV BUILDER */}
        {step === 3 && (
          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 text-slate-800">
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-3.5 text-xs flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold">Payment Verified Server-Side</p>
                  <p className="text-[11px] text-emerald-800">Ref: {paymentTransaction?.reference}</p>
                </div>
              </div>
              <span className="bg-emerald-200 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded">
                Verified
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-800">
                    Provide Your Existing CV Document or Experience
                  </label>
                  <p className="text-xs text-slate-500">
                    Upload your CV file (PDF, DOC, DOCX, TXT) or paste your experience below.
                  </p>
                </div>

                <label
                  htmlFor="flow-mobile-cv-input"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>UPLOAD MY CV</span>
                </label>
                <input
                  id="flow-mobile-cv-input"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.rtf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  onChange={handleStep3FileUpload}
                  className="hidden"
                />
              </div>

              {isExtractingCv && (
                <div className="bg-blue-50 border border-blue-200 text-blue-900 p-3 rounded-xl text-xs flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                  <span>Server extracting structured CV details from your document...</span>
                </div>
              )}

              {step3UploadError && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{step3UploadError}</span>
                </div>
              )}

              <textarea
                rows={6}
                value={cvText}
                onChange={(e) => setCvText(e.target.value)}
                placeholder="Example: Grade 12 passed in 2024 with English, Mathematics Literacy, Life Sciences. Worked as a seasonal stock assistant at a local store. Skilled in customer service, punctuality, and basic inventory checks..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleGeneratePackage}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Build Job-Specific Application Package</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: AI GENERATING PROGRESS */}
        {step === 4 && (
          <div className="p-8 text-center space-y-4 overflow-y-auto flex-1 flex flex-col items-center justify-center">
            {isGenerating ? (
              <>
                <div className="w-10 h-10 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
                <h3 className="text-base font-semibold text-slate-900">Building your package…</h3>
                <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
                  Matching your profile to <strong className="text-slate-700">{opportunity.title}</strong> at {opportunity.employer}. Tailored CV, cover letter, and prep tips.
                </p>
              </>
            ) : generationError ? (
              <div className="space-y-3">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
                <h3 className="text-base font-semibold text-red-800">Something went wrong</h3>
                <p className="text-sm text-slate-600">{generationError}</p>
                <button
                  type="button"
                  onClick={handleGeneratePackage}
                  className="bg-slate-900 text-white text-sm font-medium px-5 py-2.5 rounded-xl cursor-pointer"
                >
                  Try again
                </button>
              </div>
            ) : null}
          </div>
        )}

        {/* STEP 5: COMPLETED PACKAGE & HANDOFF */}
        {step === 5 && cvAnalysis && (
          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 text-slate-800">
            {/* Compatibility Summary Banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide">Package ready</p>
                <h3 className="text-base font-semibold text-slate-900 mt-0.5 truncate">{opportunity.title}</h3>
                <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{cvAnalysis.candidateSummary}</p>
              </div>
              <div className="text-center bg-white border border-slate-200 px-3 py-2 rounded-xl shrink-0">
                <span className="text-xl font-semibold text-slate-900">{cvAnalysis.overallCompatibilityScore}%</span>
                <span className="block text-[10px] text-slate-400">Match</span>
              </div>
            </div>

            {/* Keyword & Requirements Gap Analysis */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-1">
                <p className="font-bold text-emerald-950 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Matched Requirements
                </p>
                <ul className="list-disc list-inside text-emerald-900 space-y-0.5">
                  {cvAnalysis.jobRequirementAnalysis.matchedRequirements.map((req, i) => (
                    <li key={i}>{req}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
                <p className="font-bold text-amber-950 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  Keyword / Skills Focus
                </p>
                <ul className="list-disc list-inside text-amber-900 space-y-0.5">
                  {cvAnalysis.jobRequirementAnalysis.missingKeywords.map((kw, i) => (
                    <li key={i}>{kw}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Application Documents Component */}
            {candidateProfile && (
              <ApplicationDocuments
                candidateProfile={candidateProfile}
                opportunity={opportunity}
                jobRequirements={jobRequirements}
                matchAnalysis={matchAnalysis}
                readinessAnalysis={readinessAnalysis}
                candidateConfirmations={candidateConfirmations}
              />
            )}

            {/* Interview Prep Tips */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Role-Specific Interview Prep</p>
              <ul className="space-y-1 text-xs text-slate-300">
                {cvAnalysis.interviewPrepTips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Final External Handoff & Application Instructions */}
            <div className="pt-2 bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-950">
                  {opportunity.sourceProvenance.destinationStatus === 'VERIFIED'
                    ? 'Next Step: Apply at Employer Portal'
                    : opportunity.sourceProvenance.applicationMethodType === 'EMAIL'
                    ? 'Next Step: Submit Application via Official Email'
                    : opportunity.sourceProvenance.applicationMethodType === 'POSTAL'
                    ? 'Next Step: Postal Application Submission'
                    : opportunity.sourceProvenance.applicationMethodType === 'HAND_DELIVERY'
                    ? 'Next Step: Hand Delivery Application Submission'
                    : 'Next Step: Official Application Instructions'}
                </span>
                <span className="text-amber-800 font-mono text-[10px] font-bold">
                  {opportunity.sourceProvenance.destinationStatus === 'VERIFIED' ? 'Verified Destination' : 'Official Vacancy Source'}
                </span>
              </div>

              {/* Source-grounded Application Instructions */}
              {opportunity.sourceProvenance.applicationInstructions && (
                <div className="bg-amber-100/80 border border-amber-300 rounded-lg p-3 text-xs text-slate-900 space-y-1">
                  <p className="font-bold text-amber-950">Official Application Instructions ({opportunity.employer}):</p>
                  <p className="leading-relaxed whitespace-pre-wrap">{opportunity.sourceProvenance.applicationInstructions}</p>
                </div>
              )}

              {/* Email Address highlight if email method */}
              {opportunity.sourceProvenance.applicationEmail && (
                <div className="bg-white border border-amber-300 rounded-lg p-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Official Submission Email:</span>
                    <span className="font-mono font-bold text-slate-900">{opportunity.sourceProvenance.applicationEmail}</span>
                  </div>
                  <a
                    href={`mailto:${opportunity.sourceProvenance.applicationEmail}?subject=Application for ${encodeURIComponent(opportunity.title)}`}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors"
                  >
                    Open Email App
                  </a>
                </div>
              )}

              <p className="text-xs text-amber-900">
                {opportunity.sourceProvenance.destinationStatus === 'VERIFIED'
                  ? `Your application package is complete! Click below to open ${opportunity.employer}'s official portal and paste your tailored information to submit.`
                  : `Your application package is complete! Click below to view ${opportunity.employer}'s official vacancy circular and guidelines to finalize your submission.`}
              </p>

              <button
                onClick={handleExternalHandoff}
                className="w-full bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold py-3 px-6 rounded-xl text-sm transition-all shadow-lg flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>
                  {opportunity.sourceProvenance.destinationStatus === 'VERIFIED'
                    ? `APPLY NOW AT ${opportunity.employer.toUpperCase()}`
                    : `VIEW OFFICIAL VACANCY DOCUMENT / INSTRUCTIONS`}
                </span>
                <ExternalLink className="w-4 h-4 text-amber-400" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
