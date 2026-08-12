import React, { useState } from 'react';
import {
  CandidateCVProfile,
  EducationItem,
  EmploymentItem,
  ExtractedCVData,
} from '../types';
import {
  AlertCircle,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronRight,
  FileText,
  GraduationCap,
  Languages,
  MapPin,
  Pencil,
  RefreshCw,
  Save,
  Upload,
  User,
  X,
} from 'lucide-react';

interface CvUploadManagerProps {
  currentProfile: CandidateCVProfile | null;
  onProfileSaved: (profile: CandidateCVProfile) => void;
  onClose?: () => void;
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300';
const labelClass = 'block text-xs font-medium text-slate-500 mb-1.5';

export const CvUploadManager: React.FC<CvUploadManagerProps> = ({
  currentProfile,
  onProfileSaved,
  onClose,
}) => {
  const [profile, setProfile] = useState<CandidateCVProfile | null>(currentProfile);
  const [extractedData, setExtractedData] = useState<ExtractedCVData | null>(
    currentProfile?.extractedData || null
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setSaveSuccessMessage('');

    const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.rtf'];
    const lowerName = file.name.toLowerCase();
    if (!allowedExtensions.some((extension) => lowerName.endsWith(extension))) {
      setUploadError('Please choose a PDF, DOC, DOCX, TXT or RTF CV.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('That file is larger than 10MB. Please choose a smaller CV.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);
    setUploadStatusText('Reading your CV…');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const resultString = reader.result as string;
          const base64Data = resultString.split(',')[1] || resultString;

          setUploadProgress(55);
          setUploadStatusText('Finding your experience, education and skills…');

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
          if (!data.success) {
            throw new Error(data.error || 'We could not read that CV.');
          }

          const newExtractedData: ExtractedCVData = data.extractedData;
          const newProfile: CandidateCVProfile = {
            id: profile?.id || `CV-PROF-${Date.now()}`,
            fileName: data.fileName || file.name,
            fileType: data.fileType || file.type || 'application/pdf',
            uploadedAt: data.uploadedAt || new Date().toISOString(),
            extractedData: newExtractedData,
            updatedAt: new Date().toISOString(),
          };

          setUploadProgress(100);
          setUploadStatusText('Your CV is ready.');
          setExtractedData(newExtractedData);
          setProfile(newProfile);
          setIsEditing(false);
          setIsUploading(false);
        } catch (error: any) {
          setIsUploading(false);
          setUploadError(error?.message || 'We could not read that CV.');
        }
      };

      reader.onerror = () => {
        setIsUploading(false);
        setUploadError('We could not read that file from your device.');
      };

      reader.readAsDataURL(file);
    } catch (error: any) {
      setIsUploading(false);
      setUploadError(error?.message || 'We could not open that CV.');
    }
  };

  const handleFieldChange = (field: keyof ExtractedCVData, value: any) => {
    if (!extractedData) return;
    setExtractedData({ ...extractedData, [field]: value });
  };

  const handleEmploymentChange = (
    index: number,
    key: keyof EmploymentItem,
    value: any
  ) => {
    if (!extractedData) return;
    const updated = [...extractedData.employmentHistory];
    updated[index] = { ...updated[index], [key]: value };
    setExtractedData({ ...extractedData, employmentHistory: updated });
  };

  const addEmploymentItem = () => {
    if (!extractedData) return;
    setExtractedData({
      ...extractedData,
      employmentHistory: [
        ...extractedData.employmentHistory,
        {
          employer: '',
          jobTitle: '',
          employmentDates: '',
          responsibilities: [],
          achievements: [],
        },
      ],
    });
  };

  const removeEmploymentItem = (index: number) => {
    if (!extractedData) return;
    setExtractedData({
      ...extractedData,
      employmentHistory: extractedData.employmentHistory.filter((_, itemIndex) => itemIndex !== index),
    });
  };

  const handleEducationChange = (
    index: number,
    key: keyof EducationItem,
    value: any
  ) => {
    if (!extractedData) return;
    const updated = [...extractedData.education];
    updated[index] = { ...updated[index], [key]: value };
    setExtractedData({ ...extractedData, education: updated });
  };

  const addEducationItem = () => {
    if (!extractedData) return;
    setExtractedData({
      ...extractedData,
      education: [
        ...extractedData.education,
        { qualification: '', institution: '', year: '' },
      ],
    });
  };

  const removeEducationItem = (index: number) => {
    if (!extractedData) return;
    setExtractedData({
      ...extractedData,
      education: extractedData.education.filter((_, itemIndex) => itemIndex !== index),
    });
  };

  const handleSaveProfile = () => {
    if (!extractedData) return;

    const savedProfile: CandidateCVProfile = {
      id: profile?.id || `CV-PROF-${Date.now()}`,
      fileName: profile?.fileName || 'Uploaded_CV.pdf',
      fileType: profile?.fileType || 'application/pdf',
      uploadedAt: profile?.uploadedAt || new Date().toISOString(),
      extractedData,
      updatedAt: new Date().toISOString(),
    };

    setProfile(savedProfile);
    try {
      localStorage.setItem('jobl_candidate_cv_profile', JSON.stringify(savedProfile));
    } catch (error) {
      console.error('Failed to save CV profile:', error);
    }

    onProfileSaved(savedProfile);
    setIsEditing(false);
    setSaveSuccessMessage('CV saved. JobL can now use it when you open a job.');
    setTimeout(() => setSaveSuccessMessage(''), 4000);
  };

  const cancelEditing = () => {
    if (profile?.extractedData) {
      setExtractedData(profile.extractedData);
    }
    setIsEditing(false);
  };

  const displayName =
    extractedData?.fullName ||
    [extractedData?.firstName, extractedData?.surname].filter(Boolean).join(' ') ||
    'Your CV';

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-[-0.035em]">My CV</h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1.5">
            Upload it once. JobL uses it to help with every job you choose.
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            aria-label="Close CV"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <input
        id="jobl-cv-upload"
        type="file"
        accept=".pdf,.doc,.docx,.txt,.rtf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        onChange={handleFileSelect}
        className="hidden"
      />

      {!extractedData && !isUploading && (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-slate-950 text-white flex items-center justify-center mx-auto">
            <Upload className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-950 mt-5">Add your CV</h2>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
            We’ll read the important parts so you don’t have to type everything again for every application.
          </p>

          {uploadError && (
            <div className="mt-5 max-w-md mx-auto rounded-xl border border-red-100 bg-red-50 p-3.5 flex items-start gap-2.5 text-left">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{uploadError}</p>
            </div>
          )}

          <label
            htmlFor="jobl-cv-upload"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Choose my CV
          </label>
          <p className="text-xs text-slate-400 mt-3">PDF, DOC, DOCX, TXT or RTF · up to 10MB</p>
        </div>
      )}

      {isUploading && (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 text-center shadow-sm">
          <div className="w-11 h-11 rounded-full border-2 border-slate-200 border-t-slate-950 animate-spin mx-auto" />
          <p className="text-base font-semibold text-slate-950 mt-5">Reading your CV</p>
          <p className="text-sm text-slate-500 mt-1">{uploadStatusText}</p>
          <div className="w-full max-w-xs mx-auto h-1.5 bg-slate-100 rounded-full overflow-hidden mt-5">
            <div
              className="h-full bg-slate-950 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {extractedData && !isEditing && (
        <div className="space-y-4">
          {saveSuccessMessage && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 flex items-center gap-2.5 text-sm text-emerald-800">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {saveSuccessMessage}
            </div>
          )}

          <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="p-6 sm:p-7 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-600">Your CV is ready</p>
                    <h2 className="text-xl font-bold text-slate-950 mt-1 truncate">{displayName}</h2>
                    <p className="text-sm text-slate-500 mt-1 truncate">{profile?.fileName}</p>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                      {extractedData.email && <span>{extractedData.email}</span>}
                      {extractedData.phone && <span>{extractedData.phone}</span>}
                      {extractedData.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {extractedData.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <label
                  htmlFor="jobl-cv-upload"
                  className="inline-flex items-center gap-1.5 self-start rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Replace
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-100">
              {[
                { label: 'Work roles', value: extractedData.employmentHistory?.length || 0, icon: Briefcase },
                { label: 'Education', value: extractedData.education?.length || 0, icon: GraduationCap },
                { label: 'Skills', value: extractedData.skills?.length || 0, icon: Check },
                { label: 'Languages', value: extractedData.languages?.length || 0, icon: Languages },
              ].map((item) => (
                <div key={item.label} className="p-4 sm:p-5">
                  <item.icon className="w-4 h-4 text-slate-400" />
                  <p className="text-xl font-bold text-slate-950 mt-2">{item.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>

            {extractedData.professionalProfile && (
              <div className="px-6 sm:px-7 py-5 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-400">Profile</p>
                <p className="text-sm text-slate-600 leading-relaxed mt-1.5 line-clamp-3">
                  {extractedData.professionalProfile}
                </p>
              </div>
            )}

            <div className="p-5 sm:p-6 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleSaveProfile}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Use this CV
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Pencil className="w-4 h-4" />
                Review details
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-400 text-center">
            You can update this CV anytime. JobL uses the saved details when checking jobs and preparing applications.
          </p>
        </div>
      )}

      {extractedData && isEditing && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-950">Review your CV details</p>
              <p className="text-xs text-slate-500 mt-0.5">Only change anything JobL read incorrectly.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelEditing}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Save changes
              </button>
            </div>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-950 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              Your details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>First name</label>
                <input className={inputClass} value={extractedData.firstName || ''} onChange={(e) => handleFieldChange('firstName', e.target.value || null)} />
              </div>
              <div>
                <label className={labelClass}>Surname</label>
                <input className={inputClass} value={extractedData.surname || ''} onChange={(e) => handleFieldChange('surname', e.target.value || null)} />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" className={inputClass} value={extractedData.email || ''} onChange={(e) => handleFieldChange('email', e.target.value || null)} />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input type="tel" className={inputClass} value={extractedData.phone || ''} onChange={(e) => handleFieldChange('phone', e.target.value || null)} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Location</label>
                <input className={inputClass} value={extractedData.location || ''} onChange={(e) => handleFieldChange('location', e.target.value || null)} placeholder="City or area" />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h3 className="text-sm font-semibold text-slate-950">Profile</h3>
            <textarea
              rows={4}
              className={`${inputClass} mt-3 resize-y`}
              value={extractedData.professionalProfile || ''}
              onChange={(e) => handleFieldChange('professionalProfile', e.target.value || null)}
              placeholder="Short professional summary"
            />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-950 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-slate-400" />
                Work experience
              </h3>
              <button type="button" onClick={addEmploymentItem} className="text-sm font-semibold text-slate-600 hover:text-slate-950 cursor-pointer">Add role</button>
            </div>
            {extractedData.employmentHistory.length === 0 ? (
              <p className="text-sm text-slate-400">No work experience found.</p>
            ) : (
              <div className="space-y-3">
                {extractedData.employmentHistory.map((item, index) => (
                  <div key={index} className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <span className="text-xs font-medium text-slate-500">Role {index + 1}</span>
                      <button type="button" onClick={() => removeEmploymentItem(index)} className="text-xs font-medium text-slate-400 hover:text-red-600 cursor-pointer">Remove</button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className={labelClass}>Job title</label>
                        <input className={inputClass} value={item.jobTitle || ''} onChange={(e) => handleEmploymentChange(index, 'jobTitle', e.target.value || null)} />
                      </div>
                      <div>
                        <label className={labelClass}>Employer</label>
                        <input className={inputClass} value={item.employer || ''} onChange={(e) => handleEmploymentChange(index, 'employer', e.target.value || null)} />
                      </div>
                      <div>
                        <label className={labelClass}>Dates</label>
                        <input className={inputClass} value={item.employmentDates || ''} onChange={(e) => handleEmploymentChange(index, 'employmentDates', e.target.value || null)} placeholder="2022 – 2024" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-950 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-slate-400" />
                Education
              </h3>
              <button type="button" onClick={addEducationItem} className="text-sm font-semibold text-slate-600 hover:text-slate-950 cursor-pointer">Add education</button>
            </div>
            {extractedData.education.length === 0 ? (
              <p className="text-sm text-slate-400">No education found.</p>
            ) : (
              <div className="space-y-3">
                {extractedData.education.map((item, index) => (
                  <div key={index} className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <span className="text-xs font-medium text-slate-500">Education {index + 1}</span>
                      <button type="button" onClick={() => removeEducationItem(index)} className="text-xs font-medium text-slate-400 hover:text-red-600 cursor-pointer">Remove</button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className={labelClass}>Qualification</label>
                        <input className={inputClass} value={item.qualification || ''} onChange={(e) => handleEducationChange(index, 'qualification', e.target.value || null)} />
                      </div>
                      <div>
                        <label className={labelClass}>Institution</label>
                        <input className={inputClass} value={item.institution || ''} onChange={(e) => handleEducationChange(index, 'institution', e.target.value || null)} />
                      </div>
                      <div>
                        <label className={labelClass}>Year</label>
                        <input className={inputClass} value={item.year || ''} onChange={(e) => handleEducationChange(index, 'year', e.target.value || null)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-950">Skills & more</h3>
            <div>
              <label className={labelClass}>Skills</label>
              <input
                className={inputClass}
                value={(extractedData.skills || []).join(', ')}
                onChange={(e) => handleFieldChange('skills', e.target.value.split(',').map((item) => item.trim()).filter(Boolean))}
                placeholder="Customer service, stock control, Excel"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Languages</label>
                <input
                  className={inputClass}
                  value={(extractedData.languages || []).join(', ')}
                  onChange={(e) => handleFieldChange('languages', e.target.value.split(',').map((item) => item.trim()).filter(Boolean))}
                />
              </div>
              <div>
                <label className={labelClass}>Licences</label>
                <input
                  className={inputClass}
                  value={(extractedData.licences || []).join(', ')}
                  onChange={(e) => handleFieldChange('licences', e.target.value.split(',').map((item) => item.trim()).filter(Boolean))}
                />
              </div>
            </div>
          </section>

          <button
            type="button"
            onClick={handleSaveProfile}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Save my CV
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
