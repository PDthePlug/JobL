import {
  ExtractedCVData,
  JobRequirements,
  JobMatchAnalysis,
  ApplicationReadinessAnalysis,
  ReadinessItem,
  CandidateQuestion,
  ApplicationReadinessState,
  RequirementCategory,
} from '../../src/types.ts';

export class ApplicationReadinessService {
  /**
   * Generates a deterministic ApplicationReadinessAnalysis from Phase 2B outputs and candidate confirmations.
   */
  public analyzeReadiness(
    candidate: ExtractedCVData,
    jobReqs: JobRequirements,
    matchAnalysis: JobMatchAnalysis,
    candidateConfirmations: Record<string, string> = {}
  ): ApplicationReadinessAnalysis {
    const readyItems: ReadinessItem[] = [];
    const confirmationItems: ReadinessItem[] = [];
    const strengtheningItems: ReadinessItem[] = [];
    const correctionItems: ReadinessItem[] = [];
    const candidateQuestions: CandidateQuestion[] = [];

    // 1. Process MATCHED Requirements -> READY
    for (const match of matchAnalysis.matchedRequirements) {
      readyItems.push({
        id: `READY-${match.requirementId}`,
        requirementId: match.requirementId,
        title: match.requirement,
        actionType: 'READY',
        explanation: 'Your CV already provides clear evidence for this requirement.',
        priority: 'LOW',
        source: 'EXTRACTED_CV',
        relatedEvidence: match.candidateEvidence,
        actionRequired: null,
      });
    }

    // 2. Process UNKNOWN Requirements -> CONFIRM / CANDIDATE QUESTIONS
    for (const unk of matchAnalysis.unknownRequirements) {
      const confirmationKey = unk.requirementId;
      const userResponse = candidateConfirmations[confirmationKey] || candidateConfirmations[unk.requirement];

      // Formulate candidate question
      let questionText = `Do you have or satisfy: ${unk.requirement}?`;
      if (unk.category === 'LICENCE' || /driver|licence/i.test(unk.requirement)) {
        questionText = 'Do you have a valid driver\'s licence?';
      } else if (unk.category === 'EDUCATION' || /matric|grade\s*12/i.test(unk.requirement)) {
        questionText = 'Do you hold a Grade 12 / Matric certificate or equivalent?';
      } else if (unk.category === 'AVAILABILITY') {
        questionText = 'Are you available to start immediately or on short notice?';
      }

      const candidateQ: CandidateQuestion = {
        questionId: `Q-${unk.requirementId}`,
        relatedRequirementId: unk.requirementId,
        question: questionText,
        category: unk.category,
        responseType: 'YES_NO',
        options: ['YES', 'NO', 'NOT_SURE'],
        response: userResponse || null,
        responseSource: userResponse ? 'CANDIDATE_CONFIRMED' : undefined,
      };
      candidateQuestions.push(candidateQ);

      if (userResponse) {
        if (userResponse.toUpperCase() === 'YES') {
          confirmationItems.push({
            id: `CONFIRM-${unk.requirementId}`,
            requirementId: unk.requirementId,
            title: unk.requirement,
            actionType: 'CONFIRM',
            explanation: `Confirmed by candidate: Candidate explicitly reported possessing "${unk.requirement}".`,
            priority: unk.importance === 'MANDATORY' ? 'HIGH' : 'MEDIUM',
            source: 'CANDIDATE_CONFIRMED',
            relatedEvidence: `Candidate confirmed: ${userResponse}`,
            actionRequired: 'Preserved as candidate-confirmed information for application.',
          });
        } else {
          strengtheningItems.push({
            id: `CONFIRM-NO-${unk.requirementId}`,
            requirementId: unk.requirementId,
            title: unk.requirement,
            actionType: 'STRENGTHEN',
            explanation: `Candidate confirmed they do not currently have: ${unk.requirement}.`,
            priority: unk.importance === 'MANDATORY' ? 'HIGH' : 'MEDIUM',
            source: 'CANDIDATE_CONFIRMED',
            relatedEvidence: `Candidate response: ${userResponse}`,
            actionRequired: 'Be prepared to explain or address this requirement if questioned.',
          });
        }
      } else {
        confirmationItems.push({
          id: `CONFIRM-${unk.requirementId}`,
          requirementId: unk.requirementId,
          title: unk.requirement,
          actionType: 'CONFIRM',
          explanation: `Your CV does not provide enough information to confirm whether you satisfy "${unk.requirement}".`,
          priority: unk.importance === 'MANDATORY' ? 'HIGH' : 'MEDIUM',
          source: 'EXTRACTED_CV',
          relatedEvidence: null,
          actionRequired: 'Confirm your status before finalizing your application.',
        });
      }
    }

    // 3. Process PARTIAL_MATCH Requirements -> STRENGTHEN
    for (const partial of matchAnalysis.partialMatches) {
      strengtheningItems.push({
        id: `STRENGTHEN-${partial.requirementId}`,
        requirementId: partial.requirementId,
        title: partial.requirement,
        actionType: 'STRENGTHEN',
        explanation: partial.explanation || `Your CV shows interest or related qualification, but direct evidence for "${partial.requirement}" could be stronger.`,
        priority: partial.importance === 'MANDATORY' ? 'HIGH' : 'MEDIUM',
        source: 'EXTRACTED_CV',
        relatedEvidence: partial.candidateEvidence,
        actionRequired: 'Highlight relevant coursework, transferrable tasks, or sales/client duties to strengthen this area.',
      });
    }

    // 4. Process MISSING Requirements & Data Integrity -> CORRECT
    for (const missing of matchAnalysis.missingEvidence) {
      correctionItems.push({
        id: `CORRECT-${missing.requirementId}`,
        requirementId: missing.requirementId,
        title: missing.requirement,
        actionType: 'CORRECT',
        explanation: `Explicit requirement with no supporting evidence found in candidate profile.`,
        priority: missing.importance === 'MANDATORY' ? 'HIGH' : 'MEDIUM',
        source: 'EXTRACTED_CV',
        relatedEvidence: null,
        actionRequired: 'Review whether you have unlisted experience that satisfies this requirement.',
      });
    }

    // Integrity check on candidate contact details
    if (!candidate.email || (!candidate.phone && !candidate.phoneNumbers?.length)) {
      correctionItems.push({
        id: 'CORRECT-CONTACT-INFO',
        requirementId: 'REQ-CONTACT',
        title: 'Candidate Contact Details',
        actionType: 'CORRECT',
        explanation: 'Incomplete contact details (email or phone) detected in candidate profile.',
        priority: 'HIGH',
        source: 'EXTRACTED_CV',
        relatedEvidence: `Email: ${candidate.email || 'Missing'} | Phone: ${candidate.phone || candidate.phoneNumbers?.[0] || 'Missing'}`,
        actionRequired: 'Confirm phone and email address prior to application handoff.',
      });
    }

    // 5. Prioritize Action Items (High priority first)
    const allActionable = [
      ...correctionItems.filter((i) => i.priority === 'HIGH'),
      ...confirmationItems.filter((i) => i.priority === 'HIGH'),
      ...strengtheningItems.filter((i) => i.priority === 'HIGH'),
      ...confirmationItems.filter((i) => i.priority === 'MEDIUM'),
      ...strengtheningItems.filter((i) => i.priority === 'MEDIUM'),
      ...correctionItems.filter((i) => i.priority === 'MEDIUM'),
    ];

    const priorityItems = allActionable.slice(0, 5);

    // 6. Calculate Readiness State
    const readinessState = this.calculateReadinessState(
      matchAnalysis,
      confirmationItems,
      strengtheningItems,
      correctionItems
    );

    // 7. Formulate Readiness Summary Statement
    let readinessSummary = '';
    switch (readinessState) {
      case 'READY_TO_APPLY':
        readinessSummary = 'Your profile appears well-prepared and strongly aligned with this role. You are ready to proceed.';
        break;
      case 'READY_AFTER_CONFIRMATION':
        readinessSummary = 'You are close to being ready for this application. Please confirm a few unconfirmed details above.';
        break;
      case 'NEEDS_STRENGTHENING':
        readinessSummary = 'You meet key core qualifications, but strengthening a few partial experience areas will improve your application strength.';
        break;
      case 'INSUFFICIENT_INFORMATION':
      default:
        readinessSummary = 'Multiple mandatory requirements could not be confirmed from your CV. Please answer the confirmation questions.';
        break;
    }

    return {
      jobId: jobReqs.jobId,
      jobTitle: jobReqs.jobTitle,
      employer: jobReqs.employer,
      readinessState,
      readinessSummary,
      readyItems,
      confirmationItems,
      strengtheningItems,
      correctionItems,
      priorityItems,
      candidateQuestions,
      generatedAt: new Date().toISOString(),
    };
  }

  private calculateReadinessState(
    matchAnalysis: JobMatchAnalysis,
    confirmations: ReadinessItem[],
    strengthenings: ReadinessItem[],
    corrections: ReadinessItem[]
  ): ApplicationReadinessState {
    const unconfirmedMandatory = confirmations.some(
      (c) => c.priority === 'HIGH' && c.source === 'EXTRACTED_CV'
    );
    const missingMandatory = corrections.some((c) => c.priority === 'HIGH');
    const highStrengthen = strengthenings.some((s) => s.priority === 'HIGH');

    if (unconfirmedMandatory && confirmations.filter((c) => c.source === 'EXTRACTED_CV').length > 3) {
      return 'INSUFFICIENT_INFORMATION';
    }

    if (unconfirmedMandatory) {
      return 'READY_AFTER_CONFIRMATION';
    }

    if (missingMandatory || highStrengthen) {
      return 'NEEDS_STRENGTHENING';
    }

    return 'READY_TO_APPLY';
  }
}
