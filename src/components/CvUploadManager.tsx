import React, { useState, useRef } from 'react';
import { CandidateCVProfile, ExtractedCVData, EmploymentItem, EducationItem } from '../types';
import { Upload, FileText, CheckCircle2, AlertCircle, RefreshCw, User, Mail, Phone, MapPin, Briefcase, GraduationCap, Award, Globe, Plus, Trash2, Edit3, Save, ShieldCheck } from 'lucide-react';

interface CvUploadManagerProps {
  currentProfile: CandidateCVProfile | null;
  onProfileSaved: (profile: CandidateCVProfile) => void;
  onClose?: () => void;
}

export const CvUploadManager: React.FC<CvUploadManagerProps> = ({
  currentProfile,
  onProfileSaved,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [uploadError, setUploadError] = useState('');

  // Profile Form State (Editable extracted data)
  const [profile, setProfile] = useState<CandidateCVProfile | null>(currentProfile);
  const [extractedData, setExtractedData] = useState<ExtractedCVData | null>(
    currentProfile ? currentProfile.extractedData : null
  );

  // Success message after saving
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');

  // Handle File Upload from Mobile or Desktop
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setSaveSuccessMessage('');
    setIsUploading(true);
    setUploadProgress(20);
    setUploadStatusText(`Reading ${file.name}...`);

    // File validation
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.rtf'];
    const lowerName = file.name.toLowerCase();
    const isValidType = allowedExtensions.some(ext => lowerName.endsWith(ext));

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
      // Read file to Base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const resultStr = reader.result as string;
          const base64Data = resultStr.split(',')[1] || resultStr;

          setUploadProgress(50);
          setUploadStatusText('Server receiving document & extracting details...');

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
            setUploadStatusText('We read most of your CV, but some information may need checking.');
          } else {
            setUploadStatusText('We\'ve read your CV. Please check the information below.');
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

  // Field change handlers
  const handleFieldChange = (field: keyof ExtractedCVData, value: any) => {
    if (!extractedData) return;
    setExtractedData({
      ...extractedData,
      [field]: value,
    });
  };

  // Employment item change handler
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
    const updated = extractedData.employmentHistory.filter((_, i) => i !== index);
    setExtractedData({ ...extractedData, employmentHistory: updated });
  };

  // Education item change handler
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
    const updated = extractedData.education.filter((_, i) => i !== index);
    setExtractedData({ ...extractedData, education: updated });
  };

  // Save profile handler
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
    setSaveSuccessMessage('Your Candidate Profile & CV details have been saved successfully!');
    setTimeout(() => setSaveSuccessMessage(''), 4000);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-w-4xl mx-auto my-4 text-slate-800">
      {/* Banner Header */}
      <div className="bg-blue-600 text-white p-5 sm:p-6 border-b border-blue-700 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-blue-100">
            <FileText className="w-4 h-4 text-white" />
            <span>JobL Candidate CV Profile</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">CV Upload & Profile Review</h2>
          <p className="text-xs text-blue-100 mt-0.5">
            Upload your CV from your phone or device to automatically extract your structured information.
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="text-blue-100 hover:text-white bg-blue-700 hover:bg-blue-800 p-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        )}
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {/* Hidden Mobile File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.rtf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          onChange={handleFileSelect}
          className="hidden"
          id="jobl-mobile-cv-input"
        />

        {/* UPLOAD ACTION SECTION */}
        {!extractedData && !isUploading && (
          <div className="border-2 border-dashed border-blue-300 bg-blue-50/50 rounded-2xl p-8 sm:p-12 text-center space-y-4 hover:border-blue-500 transition-colors">
            <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
              <Upload className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Upload Your Existing CV</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto mt-1 leading-relaxed">
                Select your CV document (PDF, DOC, DOCX, or TXT) from your phone or computer. JobL will parse and extract your details into a structured profile.
              </p>
            </div>

            {uploadError && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-3.5 rounded-xl text-xs flex items-center justify-center gap-2 max-w-md mx-auto">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <div className="pt-2">
              <label
                htmlFor="jobl-mobile-cv-input"
                className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm px-8 py-3.5 rounded-xl shadow-lg transition-all cursor-pointer transform hover:-translate-y-0.5"
              >
                <Upload className="w-5 h-5" />
                <span>UPLOAD MY CV</span>
              </label>
              <p className="text-[11px] text-slate-400 mt-2">Supported formats: PDF, DOC, DOCX, TXT • Max size 10MB</p>
            </div>
          </div>
        )}

        {/* UPLOAD & EXTRACTION IN PROGRESS */}
        {isUploading && (
          <div className="border border-blue-200 bg-blue-50 rounded-2xl p-8 text-center space-y-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Processing Your Document</h3>
              <p className="text-xs text-blue-700 mt-1">{uploadStatusText}</p>
            </div>

            <div className="w-full bg-slate-200 rounded-full h-2.5 max-w-md mx-auto overflow-hidden">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-[11px] text-slate-500 font-mono">{uploadProgress}%</p>
          </div>
        )}

        {/* CANDIDATE REVIEW & EDITING SECTION */}
        {extractedData && (
          <div className="space-y-6">
            {/* Header Banner: THIS IS WHAT WE FOUND IN YOUR CV */}
            <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
              <div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Extraction Complete</span>
                </div>
                <h3 className="text-lg font-black text-white mt-0.5">THIS IS WHAT WE FOUND IN YOUR CV</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Review the extracted fields below and correct any details before saving.
                </p>
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <label
                  htmlFor="jobl-mobile-cv-input"
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl transition-colors cursor-pointer flex items-center space-x-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                  <span>Upload Different CV</span>
                </label>

                <button
                  onClick={handleSaveProfile}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold px-4 py-2 rounded-xl shadow transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Profile</span>
                </button>
              </div>
            </div>

            {saveSuccessMessage && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3.5 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold">{saveSuccessMessage}</span>
              </div>
            )}

            {uploadError && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-3.5 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* SECTION 1: PERSONAL & CONTACT INFORMATION */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
                <User className="w-4 h-4 text-blue-600" />
                Personal & Contact Details
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={extractedData.firstName || ''}
                    onChange={(e) => handleFieldChange('firstName', e.target.value || null)}
                    placeholder="e.g. Thabo"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Surname</label>
                  <input
                    type="text"
                    value={extractedData.surname || ''}
                    onChange={(e) => handleFieldChange('surname', e.target.value || null)}
                    placeholder="e.g. Mokoena"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={extractedData.phone || ''}
                    onChange={(e) => handleFieldChange('phone', e.target.value || null)}
                    placeholder="e.g. 082 123 4567"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={extractedData.email || ''}
                    onChange={(e) => handleFieldChange('email', e.target.value || null)}
                    placeholder="e.g. thabo@example.co.za"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Location / City</label>
                  <input
                    type="text"
                    value={extractedData.location || ''}
                    onChange={(e) => handleFieldChange('location', e.target.value || null)}
                    placeholder="e.g. Soweto, Johannesburg"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: PROFESSIONAL PROFILE STATEMENT */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
              <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Professional Profile / Objective
              </h4>
              <textarea
                rows={3}
                value={extractedData.professionalProfile || ''}
                onChange={(e) => handleFieldChange('professionalProfile', e.target.value || null)}
                placeholder="Professional profile or summary extracted from document..."
                className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs leading-relaxed text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* SECTION 3: EMPLOYMENT HISTORY */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-blue-600" />
                  Employment History
                </h4>
                <button
                  type="button"
                  onClick={addEmploymentItem}
                  className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Experience</span>
                </button>
              </div>

              {extractedData.employmentHistory.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No employment history detected in CV.</p>
              ) : (
                <div className="space-y-4">
                  {extractedData.employmentHistory.map((item, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">Employer #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeEmploymentItem(idx)}
                          className="text-red-600 hover:text-red-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Employer Name</label>
                          <input
                            type="text"
                            value={item.employer || ''}
                            onChange={(e) => handleEmploymentChange(idx, 'employer', e.target.value || null)}
                            placeholder="e.g. Shoprite Group"
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Job Title</label>
                          <input
                            type="text"
                            value={item.jobTitle || ''}
                            onChange={(e) => handleEmploymentChange(idx, 'jobTitle', e.target.value || null)}
                            placeholder="e.g. Till Packer"
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Dates</label>
                          <input
                            type="text"
                            value={item.employmentDates || ''}
                            onChange={(e) => handleEmploymentChange(idx, 'employmentDates', e.target.value || null)}
                            placeholder="e.g. Jan 2023 - Dec 2024"
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION 4: EDUCATION & QUALIFICATIONS */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-blue-600" />
                  Education & Qualifications
                </h4>
                <button
                  type="button"
                  onClick={addEducationItem}
                  className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Education</span>
                </button>
              </div>

              {extractedData.education.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No education or qualification details detected in CV.</p>
              ) : (
                <div className="space-y-4">
                  {extractedData.education.map((item, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">Qualification #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeEducationItem(idx)}
                          className="text-red-600 hover:text-red-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Qualification Name</label>
                          <input
                            type="text"
                            value={item.qualification || ''}
                            onChange={(e) => handleEducationChange(idx, 'qualification', e.target.value || null)}
                            placeholder="e.g. Grade 12 / Matric Certificate"
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Institution</label>
                          <input
                            type="text"
                            value={item.institution || ''}
                            onChange={(e) => handleEducationChange(idx, 'institution', e.target.value || null)}
                            placeholder="e.g. Orlando High School"
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Year Passed</label>
                          <input
                            type="text"
                            value={item.year || ''}
                            onChange={(e) => handleEducationChange(idx, 'year', e.target.value || null)}
                            placeholder="e.g. 2024"
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION 5: SKILLS, LANGUAGES, LICENCES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Skills */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-blue-600" />
                  Skills (Comma Separated)
                </h4>
                <textarea
                  rows={2}
                  value={extractedData.skills.join(', ')}
                  onChange={(e) =>
                    handleFieldChange(
                      'skills',
                      e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean)
                    )
                  }
                  placeholder="e.g. Customer Service, Cash Handling, Stock Control, Punctuality"
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none"
                />
              </div>

              {/* Languages */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-blue-600" />
                  Languages Spoken
                </h4>
                <textarea
                  rows={2}
                  value={extractedData.languages.join(', ')}
                  onChange={(e) =>
                    handleFieldChange(
                      'languages',
                      e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean)
                    )
                  }
                  placeholder="e.g. English, isiZulu, Sesotho"
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none"
                />
              </div>

              {/* Licences & Certifications */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 sm:col-span-2">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  Licences & Certifications
                </h4>
                <input
                  type="text"
                  value={extractedData.licences.join(', ')}
                  onChange={(e) =>
                    handleFieldChange(
                      'licences',
                      e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean)
                    )
                  }
                  placeholder="e.g. Code 08 Driver's License, First Aid Certificate"
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            {/* SAVE ACTION BOTTOM BAR */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Extracted data is stored securely in local browser memory.
              </p>

              <button
                type="button"
                onClick={handleSaveProfile}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm px-8 py-3 rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Corrected Information</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
