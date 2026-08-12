import React, { useState } from 'react';
import {
  ApplicationPackage,
  ApplicationReadinessAnalysis,
  CandidateCVProfile,
  CandidateLead,
  CVAnalysisResult,
  ExtractedCVData,
  GeneratedDocumentResponse,
  JobMatchAnalysis,
  JobRequirements,
  Opportunity,
  PaymentTransaction,
} from '../types';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  FileText,
  Lock,
  RefreshCw,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import { ApplicationDocuments, GeneratedApplicationDocuments } from './ApplicationDocuments';

interface ApplicationReadinessFlowProps {
  opportunity: Opportunity;
  onClose: () => void;
  onCompletePackage: (pkg: ApplicationPackage) => void;
  jobRequirements?: JobRequirements;
  matchAnalysis?: JobMatchAnalysis;
  readinessAnalysis?: ApplicationReadinessAnalysis;
  candidateConfirmations?: Record<string, string>;
}

type FlowStage = 'cv' | 'payment' | 'ready';
type PaymentMethod = 'PEACH_PAYMENTS' | 'OZOW_EFT' | 'JOBL_VOUCHER';

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

const profileToText = (profile: ExtractedCVData | null) => {
  if (!profile) return '';

  let text = `${profile.firstName || ''} ${profile.surname || ''}\n`.trim();
  if (profile.phone) text += `\nPhone: ${profile.phone}`;
  if (profile.email) text += `\nEmail: ${profile.email}`;
  if (profile.location) text += `\nLocation: ${profile.location}`;
  if (profile.professionalProfile) text += `\n\nProfile:\n${profile.professionalProfile}`;

  if (profile.employmentHistory?.length) {
    text +=
      '\n\nWork experience:\n' +
      profile.employmentHistory
        .map(
          (item) =>
            `- ${item.jobTitle || 'Role'} at ${item.employer || 'Employer'}${
              item.employmentDates ? ` (${item.employmentDates})` : ''
            }`
        )
        .join('\n');
  }

  if (profile.education?.length) {
    text +=
      '\n\nEducation:\n' +
      profile.education
        .map(
          (item) =>
            `- ${item.qualification || 'Qualification'} at ${item.institution || 'Institution'}${
              item.year ? ` (${item.year})` : ''
            }`
        )
        .join('\n');
  }

  if (profile.skills?.length) text += `\n\nSkills: ${profile.skills.join(', ')}`;
  return text.trim();
};

