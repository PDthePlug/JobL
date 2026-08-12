import React, { useState, useRef } from 'react';
import {
  CandidateCVProfile,
  ExtractedCVData,
  EmploymentItem,
  EducationItem,
} from '../types';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Award,
  Globe,
  Plus,
  Trash2,
  Save,
  ShieldCheck,
} from 'lucide-react';

interface CvUploadManagerProps {
  currentProfile: CandidateCVProfile | null;
  onProfileSaved: (profile: CandidateCVProfile) => void;
  onClose?: () => void;
}

const inputClass =
  'w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-shadow';
const labelClass = 'block text-xs font-medium text-slate-500 mb-1.5';
const sectionClass = 'rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4';

export const CvUploadManager: React.FC<CvUploadManagerProps> = ({
  currentProfile,
  onProfileSaved,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [uploadError, setUploadError] = useState('');

  const [profile, setProfile] = useState<CandidateCVProfile | null>(currentProfile);
  const [extractedData, setExtractedData] = useState<ExtractedCVData | null>(
    currentProfile ? currentProfile.extractedData : null
  );

  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setSaveSuccessMessage('');
    setIsUploading(true);
    setUploadProgress(20);
    setUploadStatusText(`Reading ${file.name}…`);

    const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.rtf'];
    const lowerName = file.name.toLowerCase();
    const isValidType = allowedExtensions.some((ext) => lowerName.endsWith(ext));

    if (!isValidType) {
      setIsUploading(false);
      setUploadError('Unsupported file format. Please select a PDF, DOC, DOCX, or TXT document.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setIsUploading(false);
      setUploadError('CV file exceeds 10MB limit. Please upload a smaller file.');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const resultStr = reader.result as string;
          const base64Data = resultStr.split(',')[1] || resultStr;

          setUploadProgress(50);
          setUploadStatusText('Extracting your details…');

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

          setUploadProgress(100);

          if (data.extractionStatus === 'NEEDS_REVIEW') {
            setUploadStatusText('We read most of your CV — please check the details below.');
          } else {
            setUploadStatusText('We’ve read your CV. Please review the information below.');
          }

          const newExtractedData: ExtractedCVData = data.extractedData;
          setExtractedData(newExtractedData);

          const newProfile: CandidateCVProfile = {
            id: profile?.id || `CV-PROF-${Date.now()}`,
            fileName: data.fileName,
            fileType: data.fileType,
            uploadedAt: data.uploadedAt,
            extractedData: newExtractedData,
            updatedAt: new Date().toISOString(),
          };

          setProfile(newProfile);
          setIsUploading(false);
        } catch (err: any) {
          setIsUploading(false);
          setUploadError(err.message || 'An error occurred during CV processing.');
        }
      };

      reader.onerror = () => {
        setIsUploading(false);
        setUploadError('Error reading file from your device.');
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsUploading(false);
      setUploadError(err.message || 'Failed to process file.');
    }
  };

  const handleFieldChange = (field: keyof ExtractedCVData, value: any) => {
    if (!extractedData) return;
    setExtractedData({ ...extractedData, [field]: value });
  };

  const handleEmploymentChange = (index: number, key: keyof EmploymentItem, value: any) => {
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
        { employer: '', jobTitle: '', employmentDates: '', responsibilities: [], achievements: [] },
      ],
    });
  };

  const removeEmploymentItem = (index: number) => {
    if (!extractedData) return;
    setExtractedData({
      ...extractedData,
      employmentHistory: extractedData.employmentHistory.filter((_, i) => i !== index),
    });
  };

  const handleEducationChange = (index: number, key: keyof EducationItem, value: any) => {
    if (!extractedData) return;
    const updated = [...extractedData.education];
    updated[index] = { ...updated[index], [key]: value };
    setExtractedData({ ...extractedData, education: updated });
  };

  const addEducationItem = () => {
    if (!extractedData) return;
    setExtractedData({
      ...extractedData,
      education: [...extractedData.education, { qualification: '', institution: '', year: '' }],
    });
  };

  const removeEducationItem = (index: number) => {
    if (!extractedData) return;
    setExtractedData({
      ...extractedData,
      education: extractedData.education.filter((_, i) => i !== index),
    });
  };

  const handleSaveProfile = () => {
    if (!extractedData) return;

    const savedProf: CandidateCVProfile = {
      id: profile?.id || `CV-PROF-${Date.now()}`,
      fileName: profile?.fileName || 'Uploaded_CV.pdf',
      fileType: profile?.fileType || 'application/pdf',
      uploadedAt: profile?.uploadedAt || new Date().toISOString(),
      extractedData,
      updatedAt: new Date().toISOString(),
    };

    setProfile(savedProf);
    try {
      localStorage.setItem('jobl_candidate_cv_profile', JSON.stringify(savedProf));
    } catch (e) {
      console.error('Failed to save profile to localStorage:', e);
    }

    onProfileSaved(savedProf);
    setSaveSuccessMessage('Your profile has been saved.');
    setTimeout(() => setSaveSuccessMessage(''), 4000);
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Page header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
            My CV
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Upload once. We extract your details so applications take minutes, not hours.
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            Close
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.rtf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        onChange={handleFileSelect}
        className="hidden"
        id="jobl-mobile-cv-input"
      />

      {/* Empty — upload zone */}
      {!extractedData && !isUploading && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 sm:p-14 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto mb-5">
            <Upload className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Upload your CV</h2>
          <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
            PDF, DOC, DOCX or TXT · Max 10MB. We’ll extract your details for review.
          </p>

          {uploadError && (
            <div className="mt-5 mx-auto max-w-md flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 text-red-800 text-sm p-3.5 text-left">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{uploadError}</span>
            </div>
          )}

          <label
            htmlFor="jobl-mobile-cv-input"
            className="mt-6 inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm px-6 py-3 rounded-xl cursor-pointer transition-colors"
          >
            <Upload className="w-4 h-4" />
            Choose file
          </label>
        </div>
      )}

      {/* Uploading */}
      {isUploading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center space-y-4">
          <div className="w-10 h-10 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin mx-auto" />
          <div>
            <p className="text-sm font-medium text-slate-900">Processing your document</p>
            <p className="text-sm text-slate-500 mt-1">{uploadStatusText}</p>
          </div>
          <div className="w-full max-w-xs mx-auto h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-slate-900 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Review form */}
      {extractedData && (
        <div className="space-y-5">
          {/* Status bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Details extracted</p>
                <p className="text-xs text-slate-500">Review and correct anything before saving.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label
                htmlFor="jobl-mobile-cv-input"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Replace file
              </label>
              <button
                type="button"
                onClick={handleSaveProfile}
                className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded-xl cursor-pointer transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                Save
              </button>
            </div>
          </div>

          {saveSuccessMessage && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm px-4 py-3">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {saveSuccessMessage}
            </div>
          )}

          {/* Personal */}
          <section className={sectionClass}>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              Personal details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>First name</label>
                <input
                  type="text"
                  value={extractedData.firstName || ''}
                  onChange={(e) => handleFieldChange('firstName', e.target.value || null)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Surname</label>
                <input
                  type="text"
                  value={extractedData.surname || ''}
                  onChange={(e) => handleFieldChange('surname', e.target.value || null)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  <span className="inline-flex items-center gap-1">
                    <Mail className="w-3 h-3" /> Email
                  </span>
                </label>
                <input
                  type="email"
                  value={extractedData.email || ''}
                  onChange={(e) => handleFieldChange('email', e.target.value || null)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  <span className="inline-flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Phone
                  </span>
                </label>
                <input
                  type="tel"
                  value={extractedData.phone || ''}
                  onChange={(e) => handleFieldChange('phone', e.target.value || null)}
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Location
                  </span>
                </label>
                <input
                  type="text"
                  value={extractedData.location || ''}
                  onChange={(e) => handleFieldChange('location', e.target.value || null)}
                  placeholder="City or area"
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          {/* Profile statement */}
          <section className={sectionClass}>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              Professional profile
            </h3>
            <textarea
              rows={3}
              value={extractedData.professionalProfile || ''}
              onChange={(e) => handleFieldChange('professionalProfile', e.target.value || null)}
              placeholder="Short summary from your CV"
              className={inputClass + ' resize-y'}
            />
          </section>

          {/* Employment */}
          <section className={sectionClass}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-slate-400" />
                Work experience
              </h3>
              <button
                type="button"
                onClick={addEmploymentItem}
                className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>

            {extractedData.employmentHistory.length === 0 ? (
              <p className="text-sm text-slate-400">No experience extracted.</p>
            ) : (
              <div className="space-y-4">
                {extractedData.employmentHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">Role {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeEmploymentItem(idx)}
                        className="text-slate-400 hover:text-red-600 cursor-pointer"
                        aria-label="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className={labelClass}>Employer</label>
                        <input
                          type="text"
                          value={item.employer || ''}
                          onChange={(e) => handleEmploymentChange(idx, 'employer', e.target.value || null)}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Job title</label>
                        <input
                          type="text"
                          value={item.jobTitle || ''}
                          onChange={(e) => handleEmploymentChange(idx, 'jobTitle', e.target.value || null)}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Dates</label>
                        <input
                          type="text"
                          value={item.employmentDates || ''}
                          onChange={(e) =>
                            handleEmploymentChange(idx, 'employmentDates', e.target.value || null)
                          }
                          placeholder="e.g. 2022 – 2024"
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Education */}
          <section className={sectionClass}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-slate-400" />
                Education
              </h3>
              <button
                type="button"
                onClick={addEducationItem}
                className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>

            {extractedData.education.length === 0 ? (
              <p className="text-sm text-slate-400">No education extracted.</p>
            ) : (
              <div className="space-y-4">
                {extractedData.education.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">Entry {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeEducationItem(idx)}
                        className="text-slate-400 hover:text-red-600 cursor-pointer"
                        aria-label="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className={labelClass}>Qualification</label>
                        <input
                          type="text"
                          value={item.qualification || ''}
                          onChange={(e) =>
                            handleEducationChange(idx, 'qualification', e.target.value || null)
                          }
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Institution</label>
                        <input
                          type="text"
                          value={item.institution || ''}
                          onChange={(e) =>
                            handleEducationChange(idx, 'institution', e.target.value || null)
                          }
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Year</label>
                        <input
                          type="text"
                          value={item.year || ''}
                          onChange={(e) => handleEducationChange(idx, 'year', e.target.value || null)}
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Skills / languages / licences */}
          <section className={sectionClass}>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-slate-400" />
              Skills & more
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelClass}>Skills (comma separated)</label>
                <input
                  type="text"
                  value={(extractedData.skills || []).join(', ')}
                  onChange={(e) =>
                    handleFieldChange(
                      'skills',
                      e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean)
                    )
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  <span className="inline-flex items-center gap-1">
                    <Globe className="w-3 h-3" /> Languages
                  </span>
                </label>
                <input
                  type="text"
                  value={(extractedData.languages || []).join(', ')}
                  onChange={(e) =>
                    handleFieldChange(
                      'languages',
                      e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean)
                    )
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Licences & certifications
                  </span>
                </label>
                <input
                  type="text"
                  value={(extractedData.licences || []).join(', ')}
                  onChange={(e) =>
                    handleFieldChange(
                      'licences',
                      e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean)
                    )
                  }
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          {/* Bottom save */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 pb-6">
            <p className="text-xs text-slate-400">Stored locally in your browser.</p>
            <button
              type="button"
              onClick={handleSaveProfile}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm px-6 py-3 rounded-xl cursor-pointer transition-colors"
            >
              <Save className="w-4 h-4" />
              Save profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
