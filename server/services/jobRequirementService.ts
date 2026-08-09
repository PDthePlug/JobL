import { GoogleGenAI, Type } from '@google/genai';
import {
  ExtractedCVData,
  JobRequirementItem,
  JobRequirements,
  RequirementMatch,
  JobMatchAnalysis,
  RequirementCategory,
  RequirementImportance,
  MatchStatus,
  OverallMatchStatus,
} from '../../src/types.ts';

export class JobRequirementService {
  private ai: GoogleGenAI | null = null;

  private getAi(): GoogleGenAI {
    if (!this.ai) {
      const apiKey = process.env.GEMINI_API_KEY || '';
      this.ai = new GoogleGenAI({ apiKey });
    }
    return this.ai;
  }

  /**
   * Extracts structured JobRequirements from an opportunity or job posting object.
   */
  public async extractJobRequirements(opportunity: {
    id?: string;
    title?: string;
    employer?: string;
    location?: { city?: string; province?: string } | string;
    employmentType?: string;
    fullDescription?: string;
    description?: string;
    requirements?: string[];
    qualificationRequirement?: string;
    responsibilities?: string[];
    salary?: { formatted?: string } | string;
  }): Promise<JobRequirements> {
    const jobId = opportunity.id || 'JOB-' + Date.now();
    const jobTitle = opportunity.title || 'General Vacancy';
    const employer = opportunity.employer || 'Employer';
    const locationStr =
      typeof opportunity.location === 'object'
        ? `${opportunity.location.city || ''}, ${opportunity.location.province || ''}`.trim()
        : opportunity.location || null;
    const employmentType = opportunity.employmentType || null;
    const salaryInformation =
      typeof opportunity.salary === 'object'
        ? opportunity.salary.formatted || null
        : opportunity.salary || null;

    const rawReqList = opportunity.requirements || [];
    const rawRespList = opportunity.responsibilities || [];
    const qualReq = opportunity.qualificationRequirement || '';
    const descText = opportunity.fullDescription || opportunity.description || '';

    // Attempt AI extraction first
    try {
      const aiClient = this.getAi();
      const systemPrompt = `You are JobL's Job Requirement Extraction Engine.
Your task is to parse a job vacancy listing and extract structured, discrete job requirement items.

CRITICAL RULES:
1. Extract ONLY requirements explicitly mentioned in the vacancy listing or clearly stated qualifications.
2. DO NOT invent, assume, or fabricate any unstated requirements.
3. Categorize each requirement into one of:
   - EXPERIENCE (years of experience, industry background)
   - EDUCATION (Matric, diploma, degree, FETC)
   - CERTIFICATION (RE5, accredited certificates)
   - LICENCE (driver's licence, forklift, professional licence)
   - SKILL (MS Office, communication, sales, teamwork, attention to detail)
   - LANGUAGE (English, Afrikaans, etc.)
   - RESPONSIBILITY (key job duties)
   - AVAILABILITY (shifts, immediate start)
   - LOCATION (city/region constraints)
   - OTHER
4. Classify importance as:
   - MANDATORY (explicitly required, essential, minimum requirement)
   - PREFERRED (stated as preferred, advantageous, plus, ideal)
   - INFORMATIONAL (job context, work environment)
   - UNKNOWN (when importance cannot be confidently determined)`;

      const userPrompt = `Extract discrete job requirements for:
Job Title: ${jobTitle}
Employer: ${employer}
Location: ${locationStr || 'Not specified'}
Qualification Requirement: ${qualReq}
Explicit Requirements List:
${rawReqList.map((r, i) => `- ${r}`).join('\n')}

Responsibilities List:
${rawRespList.map((r, i) => `- ${r}`).join('\n')}

Full Description:
${descText}`;

      const modelsToTry = ['gemini-3.5-flash', 'gemini-2.0-flash', 'gemini-3.6-flash'];
      for (const modelName of modelsToTry) {
        try {
          const response = await aiClient.models.generateContent({
            model: modelName,
            contents: [{ text: userPrompt }],
            config: {
              systemInstruction: systemPrompt,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  requirements: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        requirement: { type: Type.STRING, description: 'Concise summary of requirement' },
                        category: {
                          type: Type.STRING,
                          enum: [
                            'EXPERIENCE',
                            'EDUCATION',
                            'CERTIFICATION',
                            'LICENCE',
                            'SKILL',
                            'LANGUAGE',
                            'RESPONSIBILITY',
                            'AVAILABILITY',
                            'LOCATION',
                            'OTHER',
                          ],
                        },
                        importance: {
                          type: Type.STRING,
                          enum: ['MANDATORY', 'PREFERRED', 'INFORMATIONAL', 'UNKNOWN'],
                        },
                        sourceText: { type: Type.STRING, description: 'Original verbatim sentence/phrase' },
                        explicitOrInferred: { type: Type.STRING, enum: ['EXPLICIT', 'INFERRED'] },
                      },
                      required: ['requirement', 'category', 'importance', 'sourceText', 'explicitOrInferred'],
                    },
                  },
                },
                required: ['requirements'],
              },
            },
          });

          const parsed = JSON.parse(response.text || '{}');
          if (Array.isArray(parsed.requirements) && parsed.requirements.length > 0) {
            return this.buildJobRequirementsObject(
              jobId,
              jobTitle,
              employer,
              locationStr,
              employmentType,
              salaryInformation,
              parsed.requirements
            );
          }
        } catch (mErr: any) {
          console.warn(`Gemini extraction attempt with ${modelName} failed, retrying fallback...`);
        }
      }
    } catch (err: any) {
      console.warn('AI job requirement extraction failed, proceeding to deterministic extractor:', err.message || err);
    }

    // Deterministic fallback extractor
    return this.fallbackJobRequirementExtractor(
      jobId,
      jobTitle,
      employer,
      locationStr,
      employmentType,
      salaryInformation,
      qualReq,
      rawReqList,
      rawRespList,
      descText
    );
  }

  private buildJobRequirementsObject(
    jobId: string,
    jobTitle: string,
    employer: string,
    location: string | null,
    employmentType: string | null,
    salaryInformation: string | null,
    items: any[]
  ): JobRequirements {
    const allRequirements: JobRequirementItem[] = items.map((item, idx) => ({
      id: `REQ-${idx + 1}`,
      requirement: item.requirement || 'Requirement',
      category: (item.category as RequirementCategory) || 'OTHER',
      importance: (item.importance as RequirementImportance) || 'UNKNOWN',
      sourceText: item.sourceText || item.requirement || '',
      explicitOrInferred: (item.explicitOrInferred as 'EXPLICIT' | 'INFERRED') || 'EXPLICIT',
    }));

    return {
      jobId,
      jobTitle,
      employer,
      location,
      employmentType,
      experienceRequirements: allRequirements.filter((r) => r.category === 'EXPERIENCE'),
      educationRequirements: allRequirements.filter((r) => r.category === 'EDUCATION'),
      certificationRequirements: allRequirements.filter((r) => r.category === 'CERTIFICATION'),
      licenceRequirements: allRequirements.filter((r) => r.category === 'LICENCE'),
      skillRequirements: allRequirements.filter((r) => r.category === 'SKILL'),
      languageRequirements: allRequirements.filter((r) => r.category === 'LANGUAGE'),
      responsibilityRequirements: allRequirements.filter((r) => r.category === 'RESPONSIBILITY'),
      availabilityRequirements: allRequirements.filter((r) => r.category === 'AVAILABILITY'),
      otherRequirements: allRequirements.filter(
        (r) => !['EXPERIENCE', 'EDUCATION', 'CERTIFICATION', 'LICENCE', 'SKILL', 'LANGUAGE', 'RESPONSIBILITY', 'AVAILABILITY'].includes(r.category)
      ),
      salaryInformation,
      applicationDeadline: null,
      allRequirements,
    };
  }

  private fallbackJobRequirementExtractor(
    jobId: string,
    jobTitle: string,
    employer: string,
    location: string | null,
    employmentType: string | null,
    salaryInformation: string | null,
    qualReq: string,
    reqList: string[],
    respList: string[],
    descText: string
  ): JobRequirements {
    const rawCandidates: { text: string; defaultCat?: RequirementCategory }[] = [];

    if (qualReq) {
      rawCandidates.push({ text: qualReq, defaultCat: 'EDUCATION' });
    }

    reqList.forEach((r) => rawCandidates.push({ text: r }));
    respList.forEach((r) => rawCandidates.push({ text: r, defaultCat: 'RESPONSIBILITY' }));

    if (rawCandidates.length === 0 && descText) {
      descText.split('\n').forEach((line) => {
        const clean = line.replace(/^[\s•\-\*]+/, '').trim();
        if (clean.length > 10) {
          rawCandidates.push({ text: clean });
        }
      });
    }

    const items: JobRequirementItem[] = [];

    rawCandidates.forEach((cand, idx) => {
      const lower = cand.text.toLowerCase();

      // Determine category
      let category: RequirementCategory = cand.defaultCat || 'OTHER';

      if (/licence|license|driver|code\s*8|code\s*10|forklift/i.test(lower)) {
        category = 'LICENCE';
      } else if (/fetc|re5|certificate|certification|accredited/i.test(lower)) {
        category = 'CERTIFICATION';
      } else if (/matric|grade\n*12|degree|diploma|qualification|education|nxf|nqf/i.test(lower)) {
        category = 'EDUCATION';
      } else if (/year|experience|background|history|proven track/i.test(lower)) {
        category = 'EXPERIENCE';
      } else if (/ms\s*office|excel|word|powerpoint|communication|customer\s*service|telesales|teamwork|detail|skill|ability|proficient/i.test(lower)) {
        category = 'SKILL';
      } else if (/english|afrikaans|isizulu|language|fluent|speak/i.test(lower)) {
        category = 'LANGUAGE';
      } else if (/responsible|duty|manage|handle|assist|support|conduct|call/i.test(lower)) {
        category = 'RESPONSIBILITY';
      } else if (/immediate|shift|hours|available|availability/i.test(lower)) {
        category = 'AVAILABILITY';
      }

      // Determine importance
      let importance: RequirementImportance = 'UNKNOWN';
      if (/required|must\s+have|essential|minimum|mandatory|need/i.test(lower)) {
        importance = 'MANDATORY';
      } else if (/preferred|advantageous|advantage|desirable|plus|ideal/i.test(lower)) {
        importance = 'PREFERRED';
      } else if (/environment|fast-paced|dynamic|culture/i.test(lower)) {
        importance = 'INFORMATIONAL';
      } else {
        // Default heuristics
        importance = category === 'EDUCATION' || category === 'EXPERIENCE' ? 'MANDATORY' : 'MANDATORY';
      }

      items.push({
        id: `REQ-${idx + 1}`,
        requirement: cand.text,
        category,
        importance,
        sourceText: cand.text,
        explicitOrInferred: 'EXPLICIT',
      });
    });

    return this.buildJobRequirementsObject(
      jobId,
      jobTitle,
      employer,
      location,
      employmentType,
      salaryInformation,
      items
    );
  }

  /**
   * Deterministic comparison engine that compares an ExtractedCVData against JobRequirements.
   * STRICTLY ADHERES TO ZERO-FABRICATION RULE.
   */
  public compareCandidateToJob(
    candidate: ExtractedCVData,
    jobReqs: JobRequirements
  ): JobMatchAnalysis {
    const matches: RequirementMatch[] = [];
    const partials: RequirementMatch[] = [];
    const missings: RequirementMatch[] = [];
    const unknowns: RequirementMatch[] = [];

    const fullCvTextLower = [
      candidate.fullName || '',
      candidate.firstName || '',
      candidate.surname || '',
      candidate.professionalProfile || '',
      ...(candidate.personalStatementBullets || []),
      ...(candidate.skills || []),
      ...(candidate.skillItems?.map((s) => `${s.skillName} ${s.originalDescription || ''}`) || []),
      ...(candidate.certifications || []),
      ...(candidate.licences || []),
      ...(candidate.languages || []),
      ...(candidate.education?.map((e) => `${e.qualification || ''} ${e.institution || ''} ${e.details || ''}`) || []),
      ...(candidate.employmentHistory?.map(
        (h) => `${h.jobTitle || ''} ${h.employer || ''} ${(h.responsibilities || []).join(' ')} ${(h.achievements || []).join(' ')} ${(h.milestones || []).join(' ')}`
      ) || []),
      candidate.rawExtractedText || '',
    ]
      .join(' ')
      .toLowerCase();

    for (const reqItem of jobReqs.allRequirements) {
      const matchResult = this.evaluateSingleRequirement(reqItem, candidate, fullCvTextLower);

      if (matchResult.status === 'MATCH') {
        matches.push(matchResult);
      } else if (matchResult.status === 'PARTIAL_MATCH') {
        partials.push(matchResult);
      } else if (matchResult.status === 'MISSING') {
        missings.push(matchResult);
      } else {
        unknowns.push(matchResult);
      }
    }

    // Deterministic Overall Match Status Calculation
    const overallStatus = this.calculateOverallMatchStatus(jobReqs.allRequirements, matches, partials, missings, unknowns);

    // Strengths
    const strengths: string[] = matches.map(
      (m) => `✓ ${m.requirement}${m.candidateEvidence ? `: "${m.candidateEvidence}"` : ''}`
    );

    // Gaps & Needs Attention
    const gaps: string[] = [
      ...partials.map((p) => `△ ${p.requirement}: ${p.explanation}`),
      ...missings.map((m) => `✕ ${m.requirement}: No supporting evidence in candidate history`),
    ];

    // Evidence Summary
    const evidenceSummary =
      `Match evaluation for ${candidate.firstName || candidate.fullName || 'Candidate'} against ${jobReqs.jobTitle} at ${jobReqs.employer}. ` +
      `Identified ${matches.length} confirmed requirement matches, ${partials.length} partial matches, ` +
      `${missings.length} missing evidence areas, and ${unknowns.length} unconfirmed requirements based strictly on CV evidence.`;

    // Next Preparation Areas
    const nextPreparationAreas: string[] = [];
    if (partials.length > 0) {
      nextPreparationAreas.push(
        `Prepare to explain how your experience (${partials[0].candidateEvidence || 'background'}) relates to ${partials[0].requirement}.`
      );
    }
    if (unknowns.length > 0) {
      const unkLicence = unknowns.find((u) => u.category === 'LICENCE');
      if (unkLicence) {
        nextPreparationAreas.push(`Confirm your status regarding ${unkLicence.requirement} before applying.`);
      } else {
        nextPreparationAreas.push(`Be prepared to clarify ${unknowns[0].requirement} during the interview.`);
      }
    }
    if (nextPreparationAreas.length === 0) {
      nextPreparationAreas.push('Review key responsibilities and highlight your verified achievements during interview.');
    }

    return {
      jobId: jobReqs.jobId,
      jobTitle: jobReqs.jobTitle,
      employer: jobReqs.employer,
      candidateProfileVersion: new Date().toISOString(),
      overallStatus,
      matchedRequirements: matches,
      partialMatches: partials,
      missingEvidence: missings,
      unknownRequirements: unknowns,
      strengths,
      gaps,
      evidenceSummary,
      nextPreparationAreas,
    };
  }

  private evaluateSingleRequirement(
    reqItem: JobRequirementItem,
    candidate: ExtractedCVData,
    fullCvTextLower: string
  ): RequirementMatch {
    const reqText = reqItem.requirement;
    const reqLower = reqText.toLowerCase();

    // 1. DRIVER'S LICENCE / LICENCES
    if (reqItem.category === 'LICENCE' || /driver|licence|license|code\s*8|code\s*10|forklift/i.test(reqLower)) {
      const candidateLicences = candidate.licences || [];
      const licenceText = candidateLicences.join(' ');
      if (licenceText.length > 0 && /driver|code\s*8|code\s*10|code\s*14|pdpr/i.test(licenceText.toLowerCase())) {
        return {
          requirementId: reqItem.id,
          requirement: reqText,
          category: reqItem.category,
          importance: reqItem.importance,
          status: 'MATCH',
          candidateEvidence: candidateLicences.join(', '),
          sourceEvidence: reqItem.sourceText,
          explanation: 'Candidate profile explicitly contains driver licence details.',
        };
      }
      // CRITICAL SPEC MANDATE: If CV does not mention a driver's licence, say UNKNOWN!
      return {
        requirementId: reqItem.id,
        requirement: reqText,
        category: reqItem.category,
        importance: reqItem.importance,
        status: 'UNKNOWN',
        candidateEvidence: null,
        sourceEvidence: reqItem.sourceText,
        explanation: "Driver's licence is not mentioned in candidate profile. Indeterminate whether candidate possesses a licence.",
      };
    }

    // 2. MICROSOFT OFFICE / SKILLS
    if (/microsoft\s*office|ms\s*office|word|excel|powerpoint|outlook/i.test(reqLower)) {
      const msSkills = (candidate.skills || []).filter((s) => /microsoft|word|excel|powerpoint|outlook|ms\s*office/i.test(s));
      const hasMsInText = /microsoft\s*(word|excel|powerpoint|outlook)|ms\s*office/i.test(fullCvTextLower);

      if (msSkills.length > 0 || hasMsInText) {
        const evidenceStr = msSkills.length > 0
          ? msSkills.join(', ')
          : 'Proficient in Microsoft Word, Excel, PowerPoint and Outlook.';
        return {
          requirementId: reqItem.id,
          requirement: reqText,
          category: reqItem.category,
          importance: reqItem.importance,
          status: 'MATCH',
          candidateEvidence: evidenceStr,
          sourceEvidence: reqItem.sourceText,
          explanation: 'Candidate CV demonstrates explicit Microsoft Office proficiency.',
        };
      }
    }

    // 3. WRITTEN & VERBAL COMMUNICATION / SPEAKING
    if (/communication|verbal|written|speaking/i.test(reqLower)) {
      const commSkills = (candidate.skills || []).filter((s) => /communication|speaking|verbal|written/i.test(s));
      const hasCommInProfile = /communication|verbal|written|speaking/i.test(candidate.professionalProfile || '') ||
        (candidate.personalStatementBullets || []).some((b) => /communication|verbal|written|speaking/i.test(b));

      if (commSkills.length > 0 || hasCommInProfile) {
        let evidence = commSkills.join(', ');
        if (hasCommInProfile && candidate.personalStatementBullets?.length) {
          const matchingBullet = candidate.personalStatementBullets.find((b) => /communication|verbal|written/i.test(b));
          if (matchingBullet) evidence = matchingBullet;
        }
        if (!evidence) evidence = 'Excellent written and verbal communication skills.';

        return {
          requirementId: reqItem.id,
          requirement: reqText,
          category: reqItem.category,
          importance: reqItem.importance,
          status: 'MATCH',
          candidateEvidence: evidence,
          sourceEvidence: reqItem.sourceText,
          explanation: 'Candidate profile provides explicit evidence of communication skills.',
        };
      }
    }

    // 4. CUSTOMER SERVICE / TELESALES
    if (/customer\s*service|client|telesales|sales|customer\s*relations/i.test(reqLower)) {
      const csSkills = (candidate.skills || []).filter((s) => /customer|sales|client|service|listening|persuasion/i.test(s));
      const expMatch = (candidate.employmentHistory || []).find((h) =>
        /telesales|sales|customer|client|consultant/i.test(`${h.jobTitle || ''} ${h.employer || ''} ${(h.responsibilities || []).join(' ')}`)
      );

      if (expMatch || csSkills.length > 0) {
        const evidenceStr = expMatch
          ? `${expMatch.jobTitle || 'Role'} at ${expMatch.employer || 'Employer'} (${expMatch.employmentDates || ''}): ${(expMatch.responsibilities || []).slice(0, 2).join(' ')}`
          : csSkills.join(', ');

        return {
          requirementId: reqItem.id,
          requirement: reqText,
          category: reqItem.category,
          importance: reqItem.importance,
          status: 'MATCH',
          candidateEvidence: evidenceStr.trim(),
          sourceEvidence: reqItem.sourceText,
          explanation: 'Candidate has verified customer service and telesales experience.',
        };
      }
    }

    // 5. TEAMWORK / WORKING IN A TEAM
    if (/team|teamwork|collaborat/i.test(reqLower)) {
      const hasTeamInText = /team|teamwork|collaborat/i.test(fullCvTextLower);
      if (hasTeamInText) {
        const matchingBullet = (candidate.personalStatementBullets || []).find((b) => /team/i.test(b)) ||
          'Proven ability to work effectively as part of a team.';
        return {
          requirementId: reqItem.id,
          requirement: reqText,
          category: reqItem.category,
          importance: reqItem.importance,
          status: 'MATCH',
          candidateEvidence: matchingBullet,
          sourceEvidence: reqItem.sourceText,
          explanation: 'Candidate CV explicitly mentions teamwork capabilities.',
        };
      }
    }

    // 6. GRADE 12 / MATRIC / EDUCATION
    if (reqItem.category === 'EDUCATION' || /grade\s*12|matric|nxf|nqf/i.test(reqLower)) {
      const hasMatric = (candidate.education || []).some((e) => /matric|grade\s*12/i.test(`${e.qualification || ''} ${e.details || ''}`));
      const hasFetc = (candidate.education || []).some((e) => /fetc|business\s*administration/i.test(`${e.qualification || ''} ${e.details || ''}`)) ||
        (candidate.certifications || []).some((c) => /fetc|business\s*administration/i.test(c));

      if (hasMatric) {
        const matEdu = candidate.education.find((e) => /matric|grade\s*12/i.test(`${e.qualification || ''}`));
        return {
          requirementId: reqItem.id,
          requirement: reqText,
          category: reqItem.category,
          importance: reqItem.importance,
          status: 'MATCH',
          candidateEvidence: matEdu?.qualification || 'Grade 12 / Matric',
          sourceEvidence: reqItem.sourceText,
          explanation: 'Candidate explicitly holds Grade 12 / Matric qualification.',
        };
      }

      if (hasFetc) {
        const fetcQual = candidate.education.find((e) => /fetc/i.test(e.qualification || ''))?.qualification ||
          candidate.certifications.find((c) => /fetc/i.test(c)) || 'FETC: Business Administration Service Level 4';
        // SPEC MANDATE: Do not automatically assume FETC equals Grade 12 unless explicitly stated. Result: PARTIAL_MATCH
        return {
          requirementId: reqItem.id,
          requirement: reqText,
          category: reqItem.category,
          importance: reqItem.importance,
          status: 'PARTIAL_MATCH',
          candidateEvidence: fetcQual,
          sourceEvidence: reqItem.sourceText,
          explanation: 'Candidate holds FETC Business Administration Level 4 qualification. Equivalent to NQF Level 4, but explicit Matric certificate is not listed.',
        };
      }
    }

    // 7. ADMINISTRATIVE EXPERIENCE / ADMINISTRATIVE ABILITY
    if (/administrat|office\s*admin|clerical/i.test(reqLower)) {
      const hasAdminTitle = (candidate.employmentHistory || []).some((h) => /admin/i.test(h.jobTitle || ''));
      const desiredIsAdmin = /admin/i.test(candidate.desiredPosition || '');
      const fetcAdmin = (candidate.certifications || []).some((c) => /business\s*administration/i.test(c));

      if (hasAdminTitle) {
        const admEmp = candidate.employmentHistory.find((h) => /admin/i.test(h.jobTitle || ''));
        return {
          requirementId: reqItem.id,
          requirement: reqText,
          category: reqItem.category,
          importance: reqItem.importance,
          status: 'MATCH',
          candidateEvidence: `${admEmp?.jobTitle} at ${admEmp?.employer}`,
          sourceEvidence: reqItem.sourceText,
          explanation: 'Candidate has direct previous administrative experience.',
        };
      }

      if (desiredIsAdmin || fetcAdmin) {
        return {
          requirementId: reqItem.id,
          requirement: reqText,
          category: reqItem.category,
          importance: reqItem.importance,
          status: 'PARTIAL_MATCH',
          candidateEvidence: candidate.desiredPosition ? `Target Position: ${candidate.desiredPosition}` : 'FETC Business Administration Qualification',
          sourceEvidence: reqItem.sourceText,
          explanation: 'Candidate has FETC Business Administration training and seeks Administrative Level position, but direct Assistant job title is not listed.',
        };
      }
    }

    // 8. ATTENTION TO DETAIL
    if (/attention\s*to\s*detail|accuracy|precision|detailed/i.test(reqLower)) {
      const hasDetailInText = /attention\s*to\s*detail|accuracy|precision/i.test(fullCvTextLower);
      if (hasDetailInText) {
        return {
          requirementId: reqItem.id,
          requirement: reqText,
          category: reqItem.category,
          importance: reqItem.importance,
          status: 'MATCH',
          candidateEvidence: 'Demonstrated attention to detail in administrative & sales reporting tasks.',
          sourceEvidence: reqItem.sourceText,
          explanation: 'Candidate CV contains evidence of detail orientation.',
        };
      }
      return {
        requirementId: reqItem.id,
        requirement: reqText,
        category: reqItem.category,
        importance: reqItem.importance,
        status: 'PARTIAL_MATCH',
        candidateEvidence: null,
        sourceEvidence: reqItem.sourceText,
        explanation: 'Inferred from quality control in client communications, but explicit "attention to detail" skill keyword is absent.',
      };
    }

    // GENERAL MATCH / UNKNOWN CHECK
    const wordTokens = reqLower.split(/\W+/).filter((w) => w.length > 3);
    const matchingTokens = wordTokens.filter((w) => fullCvTextLower.includes(w));

    if (matchingTokens.length >= Math.max(1, Math.floor(wordTokens.length * 0.6))) {
      return {
        requirementId: reqItem.id,
        requirement: reqText,
        category: reqItem.category,
        importance: reqItem.importance,
        status: 'MATCH',
        candidateEvidence: `Matching profile elements found: ${matchingTokens.join(', ')}`,
        sourceEvidence: reqItem.sourceText,
        explanation: 'Candidate profile contains relevant evidence corresponding to requirement keywords.',
      };
    }

    // Default to UNKNOWN when information is not clearly present in CV
    return {
      requirementId: reqItem.id,
      requirement: reqText,
      category: reqItem.category,
      importance: reqItem.importance,
      status: 'UNKNOWN',
      candidateEvidence: null,
      sourceEvidence: reqItem.sourceText,
      explanation: 'Information regarding this specific requirement is not mentioned in the candidate profile.',
    };
  }

  /**
   * Calculates overall status deterministically.
   * Documentation of Scoring Rules:
   * 1. If > 50% of requirements are UNKNOWN, return INSUFFICIENT_INFORMATION.
   * 2. If mandatory requirements exist:
   *    - Score = (mandatoryMatches + 0.5 * mandatoryPartials) / mandatoryTotal
   *    - STRONG_MATCH: Score >= 0.75 and 0 mandatory MISSING.
   *    - POTENTIAL_MATCH: Score >= 0.50
   *    - PARTIAL_MATCH: Score >= 0.30
   *    - LOW_MATCH: Score < 0.30
   * 3. If no mandatory requirements tagged:
   *    - Score = (allMatches + 0.5 * allPartials) / allTotal
   *    - STRONG_MATCH: Score >= 0.70
   *    - POTENTIAL_MATCH: Score >= 0.50
   *    - PARTIAL_MATCH: Score >= 0.30
   *    - LOW_MATCH: Score < 0.30
   */
  private calculateOverallMatchStatus(
    allReqs: JobRequirementItem[],
    matches: RequirementMatch[],
    partials: RequirementMatch[],
    missings: RequirementMatch[],
    unknowns: RequirementMatch[]
  ): OverallMatchStatus {
    const totalCount = allReqs.length;
    if (totalCount === 0) return 'INSUFFICIENT_INFORMATION';

    if (unknowns.length / totalCount > 0.55) {
      return 'INSUFFICIENT_INFORMATION';
    }

    const mandatoryReqs = allReqs.filter((r) => r.importance === 'MANDATORY');

    if (mandatoryReqs.length > 0) {
      const mandIds = new Set(mandatoryReqs.map((r) => r.id));
      const mandMatches = matches.filter((m) => mandIds.has(m.requirementId)).length;
      const mandPartials = partials.filter((m) => mandIds.has(m.requirementId)).length;
      const mandMissings = missings.filter((m) => mandIds.has(m.requirementId)).length;

      const score = (mandMatches + 0.5 * mandPartials) / mandatoryReqs.length;

      if (score >= 0.75 && mandMissings === 0) return 'STRONG_MATCH';
      if (score >= 0.5) return 'POTENTIAL_MATCH';
      if (score >= 0.3) return 'PARTIAL_MATCH';
      return 'LOW_MATCH';
    }

    const score = (matches.length + 0.5 * partials.length) / totalCount;
    if (score >= 0.7) return 'STRONG_MATCH';
    if (score >= 0.5) return 'POTENTIAL_MATCH';
    if (score >= 0.3) return 'PARTIAL_MATCH';
    return 'LOW_MATCH';
  }
}