const loadSavedProfile = (): CandidateCVProfile | null => {
  try {
    const stored = localStorage.getItem('jobl_candidate_cv_profile');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const ApplicationReadinessFlow: React.FC<ApplicationReadinessFlowProps> = ({
  opportunity,
  onClose,
  onCompletePackage,
  jobRequirements,
  matchAnalysis,
  readinessAnalysis,
  candidateConfirmations = {},
}) => {
  const savedProfile = loadSavedProfile();
  const initialExtracted = savedProfile?.extractedData || null;
  const fullNameParts = (initialExtracted?.fullName || '').trim().split(/\s+/).filter(Boolean);

  const [stage, setStage] = useState<FlowStage>('cv');
  const [candidateProfile, setCandidateProfile] = useState<ExtractedCVData | null>(initialExtracted);
  const [cvText, setCvText] = useState(profileToText(initialExtracted));
  const [showExperienceFallback, setShowExperienceFallback] = useState(!initialExtracted);
  const [isExtractingCv, setIsExtractingCv] = useState(false);
  const [cvError, setCvError] = useState('');

  const [firstName, setFirstName] = useState(
    initialExtracted?.firstName || fullNameParts[0] || ''
  );
  const [surname, setSurname] = useState(
    initialExtracted?.surname || (fullNameParts.length > 1 ? fullNameParts.slice(1).join(' ') : '')
  );
  const [phone, setPhone] = useState(initialExtracted?.phone || '');
  const [email, setEmail] = useState(initialExtracted?.email || '');
  const [locationCity, setLocationCity] = useState(
    initialExtracted?.location || initialExtracted?.city || opportunity.location.city || ''
  );
  const [popiaAgreed, setPopiaAgreed] = useState(false);
  const [detailsError, setDetailsError] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PEACH_PAYMENTS');
  const [voucherCode, setVoucherCode] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentTransaction, setPaymentTransaction] = useState<PaymentTransaction | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [cvAnalysis, setCvAnalysis] = useState<CVAnalysisResult | null>(null);
  const [createdPackage, setCreatedPackage] = useState<ApplicationPackage | null>(null);
  const [copiedCv, setCopiedCv] = useState(false);
  const [copiedCoverLetter, setCopiedCoverLetter] = useState(false);
  const [handoffMessage, setHandoffMessage] = useState('');

  const stages: Array<{ id: FlowStage; label: string }> = [
    { id: 'cv', label: 'CV' },
    { id: 'payment', label: 'R5' },
    { id: 'ready', label: 'Ready' },
  ];
  const activeStageIndex = stages.findIndex((item) => item.id === stage);

  const handleCvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCvError('');

    const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.rtf'];
    const lowerName = file.name.toLowerCase();
    if (!allowedExtensions.some((extension) => lowerName.endsWith(extension))) {
      setCvError('Please choose a PDF, DOC, DOCX, TXT or RTF CV.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setCvError('That CV is larger than 10MB. Please choose a smaller file.');
      return;
    }

    setIsExtractingCv(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const resultString = reader.result as string;
          const base64Data = resultString.split(',')[1] || resultString;
          const response = await fetch('/api/cv/upload-and-extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: file.name,
              fileType: file.type || 'application/pdf',
              fileDataBase64: base64Data,
            }),
          });

          const data = await response.json();
          if (!data.success) throw new Error(data.error || 'We could not read that CV.');

          const extracted: ExtractedCVData = data.extractedData;
          const saved: CandidateCVProfile = {
            id: savedProfile?.id || `CV-PROF-${Date.now()}`,
            fileName: data.fileName || file.name,
            fileType: data.fileType || file.type || 'application/pdf',
            uploadedAt: data.uploadedAt || new Date().toISOString(),
            extractedData: extracted,
            updatedAt: new Date().toISOString(),
          };

          setCandidateProfile(extracted);
          setCvText(profileToText(extracted));
          setShowExperienceFallback(false);
          setFirstName(extracted.firstName || firstName);
          setSurname(extracted.surname || surname);
          setPhone(extracted.phone || phone);
          setEmail(extracted.email || email);
          setLocationCity(extracted.location || extracted.city || locationCity);
          localStorage.setItem('jobl_candidate_cv_profile', JSON.stringify(saved));
          setIsExtractingCv(false);
        } catch (error: any) {
          setCvError(error?.message || 'We could not read that CV.');
          setIsExtractingCv(false);
        }
      };

      reader.onerror = () => {
        setCvError('We could not read that file from your device.');
        setIsExtractingCv(false);
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      setCvError(error?.message || 'We could not open that CV.');
      setIsExtractingCv(false);
    }
  };

  const continueToPayment = () => {
    setDetailsError('');

    if (!cvText.trim()) {
      setDetailsError('Add your CV or a short summary of your experience first.');
      return;
    }
    if (!firstName.trim() || !surname.trim()) {
      setDetailsError('Please check your first name and surname.');
      return;
    }
    if (phone.replace(/\D/g, '').length < 10) {
      setDetailsError('Please enter a valid South African mobile number.');
      return;
    }
    if (!email.includes('@')) {
      setDetailsError('Please enter a valid email address.');
      return;
    }
    if (!popiaAgreed) {
      setDetailsError('Please agree so JobL can prepare this application for you.');
      return;
    }

    setStage('payment');
  };

  const candidateLead = (): CandidateLead => ({
    firstName: firstName.trim(),
    surname: surname.trim(),
    phone: phone.trim(),
    email: email.trim(),
    locationCity: locationCity.trim(),
    locationProvince: opportunity.location.province,
    popiaConsent: {
      agreed: true,
      timestamp: new Date().toISOString(),
      purpose: 'JobL Application Readiness Service & Employer Referral',
      consentVersion: '1.0-POPIA-ZA',
    },
  });

  const generateApplication = async (transaction: PaymentTransaction) => {
    setStage('ready');
    setIsGenerating(true);
    setGenerationError('');

    try {
      const response = await fetch('/api/cv/analyze-and-prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate: candidateLead(),
          cvText,
          opportunity,
          transactionId: transaction.transactionId,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'We could not prepare your application.');
      }

      const analysis: CVAnalysisResult = data.cvAnalysis;
      const pkg: ApplicationPackageWithDocuments = {
        packageId: `PKG-${Date.now()}`,
        opportunityId: opportunity.id,
        opportunityTitle: opportunity.title,
        employerName: opportunity.employer,
        candidateLead: candidateLead(),
        paymentTransaction: transaction,
        cvAnalysis: analysis,
        createdAt: new Date().toISOString(),
        originalApplicationUrl:
          opportunity.sourceProvenance.applicationDestination ||
          opportunity.sourceProvenance.originalUrl,
        status: 'READY',
        opportunitySnapshot: opportunity,
        jobRequirementsSnapshot: jobRequirements,
        matchAnalysisSnapshot: matchAnalysis,
        readinessAnalysisSnapshot: readinessAnalysis,
        candidateConfirmationsSnapshot: candidateConfirmations || {},
      };

      setCvAnalysis(analysis);
      setCreatedPackage(pkg);
      onCompletePackage(pkg);
      setIsGenerating(false);
    } catch (error: any) {
      setGenerationError(error?.message || 'We could not prepare your application.');
      setIsGenerating(false);
    }
  };

  const handlePaymentSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPaymentError('');

    if (paymentMethod === 'JOBL_VOUCHER' && !voucherCode.trim()) {
      setPaymentError('Enter your voucher code.');
      return;
    }

    setIsProcessingPayment(true);
    try {
      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityId: opportunity.id,
          candidateEmail: email.trim(),
          provider: paymentMethod,
          voucherCode: paymentMethod === 'JOBL_VOUCHER' ? voucherCode.trim() : undefined,
        }),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Payment could not be completed.');

      const transaction: PaymentTransaction = data.transaction;
      setPaymentTransaction(transaction);
      setIsProcessingPayment(false);
      await generateApplication(transaction);
    } catch (error: any) {
      setPaymentError(error?.message || 'Payment could not be completed.');
      setIsProcessingPayment(false);
    }
  };

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

  const copyText = async (text: string, type: 'cv' | 'cover') => {
    try {
      await writeClipboard(text);
      if (type === 'cv') {
        setCopiedCv(true);
        setTimeout(() => setCopiedCv(false), 2000);
      } else {
        setCopiedCoverLetter(true);
        setTimeout(() => setCopiedCoverLetter(false), 2000);
      }
    } catch (error: any) {
      setGenerationError(error?.message || 'Could not copy that text.');
    }
  };

  const handleDocumentsReady = (documents: GeneratedApplicationDocuments) => {
    if (!createdPackage) return;
    const updatedPackage: ApplicationPackageWithDocuments = {
      ...createdPackage,
      generatedDocuments: {
        cv: documents.cv,
        coverLetter: documents.coverLetter,
      },
    };
    setCreatedPackage(updatedPackage);
    onCompletePackage(updatedPackage);
  };

  const handleExternalHandoff = async () => {
    fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName: 'external_application_clicked',
        metadata: {
          opportunityId: opportunity.id,
          employer: opportunity.employer,
          candidateEmail: email.trim(),
        },
      }),
    });

    const provenance = opportunity.sourceProvenance;
    setHandoffMessage('');

    if (provenance.applicationMethodType === 'EMAIL' && provenance.applicationEmail) {
      window.location.href = `mailto:${provenance.applicationEmail}?subject=${encodeURIComponent(
        `Application for ${opportunity.title}`
      )}`;
      return;
    }

    const destination = provenance.applicationDestination || provenance.originalUrl;
    if (destination) {
      window.open(destination, '_blank', 'noopener,noreferrer');
      return;
    }

    if (provenance.applicationInstructions) {
      try {
        await writeClipboard(provenance.applicationInstructions);
        setHandoffMessage('Application instructions copied.');
      } catch {
        setHandoffMessage('Use the application instructions shown above.');
      }
    }
  };

  const hasExternalDestination = Boolean(
    opportunity.sourceProvenance.applicationDestination || opportunity.sourceProvenance.originalUrl
  );
  const applyLabel =
    opportunity.sourceProvenance.applicationMethodType === 'EMAIL' && opportunity.sourceProvenance.applicationEmail
      ? 'Open email to apply'
      : hasExternalDestination && opportunity.sourceProvenance.destinationStatus === 'VERIFIED'
      ? `Apply at ${opportunity.employer}`
      : hasExternalDestination
      ? 'Open official application page'
      : 'Copy application instructions';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" onClick={onClose} aria-hidden />

      <div className="relative bg-white w-full sm:max-w-xl sm:rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[96vh] sm:max-h-[92vh] rounded-t-3xl">
        <header className="shrink-0 px-5 sm:px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-blue-700 mb-1">Get ready to apply</p>
              <h2 className="text-lg font-bold text-slate-950 truncate">{opportunity.title}</h2>
              <p className="text-sm text-slate-500 mt-0.5 truncate">{opportunity.employer}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 p-2.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              aria-label="Close application"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {stages.map((item, index) => {
              const done = index < activeStageIndex;
              const current = index === activeStageIndex;
              return (
                <div key={item.id} className="min-w-0">
                  <div className={`h-1.5 rounded-full ${done || current ? 'bg-slate-950' : 'bg-slate-100'}`} />
                  <p className={`mt-2 text-xs font-semibold ${current ? 'text-slate-950' : done ? 'text-slate-600' : 'text-slate-400'}`}>
                    {done ? '✓ ' : ''}{item.label}
                  </p>
                </div>
              );
            })}
          </div>
        </header>

        {stage === 'cv' && (
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
            <div>
              <h3 className="text-2xl font-bold text-slate-950 tracking-[-0.035em]">Your CV</h3>
              <p className="text-sm text-slate-500 mt-1.5">
                We’ll use it to tailor this application to the job.
              </p>
            </div>

            {candidateProfile ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-emerald-700 text-sm font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    CV ready
                  </div>
                  <p className="text-sm font-semibold text-slate-950 mt-2 truncate">
                    {[candidateProfile.firstName, candidateProfile.surname].filter(Boolean).join(' ') || 'Saved CV'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {candidateProfile.employmentHistory?.length || 0} work roles · {candidateProfile.skills?.length || 0} skills
                  </p>
                </div>
                <label
                  htmlFor="jobl-flow-cv"
                  className="text-xs font-semibold text-slate-600 hover:text-slate-950 cursor-pointer shrink-0"
                >
                  Replace
                </label>
              </div>
            ) : (
              <label
                htmlFor="jobl-flow-cv"
                className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center block cursor-pointer hover:border-slate-400 transition-colors"
              >
                <Upload className="w-6 h-6 text-slate-500 mx-auto" />
                <p className="text-sm font-semibold text-slate-950 mt-3">Add your CV</p>
                <p className="text-xs text-slate-500 mt-1">PDF, DOC, DOCX, TXT or RTF · up to 10MB</p>
              </label>
            )}

            <input
              id="jobl-flow-cv"
              type="file"
              accept=".pdf,.doc,.docx,.txt,.rtf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              onChange={handleCvUpload}
              className="hidden"
            />

            {isExtractingCv && (
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-3.5 flex items-center gap-2.5 text-sm text-blue-900">
                <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                Reading your CV…
              </div>
            )}
            {cvError && (
              <div className="rounded-xl bg-red-50 border border-red-100 p-3.5 flex items-start gap-2.5 text-sm text-red-800">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {cvError}
              </div>
            )}

            {!candidateProfile && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowExperienceFallback((value) => !value)}
                  className="text-sm font-semibold text-blue-700 hover:text-blue-800 cursor-pointer"
                >
                  {showExperienceFallback ? 'Hide experience box' : 'No CV? Add your experience instead'}
                </button>
                {showExperienceFallback && (
                  <textarea
                    rows={5}
                    value={cvText}
                    onChange={(event) => setCvText(event.target.value)}
                    placeholder="Tell us about your education, previous jobs and skills."
                    className="mt-3 w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                )}
              </div>
            )}

            <div className="pt-1 border-t border-slate-100">
              <p className="text-sm font-bold text-slate-950 mt-5">Check your contact details</p>
              <p className="text-xs text-slate-500 mt-1">These go on your application.</p>
            </div>

            {detailsError && (
              <div className="rounded-xl bg-red-50 border border-red-100 p-3.5 flex items-start gap-2.5 text-sm text-red-800">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {detailsError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="First name" className="rounded-xl border border-slate-200 px-3.5 py-3 text-sm" />
              <input value={surname} onChange={(event) => setSurname(event.target.value)} placeholder="Surname" className="rounded-xl border border-slate-200 px-3.5 py-3 text-sm" />
              <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Mobile number" className="rounded-xl border border-slate-200 px-3.5 py-3 text-sm" />
              <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" className="rounded-xl border border-slate-200 px-3.5 py-3 text-sm" />
              <input value={locationCity} onChange={(event) => setLocationCity(event.target.value)} placeholder="Where you live" className="sm:col-span-2 rounded-xl border border-slate-200 px-3.5 py-3 text-sm" />
            </div>

            <label className="flex items-start gap-3 rounded-xl bg-slate-50 border border-slate-200 p-3.5 cursor-pointer">
              <input
                type="checkbox"
                checked={popiaAgreed}
                onChange={(event) => setPopiaAgreed(event.target.checked)}
                className="mt-0.5 w-4 h-4"
              />
              <span className="text-xs text-slate-600 leading-relaxed">
                I agree to JobL using these details to prepare this application and guide me to the employer’s official application page.
              </span>
            </label>

            <button
              type="button"
              onClick={continueToPayment}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Continue — R5
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {stage === 'payment' && (
          <form onSubmit={handlePaymentSubmit} className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
            <div className="rounded-2xl bg-slate-950 text-white p-5">
              <p className="text-sm text-slate-300">Get this application ready</p>
              <div className="flex items-end justify-between gap-4 mt-2">
                <p className="text-4xl font-bold tracking-[-0.04em]">R5</p>
                <p className="text-xs text-slate-400 text-right">once for this job</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-950">How would you like to pay?</h3>
              <div className="mt-3 space-y-2.5">
                <label className={`flex items-center gap-3 rounded-xl border p-4 cursor-pointer ${paymentMethod === 'PEACH_PAYMENTS' ? 'border-slate-950 bg-slate-50' : 'border-slate-200'}`}>
                  <input type="radio" name="payment" checked={paymentMethod === 'PEACH_PAYMENTS'} onChange={() => setPaymentMethod('PEACH_PAYMENTS')} />
                  <CreditCard className="w-5 h-5 text-slate-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-950">Card or bank</p>
                    <p className="text-xs text-slate-500">Secure South African checkout</p>
                  </div>
                </label>

                <label className={`flex items-center gap-3 rounded-xl border p-4 cursor-pointer ${paymentMethod === 'OZOW_EFT' ? 'border-slate-950 bg-slate-50' : 'border-slate-200'}`}>
                  <input type="radio" name="payment" checked={paymentMethod === 'OZOW_EFT'} onChange={() => setPaymentMethod('OZOW_EFT')} />
                  <Lock className="w-5 h-5 text-slate-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-950">Instant EFT</p>
                    <p className="text-xs text-slate-500">Pay directly from your bank</p>
                  </div>
                </label>

                <label className={`block rounded-xl border p-4 cursor-pointer ${paymentMethod === 'JOBL_VOUCHER' ? 'border-slate-950 bg-slate-50' : 'border-slate-200'}`}>
                  <div className="flex items-center gap-3">
                    <input type="radio" name="payment" checked={paymentMethod === 'JOBL_VOUCHER'} onChange={() => setPaymentMethod('JOBL_VOUCHER')} />
                    <ShieldCheck className="w-5 h-5 text-slate-500" />
                    <div>
                      <p className="text-sm font-semibold text-slate-950">I have a JobL voucher</p>
                      <p className="text-xs text-slate-500">Enter your code below</p>
                    </div>
                  </div>
                  {paymentMethod === 'JOBL_VOUCHER' && (
                    <input
                      value={voucherCode}
                      onChange={(event) => setVoucherCode(event.target.value)}
                      placeholder="Voucher code"
                      className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
                    />
                  )}
                </label>
              </div>
            </div>

            {paymentError && (
              <div className="rounded-xl bg-red-50 border border-red-100 p-3.5 flex items-start gap-2.5 text-sm text-red-800">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {paymentError}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setStage('cv')} className="px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer">
                Back
              </button>
              <button
                type="submit"
                disabled={isProcessingPayment}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
              >
                {isProcessingPayment ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Completing payment…
                  </>
                ) : (
                  <>
                    Pay R5 and prepare my application
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {stage === 'ready' && (
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
            {isGenerating ? (
              <div className="py-14 text-center">
                <div className="w-11 h-11 rounded-full border-2 border-slate-200 border-t-slate-950 animate-spin mx-auto" />
                <h3 className="text-xl font-bold text-slate-950 mt-5">Getting everything ready</h3>
                <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
                  JobL is tailoring your CV and cover letter for {opportunity.title}.
                </p>
              </div>
            ) : generationError ? (
              <div className="py-10 text-center">
                <AlertCircle className="w-9 h-9 text-red-500 mx-auto" />
                <h3 className="text-lg font-bold text-slate-950 mt-4">We couldn’t finish your application</h3>
                <p className="text-sm text-slate-500 mt-2">{generationError}</p>
                {paymentTransaction && (
                  <button
                    type="button"
                    onClick={() => generateApplication(paymentTransaction)}
                    className="mt-5 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white cursor-pointer"
                  >
                    Try again
                  </button>
                )}
              </div>
            ) : cvAnalysis && createdPackage ? (
              <>
                <div className="rounded-3xl bg-emerald-50 border border-emerald-100 p-5 sm:p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-950 tracking-[-0.035em] mt-4">Your application is ready</h3>
                  <p className="text-sm text-slate-600 mt-2">
                    Your CV and cover letter have been tailored for {opportunity.employer}.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-200 p-4 bg-white">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-700" />
                      <p className="text-sm font-bold text-slate-950">Your tailored CV</p>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Adjusted to highlight what matters for this role.</p>
                    <button
                      type="button"
                      onClick={() => void copyText(cvAnalysis.tailoredCVText, 'cv')}
                      className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 cursor-pointer"
                    >
                      {copiedCv ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedCv ? 'Copied' : 'Copy CV text'}
                    </button>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4 bg-white">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-700" />
                      <p className="text-sm font-bold text-slate-950">Your cover letter</p>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Written for this job using your real experience.</p>
                    <button
                      type="button"
                      onClick={() => void copyText(cvAnalysis.coverLetterMessage, 'cover')}
                      className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 cursor-pointer"
                    >
                      {copiedCoverLetter ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedCoverLetter ? 'Copied' : 'Copy cover letter'}
                    </button>
                  </div>
                </div>

                {candidateProfile && (
                  <ApplicationDocuments
                    candidateProfile={candidateProfile}
                    opportunity={opportunity}
                    jobRequirements={jobRequirements}
                    matchAnalysis={matchAnalysis}
                    readinessAnalysis={readinessAnalysis}
                    candidateConfirmations={candidateConfirmations}
                    autoGenerate
                    onDocumentsReady={handleDocumentsReady}
                  />
                )}

                {opportunity.sourceProvenance.applicationInstructions && (
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                    <p className="text-sm font-bold text-slate-950">How to apply</p>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed whitespace-pre-wrap">
                      {opportunity.sourceProvenance.applicationInstructions}
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void handleExternalHandoff()}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  {applyLabel}
                  <ExternalLink className="w-4 h-4" />
                </button>

                {handoffMessage && (
                  <p className="text-center text-xs font-medium text-emerald-700">{handoffMessage}</p>
                )}

                <p className="text-center text-xs text-slate-400">
                  Saved automatically in My applications.
                </p>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};
