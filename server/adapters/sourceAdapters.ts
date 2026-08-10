import {
  Opportunity,
  SourceAdapterStatus,
  SourceTier,
  SourceType,
  JobSourceProvenance,
  FreshnessStatus,
} from '../../src/types.ts';
import { SourceRegistry } from './sourceRegistry.ts';
import pdfParse from 'pdf-parse';

export interface SourceQueryParams {
  city?: string;
  province?: string;
  category?: string;
  experience?: string;
  keywords?: string;
  page?: number;
  limit?: number;
  includeFixtures?: boolean;
  userIp?: string;
  userAgent?: string;
}

export interface ISourceAdapter {
  sourceId: string;
  sourceName: string;
  sourceTier: SourceTier;
  sourceType: SourceType;
  getStatus(): Promise<SourceAdapterStatus>;
  fetchOpportunities(params?: SourceQueryParams): Promise<Opportunity[]>;
}

/**
 * 1. DPSA Public Vacancies Adapter (Tier 1 Government)
 * Genuine live acquisition from official DPSA Public Service Vacancy Circulars (PSVC)
 */
export interface DpsaParseMetrics {
  totalParsed: number;
  validCount: number;
  rejectedCount: number;
  needsReviewCount: number;
  duplicateCount: number;
  missingTitleCount: number;
  missingDeptCount: number;
  missingRefNoCount: number;
  missingSalaryCount: number;
  missingLocationCount: number;
  missingClosingDateCount: number;
}

export function parseDpsaText(
  text: string,
  pdfUrl: string,
  circularInfo: { num: number; year: number } = { num: 0, year: 2026 }
): {
  opportunities: Opportunity[];
  metrics: DpsaParseMetrics;
  rawBlocksDetected: number;
} {
  const today = new Date().toISOString().split('T')[0];
  const items: Opportunity[] = [];
  const metrics: DpsaParseMetrics = {
    totalParsed: 0,
    validCount: 0,
    rejectedCount: 0,
    needsReviewCount: 0,
    duplicateCount: 0,
    missingTitleCount: 0,
    missingDeptCount: 0,
    missingRefNoCount: 0,
    missingSalaryCount: 0,
    missingLocationCount: 0,
    missingClosingDateCount: 0,
  };

  if (!text || text.trim().length === 0) {
    return { opportunities: items, metrics, rawBlocksDetected: 0 };
  }

  // 1. Department Tracking & Inheritance Reset across PDF text
  const deptRegex = /(?:DEPARTMENT OF [^\n\r]+|PROVINCIAL ADMINISTRATION:[^\n\r]+|GAUTENG DEPARTMENT OF [^\n\r]+|FREE STATE DEPARTMENT OF [^\n\r]+|KWAZULU-NATAL DEPARTMENT OF [^\n\r]+|WESTERN CAPE DEPARTMENT OF [^\n\r]+|EASTERN CAPE DEPARTMENT OF [^\n\r]+|LIMPOPO DEPARTMENT OF [^\n\r]+|MPUMALANGA DEPARTMENT OF [^\n\r]+|NORTH WEST DEPARTMENT OF [^\n\r]+|NORTHERN CAPE DEPARTMENT OF [^\n\r]+)/gi;
  const deptMatches = [...text.matchAll(deptRegex)];
  const deptIndexList = deptMatches.map(m => ({
    index: m.index!,
    name: m[0].trim().replace(/\s+/g, ' '),
  }));

  let topDefaultDept = 'Department of Public Service and Administration';
  if (deptIndexList.length > 0) {
    topDefaultDept = deptIndexList[0].name;
  }

  // 2. Circular-wide Closing Date
  let rawClosingDate = '';
  const closingMatch = text.match(/CLOSING DATE\s*:\s*([^\n\r]+)/i);
  if (closingMatch) {
    rawClosingDate = closingMatch[1].trim().replace(/\s+/g, ' ');
  }

  // 3. Advert Segmentation: Find POST XX/YY or POST N matches
  const postRegex = /POST\s+(\d+(?:\/\d+)?)\s*:\s*/gi;
  const postMatches = [...text.matchAll(postRegex)];
  const rawBlocksDetected = postMatches.length;

  const seenKeys = new Set<string>();

  for (let j = 0; j < postMatches.length; j++) {
    const match = postMatches[j];
    const postNumber = match[1];
    const startIndex = match.index!;
    const endIndex = j < postMatches.length - 1 ? postMatches[j + 1].index! : text.length;
    const postChunk = text.slice(startIndex, endIndex);

    metrics.totalParsed++;

    // Assign Department to nearest preceding department heading
    let department = topDefaultDept;
    for (let d = deptIndexList.length - 1; d >= 0; d--) {
      if (deptIndexList[d].index <= startIndex) {
        department = deptIndexList[d].name;
        break;
      }
    }

    if (!department || department.trim().length === 0) {
      metrics.missingDeptCount++;
    }

    // 4. Extract Title & Handle Wrapped Titles
    // Title starts right after "POST XX/YY :" and ends at the first section header marker
    const titleStartOffset = match[0].length;
    const afterPostText = postChunk.slice(titleStartOffset);

    // Stop title at next structural label
    const titleLabelStopRegex = /(?=\n\s*(?:REF NO|SALARY|CENTRE|REQUIREMENTS|DUTIES|ENQUIRIES|APPLICATIONS|CLOSING DATE)|$)/i;
    const titleStopMatch = afterPostText.match(titleLabelStopRegex);
    let titleBlock = titleStopMatch ? afterPostText.slice(0, titleStopMatch.index) : afterPostText.slice(0, 300);

    // Clean title block: replace newlines/multiple spaces with single space, strip REF NO if present
    let title = titleBlock
      .replace(/REF\s*NO[\s\S]*$/i, '')
      .replace(/SALARY[\s\S]*$/i, '')
      .replace(/CENTRE[\s\S]*$/i, '')
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/^[:\s]+|[:\s]+$/g, '');

    // Rejection rule on title:
    const isMalformedTitle =
      !title ||
      title.length < 3 ||
      title.length > 250 ||
      /REQUIREMENTS\s*:/i.test(title) ||
      /DUTIES\s*:/i.test(title) ||
      /SALARY\s*:/i.test(title) ||
      /ENQUIRIES\s*:/i.test(title);

    if (isMalformedTitle) {
      metrics.missingTitleCount++;
      metrics.rejectedCount++;
      continue; // REJECT malformed title record
    }

    // 5. Reference Number Extraction (strictly within postChunk)
    let refNo = '';
    const refMatch = postChunk.match(/REF\s*NO\s*:\s*([^\n\r]+)/i);
    if (refMatch) {
      refNo = refMatch[1].trim().replace(/\s+/g, ' ');
    } else {
      metrics.missingRefNoCount++;
    }

    // 6. Salary Extraction (strictly within postChunk)
    let salaryText = '';
    const salaryMatch = postChunk.match(/SALARY\s*:\s*([^\n\r]+)/i);
    if (salaryMatch) {
      salaryText = salaryMatch[1].trim().replace(/\s+/g, ' ');
    } else {
      metrics.missingSalaryCount++;
    }

    let minAmount: number | undefined;
    let maxAmount: number | undefined;
    if (salaryText) {
      const salaryNums = salaryText.match(/R\s*([\d\s]+)/g);
      if (salaryNums && salaryNums.length >= 1) {
        const parsed = salaryNums
          .map(s => parseInt(s.replace(/[^\d]/g, ''), 10))
          .filter(n => !isNaN(n) && n > 1000);
        if (parsed.length >= 1) minAmount = parsed[0];
        if (parsed.length >= 2) maxAmount = parsed[1];
      }
    }

    let period: 'Annual' | 'Monthly' | 'Unknown' = 'Unknown';
    if (salaryText) {
      if (/annum|year/i.test(salaryText)) period = 'Annual';
      else if (/month/i.test(salaryText)) period = 'Monthly';
    }

    // 7. Centre / Location Extraction (strictly within postChunk)
    let centreText = '';
    const centreMatch = postChunk.match(/CENTRE\s*:\s*([^\n\r]+)/i);
    if (centreMatch) {
      centreText = centreMatch[1].trim().replace(/\s+/g, ' ');
    } else {
      metrics.missingLocationCount++;
    }

    let city = 'Unknown';
    if (/Pretoria/i.test(centreText)) city = 'Pretoria';
    else if (/Johannesburg/i.test(centreText)) city = 'Johannesburg';
    else if (/Cape Town/i.test(centreText)) city = 'Cape Town';
    else if (/Durban/i.test(centreText)) city = 'Durban';
    else if (/Bloemfontein/i.test(centreText)) city = 'Bloemfontein';
    else if (/Polokwane/i.test(centreText)) city = 'Polokwane';
    else if (/Nelspruit|Mbombela/i.test(centreText)) city = 'Mbombela';
    else if (/Pietermaritzburg/i.test(centreText)) city = 'Pietermaritzburg';
    else if (/Kimberley/i.test(centreText)) city = 'Kimberley';
    else if (/Mahikeng|Mmabatho/i.test(centreText)) city = 'Mahikeng';
    else if (/Bisho|Bhisho/i.test(centreText)) city = 'Bhisho';

    let province = 'Unknown';
    if (/Gauteng/i.test(centreText) || /Gauteng/i.test(department)) province = 'Gauteng';
    else if (/Western Cape/i.test(centreText) || /Western Cape/i.test(department)) province = 'Western Cape';
    else if (/KwaZulu-Natal|KZN/i.test(centreText) || /KwaZulu-Natal/i.test(department)) province = 'KwaZulu-Natal';
    else if (/Eastern Cape/i.test(centreText) || /Eastern Cape/i.test(department)) province = 'Eastern Cape';
    else if (/Limpopo/i.test(centreText) || /Limpopo/i.test(department)) province = 'Limpopo';
    else if (/Mpumalanga/i.test(centreText) || /Mpumalanga/i.test(department)) province = 'Mpumalanga';
    else if (/Free State/i.test(centreText) || /Free State/i.test(department)) province = 'Free State';
    else if (/North West/i.test(centreText) || /North West/i.test(department)) province = 'North West';
    else if (/Northern Cape/i.test(centreText) || /Northern Cape/i.test(department)) province = 'Northern Cape';

    // 8. Requirements & Duties Section Boundaries
    let reqs: string[] = [];
    const reqMatch = postChunk.match(/REQUIREMENTS\s*:\s*([\s\S]*?)(?=\n\s*(?:DUTIES|ENQUIRIES|APPLICATIONS|NOTE|CLOSING DATE|POST\s+\d+)|$)/i);
    if (reqMatch) {
      reqs = reqMatch[1]
        .trim()
        .split(/\.\s+|\n+/)
        .map(s => s.trim().replace(/\s+/g, ' '))
        .filter(s => s.length > 5);
    }

    let duties: string[] = [];
    const dutyMatch = postChunk.match(/DUTIES\s*:\s*([\s\S]*?)(?=\n\s*(?:ENQUIRIES|APPLICATIONS|NOTE|REQUIREMENTS|CLOSING DATE|POST\s+\d+)|$)/i);
    if (dutyMatch) {
      duties = dutyMatch[1]
        .trim()
        .split(/\.\s+|\n+/)
        .map(s => s.trim().replace(/\s+/g, ' '))
        .filter(s => s.length > 5);
    }

    // 9. Enquiries & Applications
    let enquiries = '';
    const enqMatch = postChunk.match(/ENQUIRIES\s*:\s*([^\n\r]+)/i);
    if (enqMatch) enquiries = enqMatch[1].trim().replace(/\s+/g, ' ');

    let applications = '';
    const appMatch = postChunk.match(/APPLICATIONS\s*:\s*([^\n\r]+)/i);
    if (appMatch) applications = appMatch[1].trim().replace(/\s+/g, ' ');

    // 10. Post-specific or Circular Closing Date
    let postClosingDate = rawClosingDate;
    const postClosingMatch = postChunk.match(/CLOSING DATE\s*:\s*([^\n\r]+)/i);
    if (postClosingMatch) {
      postClosingDate = postClosingMatch[1].trim().replace(/\s+/g, ' ');
    }

    if (!postClosingDate) {
      metrics.missingClosingDateCount++;
    }

    let appUrl = pdfUrl;
    const urlInApp = applications.match(/(https?:\/\/[^\s]+)/i);
    if (urlInApp) appUrl = urlInApp[1];

    // Duplicate detection key
    const dedupeKey = refNo
      ? `${department}::${refNo}`.toLowerCase()
      : `${department}::${title}::${centreText}`.toLowerCase();

    if (seenKeys.has(dedupeKey)) {
      metrics.duplicateCount++;
    }
    seenKeys.add(dedupeKey);

    const oppId = `dpsa_${circularInfo.year}_${circularInfo.num}_post_${postNumber.replace('/', '_')}`;

    const prov: JobSourceProvenance = {
      sourceId: 'dpsa_gov_za',
      sourceName: 'DPSA Public Service Vacancies',
      sourceTier: 1,
      sourceType: 'GOVERNMENT',
      originalListingId: refNo || postNumber,
      originalUrl: pdfUrl,
      employerName: department,
      publicationDate: today,
      lastVerifiedDate: today,
      lastSeenAt: today,
      expiresAt: postClosingDate || undefined,
      sourceStatus: 'LIVE_EXTERNAL',
      verificationStatus: 'UNVERIFIED',
      destinationStatus: 'LISTING_ONLY',
      freshnessStatus: 'NEW',
      applicationDestination: appUrl,
      isRealVerified: false,
      isFixture: false,
      isLive: true,
      attributionRequired: false,
    };

    const item: Opportunity = {
      id: oppId,
      title,
      employer: department,
      location: {
        city,
        province,
        regionType: 'LOCAL',
        country: 'South Africa',
        rawLocationText: centreText || undefined,
      },
      jobCategory: 'Administration & Clerical',
      employmentType: 'Unknown',
      experienceLevel: 'Unknown',
      qualificationRequirement: reqs.length > 0 ? reqs[0] : 'NOT_SPECIFIED',
      salary: salaryText
        ? {
            formatted: salaryText,
            period,
            minAmount,
            maxAmount,
            currency: 'ZAR',
          }
        : undefined,
      summary: `${title} at ${department}${centreText ? ' (' + centreText + ')' : ''}`,
      fullDescription: `Department: ${department}\nCentre: ${centreText || 'Not specified'}\nRef No: ${
        refNo || 'Not specified'
      }\n\nRequirements:\n${reqs.join('\n')}\n\nDuties:\n${duties.join('\n')}\n\nEnquiries: ${enquiries}`,
      requirements: reqs,
      responsibilities: duties,
      skillsRequired: [],
      closingDate: postClosingDate || undefined,
      postedAt: today,
      updatedAt: today,
      sourceProvenance: prov,
      isFixture: false,
      isLive: true,
    };

    metrics.validCount++;
    items.push(item);
  }

  return { opportunities: items, metrics, rawBlocksDetected };
}

export class DpsaPublicVacanciesAdapter implements ISourceAdapter {
  sourceId = 'dpsa_gov_za';
  sourceName = 'DPSA Public Service Vacancies';
  sourceTier: SourceTier = 1;
  sourceType: SourceType = 'GOVERNMENT';

  async getStatus(): Promise<SourceAdapterStatus> {
    return 'LIVE_EXTERNAL';
  }

  async fetchOpportunities(params?: SourceQueryParams): Promise<Opportunity[]> {
    const registry = SourceRegistry.getInstance();

    try {
      // 1. Fetch official DPSA circular index page
      const indexUrl = 'https://www.dpsa.gov.za/newsroom/psvc/';
      const indexRes = await fetch(indexUrl, {
        headers: {
          'User-Agent': 'JobL-TruthConsolidation-Engine/1.0 (+https://jobl.co.za)',
        },
      });

      if (!indexRes.ok) {
        throw new Error(`DPSA index returned HTTP ${indexRes.status}`);
      }

      const indexHtml = await indexRes.text();

      // 2. Discover active circular pages (e.g. /newsroom/psvc/circular-28-of-2026/)
      const circRegex = /href=['"](\/newsroom\/psvc\/circular-(\d+)-of-(\d+)\/)['"]/gi;
      const matches = [...indexHtml.matchAll(circRegex)];
      if (matches.length === 0) {
        throw new Error('No circular links discovered on DPSA index page');
      }

      const circulars = matches
        .map(m => ({
          url: 'https://www.dpsa.gov.za' + m[1],
          num: parseInt(m[2], 10),
          year: parseInt(m[3], 10),
        }))
        .sort((a, b) => b.year - a.year || b.num - a.num);

      const latestCirc = circulars[0];

      // 3. Fetch latest circular page to discover annexure PDF links
      const detailRes = await fetch(latestCirc.url, {
        headers: {
          'User-Agent': 'JobL-TruthConsolidation-Engine/1.0 (+https://jobl.co.za)',
        },
      });

      if (!detailRes.ok) {
        throw new Error(`DPSA circular ${latestCirc.num}/${latestCirc.year} detail returned HTTP ${detailRes.status}`);
      }

      const detailHtml = await detailRes.text();

      // Find annexure PDF links (e.g. https://www.dpsa.gov.za/dpsa2g/documents/vacancies/2026/28/a.pdf)
      const pdfRegex = /href=['"](https?:\/\/www\.dpsa\.gov\.za\/dpsa2g\/documents\/vacancies\/\d+\/\d+\/[a-z]\.pdf)['"]/gi;
      const pdfMatches = [...detailHtml.matchAll(pdfRegex)];
      const pdfUrls = Array.from(new Set(pdfMatches.map(m => m[1])));

      if (pdfUrls.length === 0) {
        throw new Error(`No annexure PDF links discovered for DPSA circular ${latestCirc.num}/${latestCirc.year}`);
      }

      const allOpportunities: Opportunity[] = [];

      // 4. Download and parse Annexure PDFs in parallel batches of 6
      const batchSize = 6;
      for (let i = 0; i < pdfUrls.length; i += batchSize) {
        const batchUrls = pdfUrls.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batchUrls.map(async pdfUrl => {
            try {
              const pdfRes = await fetch(pdfUrl, {
                headers: {
                  'User-Agent': 'JobL-TruthConsolidation-Engine/1.0 (+https://jobl.co.za)',
                },
              });

              if (!pdfRes.ok) return [];

              const buffer = await pdfRes.arrayBuffer();
              const parsedPdf = await pdfParse(Buffer.from(buffer));

              const { opportunities } = parseDpsaText(parsedPdf.text, pdfUrl, {
                num: latestCirc.num,
                year: latestCirc.year,
              });

              return opportunities;
            } catch (pdfErr) {
              return [];
            }
          })
        );

        for (const pdfItems of batchResults) {
          allOpportunities.push(...pdfItems);
        }
      }

      // Filter by query params if present
      let filtered = allOpportunities;

      if (params?.city) {
        const queryCity = params.city.toLowerCase();
        filtered = filtered.filter(
          o =>
            o.location.city.toLowerCase().includes(queryCity) ||
            (o.location.rawLocationText && o.location.rawLocationText.toLowerCase().includes(queryCity))
        );
      }

      if (params?.province) {
        const queryProv = params.province.toLowerCase();
        filtered = filtered.filter(
          o =>
            o.location.province.toLowerCase().includes(queryProv) ||
            (o.location.rawLocationText && o.location.rawLocationText.toLowerCase().includes(queryProv))
        );
      }

      registry.recordRequest(this.sourceId, true, filtered.length, allOpportunities.length, 0);
      return filtered;
    } catch (err: any) {
      registry.recordRequest(this.sourceId, false, 0, 0, 0);
      // STRICT NO-FALLBACK: Return [] if live acquisition fails
      return [];
    }
  }
}

/**
 * 2. Department of Employment & Labour Adapter (Tier 1 Government)
 */
export class DelLabourVacanciesAdapter implements ISourceAdapter {
  sourceId = 'labour_gov_za';
  sourceName = 'Dept of Employment & Labour Portal';
  sourceTier: SourceTier = 1;
  sourceType: SourceType = 'GOVERNMENT';

  async getStatus(): Promise<SourceAdapterStatus> {
    return 'STATIC_FIXTURE';
  }

  async fetchOpportunities(params?: SourceQueryParams): Promise<Opportunity[]> {
    const today = new Date().toISOString().split('T')[0];
    const registry = SourceRegistry.getInstance();

    const item: Opportunity = {
      id: 'del_2026_08_02',
      title: 'General Support Worker / Grounds Assistant',
      employer: 'Department of Employment and Labour',
      location: {
        city: 'Johannesburg',
        province: 'Gauteng',
        suburbOrTownship: 'Marshalltown',
        regionType: 'LOCAL',
        country: 'South Africa',
      },
      jobCategory: 'General Worker',
      employmentType: 'Full-time',
      experienceLevel: 'No experience',
      qualificationRequirement: 'Grade 10 or Grade 12',
      salary: {
        formatted: 'R125,373 – R147,678 per annum',
        period: 'Annual',
        minAmount: 125373,
        maxAmount: 147678,
        currency: 'ZAR',
      },
      summary: 'General cleaning, building maintenance, groundskeeping, and movement of equipment at the labour centre.',
      fullDescription: 'Duties include cleaning of offices, corridors and restrooms, routine garden maintenance, moving furniture and records boxes, and reporting building defects. No prior work experience is necessary; basic literacy is required.',
      requirements: [
        'Grade 10 (Standard 8) or Grade 12',
        'Physical ability to perform manual work',
        'Reliable and trustworthy',
        'South African citizenship or valid work authorization',
      ],
      responsibilities: [
        'Perform daily cleaning of designated office blocks and public waiting areas',
        'Assist with garden maintenance, lawn trimming, and litter removal',
        'Help transport filing boxes and office supplies when instructed',
        'Report safety hazards and plumbing/electrical faults to supervisor',
      ],
      skillsRequired: ['Cleaning', 'Gardening', 'Physical Stamina', 'Teamwork'],
      closingDate: '2026-08-28',
      postedAt: '2026-08-03',
      updatedAt: today,
      sourceProvenance: {
        sourceId: this.sourceId,
        sourceName: this.sourceName,
        sourceTier: 1,
        sourceType: 'GOVERNMENT',
        originalListingId: 'VAC-DEL-2026-0912',
        originalUrl: 'https://www.labour.gov.za/vacancies/VAC-DEL-2026-0912',
        employerName: 'Department of Employment and Labour',
        publicationDate: '2026-08-03',
        lastVerifiedDate: today,
        lastSeenAt: today,
        expiresAt: '2026-08-28',
        sourceStatus: 'STATIC_FIXTURE',
        verificationStatus: 'UNVERIFIED',
        destinationStatus: 'VERIFIED',
        freshnessStatus: 'NEW',
        applicationDestination: 'https://www.labour.gov.za/vacancies/VAC-DEL-2026-0912/apply',
        isRealVerified: false,
        isFixture: true,
        isLive: false,
        attributionRequired: false,
      },
      isFixture: true,
      isLive: false,
    };

    registry.recordRequest(this.sourceId, true, 1, 0, 0);
    return [item];
  }
}

/**
 * 3. SA Youth / YES Youth Network Adapter (Tier 1 Official Youth Network)
 */
export class SayouthMobiAdapter implements ISourceAdapter {
  sourceId = 'sayouth_mobi';
  sourceName = 'SA Youth / YES Network Portal';
  sourceTier: SourceTier = 1;
  sourceType: SourceType = 'OFFICIAL_EMPLOYER';

  async getStatus(): Promise<SourceAdapterStatus> {
    return 'STATIC_FIXTURE';
  }

  async fetchOpportunities(params?: SourceQueryParams): Promise<Opportunity[]> {
    const today = new Date().toISOString().split('T')[0];
    const registry = SourceRegistry.getInstance();

    const item: Opportunity = {
      id: 'sayouth_2026_08_03',
      title: 'Warehouse & Stock Assistant (YES 12-Month Internship)',
      employer: 'Imperial Logistics / YES Youth Network',
      location: {
        city: 'Soweto',
        province: 'Gauteng',
        suburbOrTownship: 'Baragwanath Industrial',
        regionType: 'LOCAL',
        country: 'South Africa',
      },
      jobCategory: 'Warehouse & Logistics',
      employmentType: 'Learnership',
      experienceLevel: 'No experience',
      qualificationRequirement: 'Matric / N3 Certificate (Ages 18 – 29)',
      salary: {
        formatted: 'R4,500 monthly stipend',
        period: 'Stipend',
        minAmount: 4500,
        maxAmount: 4500,
        currency: 'ZAR',
      },
      summary: '12-month work experience opportunity for unemployed youth aged 18 to 29 in warehouse receiving, picking, and stock taking.',
      fullDescription: 'Imperial Logistics in partnership with the Youth Employment Service (YES) offers a structured 12-month workplace experience program. Candidates will receive accredited workplace training, mentorship, monthly stipend, and practical exposure to inventory control, stock scanning, picking/packing, and dispatch operations.',
      requirements: [
        'South African youth aged between 18 and 29 years old',
        'Matric / Grade 12 certificate',
        'Currently unemployed and not currently enrolled in full-time tertiary study',
        'Living in or near Soweto / Johannesburg South',
      ],
      responsibilities: [
        'Assist receiving team with barcode scanning and unpacking stock',
        'Pick items according to dispatch invoices accurately',
        'Perform weekly stock counts and flag inventory discrepancies',
        'Maintain safe, clean warehouse aisle conditions',
      ],
      skillsRequired: ['Barcode Scanning', 'Stock Control', 'Attention to Detail', 'Basic Math'],
      closingDate: '2026-08-25',
      postedAt: '2026-08-02',
      updatedAt: today,
      sourceProvenance: {
        sourceId: this.sourceId,
        sourceName: this.sourceName,
        sourceTier: 1,
        sourceType: 'OFFICIAL_EMPLOYER',
        originalListingId: 'SAYOUTH-WH-2026-44',
        originalUrl: 'https://sayouth.mobi/opportunities/SAYOUTH-WH-2026-44',
        employerName: 'Imperial Logistics / YES Youth Network',
        publicationDate: '2026-08-02',
        lastVerifiedDate: today,
        lastSeenAt: today,
        expiresAt: '2026-08-25',
        sourceStatus: 'STATIC_FIXTURE',
        verificationStatus: 'UNVERIFIED',
        destinationStatus: 'VERIFIED',
        freshnessStatus: 'NEW',
        applicationDestination: 'https://sayouth.mobi/opportunities/SAYOUTH-WH-2026-44/apply',
        isRealVerified: false,
        isFixture: true,
        isLive: false,
        attributionRequired: false,
      },
      isFixture: true,
      isLive: false,
    };

    registry.recordRequest(this.sourceId, true, 1, 0, 0);
    return [item];
  }
}

/**
 * 4. CCI South Africa Contact Centres Adapter (Tier 1 Official BPO Employer)
 */
export class CciSouthAfricaAdapter implements ISourceAdapter {
  sourceId = 'cci_sa_careers';
  sourceName = 'CCI South Africa Career Portal';
  sourceTier: SourceTier = 1;
  sourceType: SourceType = 'OFFICIAL_EMPLOYER';

  async getStatus(): Promise<SourceAdapterStatus> {
    return 'STATIC_FIXTURE';
  }

  async fetchOpportunities(params?: SourceQueryParams): Promise<Opportunity[]> {
    const today = new Date().toISOString().split('T')[0];
    const registry = SourceRegistry.getInstance();

    const items: Opportunity[] = [
      {
        id: 'cci_2026_08_04',
        title: 'Customer Service Representative (Inbound & Chat)',
        employer: 'CCI South Africa',
        location: {
          city: 'Durban',
          province: 'KwaZulu-Natal',
          suburbOrTownship: 'Umhlanga Ridgeside',
          regionType: 'LOCAL',
          country: 'South Africa',
          remoteStatus: 'ON_SITE',
          relocationStatus: 'NOT_ALLOWED',
          geographicEligibility: { isSouthAfricaEligible: true, isLocalOnly: true, allowedCountries: ['South Africa'] },
        },
        jobCategory: 'Call Centre & Customer Service',
        employmentType: 'Full-time',
        experienceLevel: 'Entry level',
        qualificationRequirement: 'Grade 12 (Matric)',
        salary: {
          formatted: 'R6,800 – R8,500 monthly + shift performance allowance',
          period: 'Monthly',
          minAmount: 6800,
          maxAmount: 8500,
          currency: 'ZAR',
        },
        summary: 'Handle inbound customer support queries via voice and web chat for international retail and telecommunication clients.',
        fullDescription: 'CCI South Africa is hiring Customer Service Representatives for its state-of-the-art Umhlanga campus. Candidates will receive 3 weeks of paid accredited call centre academy training. Role involves resolving customer account inquiries, processing service requests, and maintaining high customer satisfaction scores.',
        requirements: [
          'Grade 12 Certificate (Matric)',
          'Fluent in spoken and written English with good pronunciation',
          'Computer literate with minimum 30 wpm typing speed',
          'Clear credit and criminal record',
          'Willingness to work rotational shifts',
        ],
        responsibilities: [
          'Answer incoming customer calls and digital chat messages politely and professionally',
          'Log issues into CRM software and follow up on unresolved tickets',
          'Provide accurate product and billing information',
        ],
        skillsRequired: ['Customer Support', 'Active Listening', 'Computer Literacy', 'Problem Solving'],
        closingDate: '2026-09-05',
        postedAt: '2026-08-04',
        updatedAt: today,
        sourceProvenance: {
          sourceId: this.sourceId,
          sourceName: this.sourceName,
          sourceTier: 1,
          sourceType: 'OFFICIAL_EMPLOYER',
          originalListingId: 'CCI-DBN-2026-88',
          originalUrl: 'https://ccisouthafrica.com/careers/CCI-DBN-2026-88',
          sourceListingUrl: 'https://ccisouthafrica.com/careers/CCI-DBN-2026-88',
          employerName: 'CCI South Africa',
          publicationDate: '2026-08-04',
          lastVerifiedDate: today,
          lastSeenAt: today,
          expiresAt: '2026-09-05',
          sourceStatus: 'STATIC_FIXTURE',
          verificationStatus: 'UNVERIFIED',
          destinationStatus: 'VERIFIED',
          freshnessStatus: 'NEW',
          applicationDestination: 'https://ccisouthafrica.com/careers/CCI-DBN-2026-88/apply',
          applicationUrl: 'https://ccisouthafrica.com/careers/CCI-DBN-2026-88/apply',
          isRealVerified: false,
          isFixture: true,
          isLive: false,
          attributionRequired: false,
        },
        isFixture: true,
        isLive: false,
      },
      {
        id: 'cci_2026_08_09',
        title: 'Customer Experience Consultant (Inbound Call Centre)',
        employer: 'CCI South Africa',
        location: {
          city: 'Cape Town',
          province: 'Western Cape',
          suburbOrTownship: 'Century City',
          regionType: 'LOCAL',
          country: 'South Africa',
          remoteStatus: 'ON_SITE',
          relocationStatus: 'NOT_ALLOWED',
          geographicEligibility: { isSouthAfricaEligible: true, isLocalOnly: true, allowedCountries: ['South Africa'] },
        },
        jobCategory: 'Call Centre & Customer Service',
        employmentType: 'Full-time',
        experienceLevel: 'Entry level',
        qualificationRequirement: 'Grade 12 (Matric)',
        salary: {
          formatted: 'R7,200 – R9,000 monthly',
          period: 'Monthly',
          minAmount: 7200,
          maxAmount: 9000,
          currency: 'ZAR',
        },
        summary: 'Deliver high quality telephone and digital chat customer support for global retail and ecommerce brands.',
        fullDescription: 'CCI South Africa Cape Town is seeking energetic Customer Experience Consultants for its Century City contact centre. Full training provided.',
        requirements: ['Grade 12 / Matric', 'Excellent spoken English', 'Basic computer skills'],
        responsibilities: ['Assist customers with order tracking and account inquiries', 'Log call outcomes into ticketing platform'],
        skillsRequired: ['Call Centre', 'Customer Service', 'Typing', 'Problem Solving'],
        closingDate: '2026-09-08',
        postedAt: '2026-08-04',
        updatedAt: today,
        sourceProvenance: {
          sourceId: this.sourceId,
          sourceName: this.sourceName,
          sourceTier: 1,
          sourceType: 'OFFICIAL_EMPLOYER',
          originalListingId: 'CCI-CPT-2026-99',
          originalUrl: 'https://ccisouthafrica.com/careers/CCI-CPT-2026-99',
          sourceListingUrl: 'https://ccisouthafrica.com/careers/CCI-CPT-2026-99',
          employerName: 'CCI South Africa',
          publicationDate: '2026-08-04',
          lastVerifiedDate: today,
          lastSeenAt: today,
          expiresAt: '2026-09-08',
          sourceStatus: 'STATIC_FIXTURE',
          verificationStatus: 'UNVERIFIED',
          destinationStatus: 'VERIFIED',
          freshnessStatus: 'NEW',
          applicationDestination: 'https://ccisouthafrica.com/careers/CCI-CPT-2026-99/apply',
          applicationUrl: 'https://ccisouthafrica.com/careers/CCI-CPT-2026-99/apply',
          isRealVerified: false,
          isFixture: true,
          isLive: false,
          attributionRequired: false,
        },
        isFixture: true,
        isLive: false,
      },
    ];

    registry.recordRequest(this.sourceId, true, items.length, 0, 0);
    return items;
  }
}

/**
 * 5. Official Retail & Corporate Employers Adapter (Shoprite, Capitec, Transnet, Vodacom, Massmart)
 */
export class RetailCorporateAdapter implements ISourceAdapter {
  sourceId = 'retail_official_portals';
  sourceName = 'Official Employer Portals (Shoprite, Capitec, Transnet, Vodacom, Massmart)';
  sourceTier: SourceTier = 1;
  sourceType: SourceType = 'OFFICIAL_EMPLOYER';

  async getStatus(): Promise<SourceAdapterStatus> {
    return 'STATIC_FIXTURE';
  }

  async fetchOpportunities(params?: SourceQueryParams): Promise<Opportunity[]> {
    const today = new Date().toISOString().split('T')[0];
    const registry = SourceRegistry.getInstance();

    const items: Opportunity[] = [
      {
        id: 'shoprite_2026_08_05',
        title: 'Retail Store Cashier / Till Packer',
        employer: 'Shoprite Group',
        location: {
          city: 'Soweto',
          province: 'Gauteng',
          suburbOrTownship: 'Jabulani Mall',
          regionType: 'LOCAL',
          country: 'South Africa',
          remoteStatus: 'ON_SITE',
          relocationStatus: 'NOT_ALLOWED',
          geographicEligibility: { isSouthAfricaEligible: true, isLocalOnly: true, allowedCountries: ['South Africa'] },
        },
        jobCategory: 'Retail & Cashier',
        employmentType: 'Full-time',
        experienceLevel: 'No experience',
        qualificationRequirement: 'Grade 11 or Grade 12',
        salary: {
          formatted: 'R27.50 – R32.00 per hour',
          period: 'Hourly',
          minAmount: 27.5,
          maxAmount: 32.0,
          currency: 'ZAR',
        },
        summary: 'Operate point of sale registers, scan goods accurately, process cash/card transactions, and assist customers at checkout.',
        fullDescription: 'Shoprite Supermarkets is recruiting Cashiers for our Soweto Jabulani Mall store. The candidate must possess basic numerical aptitude, friendly customer relations skills, and the capability to manage point-of-sale equipment accurately.',
        requirements: [
          'Grade 11 or Grade 12 certificate',
          'Basic numeracy and cash-handling aptitude',
          'Friendly customer service attitude',
          'Ability to work weekends and public holidays on shift rotation',
        ],
        responsibilities: [
          'Scan customer items swiftly and accurately at point-of-sale counter',
          'Process cash, debit, credit card, and social grant payout transactions',
          'Verify cash float at start and end of shift',
          'Maintain clean, organized till checkout counter',
        ],
        skillsRequired: ['POS Operation', 'Cash Handling', 'Customer Relations', 'Basic Arithmetic'],
        closingDate: '2026-08-30',
        postedAt: '2026-08-01',
        updatedAt: today,
        sourceProvenance: {
          sourceId: this.sourceId,
          sourceName: this.sourceName,
          sourceTier: 1,
          sourceType: 'OFFICIAL_EMPLOYER',
          originalListingId: 'SHOP-SOW-2026-004',
          originalUrl: 'https://careers.shoprite.co.za/job/SHOP-SOW-2026-004',
          sourceListingUrl: 'https://careers.shoprite.co.za/job/SHOP-SOW-2026-004',
          employerName: 'Shoprite Group',
          publicationDate: '2026-08-01',
          lastVerifiedDate: today,
          lastSeenAt: today,
          expiresAt: '2026-08-30',
          sourceStatus: 'STATIC_FIXTURE',
          verificationStatus: 'UNVERIFIED',
          destinationStatus: 'VERIFIED',
          freshnessStatus: 'NEW',
          applicationDestination: 'https://careers.shoprite.co.za/job/SHOP-SOW-2026-004/apply',
          applicationUrl: 'https://careers.shoprite.co.za/job/SHOP-SOW-2026-004/apply',
          isRealVerified: false,
          isFixture: true,
          isLive: false,
          attributionRequired: false,
        },
        isFixture: true,
        isLive: false,
      },
      {
        id: 'massmart_2026_08_10',
        title: 'Warehouse Logistics & Stock Assistant',
        employer: 'Massmart / Makro Distribution',
        location: {
          city: 'Durban',
          province: 'KwaZulu-Natal',
          suburbOrTownship: 'Riverhorse Valley',
          regionType: 'LOCAL',
          country: 'South Africa',
          remoteStatus: 'ON_SITE',
          relocationStatus: 'NOT_ALLOWED',
          geographicEligibility: { isSouthAfricaEligible: true, isLocalOnly: true, allowedCountries: ['South Africa'] },
        },
        jobCategory: 'Warehouse & Logistics',
        employmentType: 'Full-time',
        experienceLevel: 'Entry level',
        qualificationRequirement: 'Grade 12 / Matric',
        salary: {
          formatted: 'R7,500 – R9,200 per month',
          period: 'Monthly',
          minAmount: 7500,
          maxAmount: 9200,
          currency: 'ZAR',
        },
        summary: 'Receive stock shipments, operate handheld RF barcode scanners, pick store orders, and pack outbound delivery pallets.',
        fullDescription: 'Makro Distribution Depot in Riverhorse Valley, Durban is hiring Warehouse Stock Assistants. You will assist with inbound receiving, inventory stock counts, order picking, and dispatch staging.',
        requirements: ['Grade 12 Certificate', 'Physical stamina for inventory handling', 'Clear criminal record'],
        responsibilities: ['Offload delivery containers and verify SKU quantities', 'Pick customer orders using RF handheld scanners'],
        skillsRequired: ['Stock Control', 'RF Scanning', 'Warehouse Safety', 'Order Picking'],
        closingDate: '2026-08-31',
        postedAt: '2026-08-02',
        updatedAt: today,
        sourceProvenance: {
          sourceId: this.sourceId,
          sourceName: this.sourceName,
          sourceTier: 1,
          sourceType: 'OFFICIAL_EMPLOYER',
          originalListingId: 'MAK-DBN-2026-15',
          originalUrl: 'https://careers.massmart.co.za/job/MAK-DBN-2026-15',
          sourceListingUrl: 'https://careers.massmart.co.za/job/MAK-DBN-2026-15',
          employerName: 'Massmart / Makro Distribution',
          publicationDate: '2026-08-02',
          lastVerifiedDate: today,
          lastSeenAt: today,
          expiresAt: '2026-08-31',
          sourceStatus: 'STATIC_FIXTURE',
          verificationStatus: 'UNVERIFIED',
          destinationStatus: 'VERIFIED',
          freshnessStatus: 'NEW',
          applicationDestination: 'https://careers.massmart.co.za/job/MAK-DBN-2026-15/apply',
          applicationUrl: 'https://careers.massmart.co.za/job/MAK-DBN-2026-15/apply',
          isRealVerified: false,
          isFixture: true,
          isLive: false,
          attributionRequired: false,
        },
        isFixture: true,
        isLive: false,
      },
      {
        id: 'capitec_2026_08_06',
        title: 'Bank Service Consultant (Branch Assistant)',
        employer: 'Capitec Bank',
        location: {
          city: 'Khayelitsha',
          province: 'Western Cape',
          suburbOrTownship: 'Town Two',
          regionType: 'LOCAL',
          country: 'South Africa',
        },
        jobCategory: 'Administration & Clerical',
        employmentType: 'Full-time',
        experienceLevel: 'Entry level',
        qualificationRequirement: 'Grade 12 with Math / Math Literacy',
        salary: {
          formatted: 'R9,500 – R12,000 per month',
          period: 'Monthly',
          minAmount: 9500,
          maxAmount: 12000,
          currency: 'ZAR',
        },
        summary: 'Welcome branch clients, guide customers on self-service banking app usage, and assist with account maintenance.',
        fullDescription: 'Capitec Bank is seeking energetic Service Consultants for our Khayelitsha branch. You will deliver face-to-face service excellence, assist clients with digital banking onboarding, issue banking cards, and perform routine account administration.',
        requirements: [
          'Grade 12 with Math or Math Literacy passed',
          'Minimum 1 year customer service experience (retail/hospitality/contact centre)',
          'Clear credit record and clean criminal history',
          'Bi-lingual: English plus isiXhosa preferred',
        ],
        responsibilities: [
          'Greet branch clients and manage queue flow at floor level',
          'Educate clients on Capitec remote banking app and ATM transactions',
          'Assist clients with card replacements and account statement printouts',
        ],
        skillsRequired: ['Client Service', 'Digital Literacy', 'Problem Solving', 'Communication'],
        closingDate: '2026-08-29',
        postedAt: '2026-08-02',
        updatedAt: today,
        sourceProvenance: {
          sourceId: this.sourceId,
          sourceName: this.sourceName,
          sourceTier: 1,
          sourceType: 'OFFICIAL_EMPLOYER',
          originalListingId: 'CAP-KHY-2026-102',
          originalUrl: 'https://careers.capitecbank.co.za/job/CAP-KHY-2026-102',
          employerName: 'Capitec Bank',
          publicationDate: '2026-08-02',
          lastVerifiedDate: today,
          lastSeenAt: today,
          expiresAt: '2026-08-29',
          sourceStatus: 'STATIC_FIXTURE',
          verificationStatus: 'UNVERIFIED',
          destinationStatus: 'VERIFIED',
          freshnessStatus: 'NEW',
          applicationDestination: 'https://careers.capitecbank.co.za/job/CAP-KHY-2026-102/apply',
          isRealVerified: false,
          isFixture: true,
          isLive: false,
          attributionRequired: false,
        },
        isFixture: true,
        isLive: false,
      },
      {
        id: 'transnet_2026_08_07',
        title: 'General Maintenance Assistant (Freight Rail)',
        employer: 'Transnet SOC Ltd',
        location: {
          city: 'Gqeberha',
          province: 'Eastern Cape',
          suburbOrTownship: 'Deal Party',
          regionType: 'LOCAL',
          country: 'South Africa',
        },
        jobCategory: 'General Worker',
        employmentType: 'Full-time',
        experienceLevel: 'No experience',
        qualificationRequirement: 'Grade 10 or N2 Technical',
        salary: {
          formatted: 'R142,000 – R165,000 per annum',
          period: 'Annual',
          minAmount: 142000,
          maxAmount: 165000,
          currency: 'ZAR',
        },
        summary: 'Assist technical artisans with rail track inspections, depot cleaning, tool handling, and general infrastructure maintenance.',
        fullDescription: 'Transnet Freight Rail is recruiting General Maintenance Assistants for the Port Elizabeth / Gqeberha railway corridor depot. Successful candidates will support trade artisans in routine track clearing, servicing machinery, loading workshop equipment, and maintaining depot safety standards.',
        requirements: [
          'Grade 10 (Standard 8) or N2 Technical Certificate',
          'Medical fitness for heavy industrial working conditions',
          'Safety conscious and willing to work outdoors',
          'South African ID holder',
        ],
        responsibilities: [
          'Clean railway workshop bays and store tools properly after maintenance shifts',
          'Assist track teams with carrying timber sleepers and rail fastenings',
          'Operate basic hand power tools under artisan supervision',
        ],
        skillsRequired: ['Hand Tools', 'Safety Awareness', 'Physical Stamina', 'Teamwork'],
        closingDate: '2026-08-27',
        postedAt: '2026-08-03',
        updatedAt: today,
        sourceProvenance: {
          sourceId: this.sourceId,
          sourceName: this.sourceName,
          sourceTier: 1,
          sourceType: 'OFFICIAL_EMPLOYER',
          originalListingId: 'TRN-PLZ-2026-90',
          originalUrl: 'https://careers.transnet.net/job/TRN-PLZ-2026-90',
          employerName: 'Transnet SOC Ltd',
          publicationDate: '2026-08-03',
          lastVerifiedDate: today,
          lastSeenAt: today,
          expiresAt: '2026-08-27',
          sourceStatus: 'STATIC_FIXTURE',
          verificationStatus: 'UNVERIFIED',
          destinationStatus: 'VERIFIED',
          freshnessStatus: 'NEW',
          applicationDestination: 'https://careers.transnet.net/job/TRN-PLZ-2026-90/apply',
          isRealVerified: false,
          isFixture: true,
          isLive: false,
          attributionRequired: false,
        },
        isFixture: true,
        isLive: false,
      },
      {
        id: 'vodacom_2026_08_08',
        title: 'Store Sales Representative',
        employer: 'Vodacom South Africa',
        location: {
          city: 'Polokwane',
          province: 'Limpopo',
          suburbOrTownship: 'Savannah Mall',
          regionType: 'LOCAL',
          country: 'South Africa',
        },
        jobCategory: 'Sales & Promoter',
        employmentType: 'Full-time',
        experienceLevel: 'Entry level',
        qualificationRequirement: 'Grade 12 (Matric)',
        salary: {
          formatted: 'R7,000 – R9,500 monthly + sales commission',
          period: 'Monthly',
          minAmount: 7000,
          maxAmount: 9500,
          currency: 'ZAR',
        },
        summary: 'Sell mobile devices, data contracts, fiber packages, and financial products inside Vodacom store.',
        fullDescription: 'Vodacom Polokwane store is looking for driven Store Sales Representatives. You will engage store visitors, demonstrate the latest smartphones and tablets, process contract applications, and achieve monthly mobile line sales targets.',
        requirements: [
          'Grade 12 / Matric',
          'Demonstrated enthusiasm for mobile technology and smartphones',
          'Good interpersonal communication and persuasive sales skills',
          'Previous retail or promotions experience is advantageous',
        ],
        responsibilities: [
          'Advise walk-in clients on mobile voice, data, and fiber deals',
          'Process RICA verification and contract sign-up documentation',
          'Achieve individual monthly device and accessory sales targets',
        ],
        skillsRequired: ['Sales Consulting', 'RICA Processing', 'Mobile Tech Knowledge', 'Customer Engagement'],
        closingDate: '2026-08-31',
        postedAt: '2026-08-04',
        updatedAt: today,
        sourceProvenance: {
          sourceId: this.sourceId,
          sourceName: this.sourceName,
          sourceTier: 1,
          sourceType: 'OFFICIAL_EMPLOYER',
          originalListingId: 'VOD-PLK-2026-301',
          originalUrl: 'https://careers.vodacom.com/job/VOD-PLK-2026-301',
          employerName: 'Vodacom South Africa',
          publicationDate: '2026-08-04',
          lastVerifiedDate: today,
          lastSeenAt: today,
          expiresAt: '2026-08-31',
          sourceStatus: 'STATIC_FIXTURE',
          verificationStatus: 'UNVERIFIED',
          destinationStatus: 'VERIFIED',
          freshnessStatus: 'NEW',
          applicationDestination: 'https://careers.vodacom.com/job/VOD-PLK-2026-301/apply',
          isRealVerified: false,
          isFixture: true,
          isLive: false,
          attributionRequired: false,
        },
        isFixture: true,
        isLive: false,
      },
    ];

    registry.recordRequest(this.sourceId, true, items.length, 0, 0);
    return items;
  }
}

function inferCategoryFromTitle(title: string, defaultCat?: string): string {
  const t = title.toLowerCase();
  if (t.includes('cashier') || t.includes('retail') || t.includes('till') || t.includes('store associate') || t.includes('sales associate') || t.includes('shoprite')) {
    return 'Retail & Cashier';
  }
  if (t.includes('warehouse') || t.includes('stock') || t.includes('picker') || t.includes('packer') || t.includes('logistics') || t.includes('assembler') || t.includes('expeditor')) {
    return 'Warehouse & Logistics';
  }
  if (t.includes('call centre') || t.includes('customer') || t.includes('chat') || t.includes('inbound') || t.includes('hospitality')) {
    return 'Call Centre & Customer Service';
  }
  if (t.includes('clerk') || t.includes('admin') || t.includes('billing') || t.includes('debtors') || t.includes('data processor') || t.includes('assistant') || t.includes('consultant')) {
    return 'Administration & Clerical';
  }
  if (t.includes('sales') || t.includes('promoter') || t.includes('representative')) {
    return 'Sales & Promoter';
  }
  if (t.includes('engineer') || t.includes('developer') || t.includes('software') || t.includes('python') || t.includes('java')) {
    return 'IT & Software Development';
  }
  if (t.includes('grounds') || t.includes('cleaner') || t.includes('maintenance') || t.includes('general worker') || t.includes('builder') || t.includes('plumber') || t.includes('electrician')) {
    return 'General Worker';
  }
  return defaultCat || 'General Worker';
}

function isUSLocation(loc?: string): boolean {
  if (!loc) return false;
  const l = loc.toLowerCase();
  return l.includes(', md') || l.includes(', pa') || l.includes(', wv') || l.includes(', us') || l.includes('hagerstown') || l.includes('chambersburg') || l.includes('waynesboro') || l.includes('greencastle') || l.includes('martinsburg') || l.includes('walmart');
}

/**
 * 6. Adzuna Adapter (Tier 2 Authorised Aggregator)
 * Implements server-side credentials, query by location/keywords, rate-limiting, attribution
 */
export class AdzunaAdapter implements ISourceAdapter {
  sourceId = 'adzuna_sa';
  sourceName = 'Adzuna SA API';
  sourceTier: SourceTier = 2;
  sourceType: SourceType = 'AUTHORISED_AGGREGATOR';

  async getStatus(): Promise<SourceAdapterStatus> {
    return 'LIVE_EXTERNAL';
  }

  async fetchOpportunities(params?: SourceQueryParams): Promise<Opportunity[]> {
    const today = new Date().toISOString().split('T')[0];
    const registry = SourceRegistry.getInstance();

    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;

    // Check if live API call is possible
    if (appId && appKey) {
      try {
        const queryWhere = params?.city || params?.province || 'South Africa';
        const queryWhat = params?.category || params?.keywords || 'jobs';
        const page = params?.page || 1;

        const url = `https://api.adzuna.com/v1/api/jobs/za/search/${page}?app_id=${encodeURIComponent(
          appId
        )}&app_key=${encodeURIComponent(appKey)}&results_per_page=10&what=${encodeURIComponent(
          queryWhat
        )}&where=${encodeURIComponent(queryWhere)}`;

        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data.results && Array.isArray(data.results)) {
            const apiItems: Opportunity[] = data.results.map((item: any, idx: number) => {
              const cat = inferCategoryFromTitle(item.title || '', params?.category);
              const original = item.redirect_url || 'https://www.adzuna.co.za/';
              return {
                id: `adzuna_${item.id || idx}`,
                title: item.title || 'General Opportunity',
                employer: item.company?.display_name || 'Verified Employer',
                location: {
                  city: item.location?.area?.[1] || params?.city || 'Cape Town',
                  province: item.location?.area?.[0] || params?.province || 'Western Cape',
                  regionType: 'LOCAL',
                  country: 'South Africa',
                  remoteStatus: 'ON_SITE',
                  relocationStatus: 'NOT_ALLOWED',
                  geographicEligibility: { isSouthAfricaEligible: true, isLocalOnly: true, allowedCountries: ['South Africa'] },
                },
                jobCategory: cat,
                employmentType: 'Full-time',
                experienceLevel: (params?.experience as any) || 'Entry level',
                qualificationRequirement: 'Grade 12 / Relevant Qualification',
                salary: item.salary_min
                  ? {
                      formatted: `R${Math.round(item.salary_min)} – R${Math.round(
                        item.salary_max || item.salary_min * 1.2
                      )} per annum`,
                      period: 'Annual',
                      minAmount: Math.round(item.salary_min),
                      maxAmount: Math.round(item.salary_max || item.salary_min * 1.2),
                      currency: 'ZAR',
                    }
                  : undefined,
                summary: item.description ? item.description.substring(0, 200) + '...' : 'Verified position via Adzuna.',
                fullDescription: item.description || 'Full vacancy description available on official employer destination.',
                requirements: ['Grade 12 / Relevant Experience', 'Valid South African ID / Work authorization'],
                responsibilities: ['Perform assigned duties efficiently', 'Adhere to workplace guidelines'],
                skillsRequired: ['Communication', 'Reliability'],
                closingDate: item.created ? new Date(new Date(item.created).getTime() + 30 * 86400000).toISOString().split('T')[0] : '2026-09-15',
                postedAt: item.created ? item.created.split('T')[0] : today,
                updatedAt: today,
                sourceProvenance: {
                  sourceId: this.sourceId,
                  sourceName: this.sourceName,
                  sourceTier: 2,
                  sourceType: 'AUTHORISED_AGGREGATOR',
                  originalListingId: String(item.id || `adz_${idx}`),
                  originalUrl: original,
                  sourceListingUrl: original,
                  employerName: item.company?.display_name || 'Verified Employer',
                  publicationDate: item.created ? item.created.split('T')[0] : today,
                  lastVerifiedDate: today,
                  lastSeenAt: today,
                  expiresAt: '2026-09-15',
                  sourceStatus: 'LIVE_EXTERNAL',
                  verificationStatus: 'VERIFIED',
                  destinationStatus: 'VERIFIED',
                  freshnessStatus: 'NEW',
                  applicationDestination: item.redirect_url || `https://www.adzuna.co.za/details/${item.id}`,
                  applicationUrl: item.redirect_url || `https://www.adzuna.co.za/details/${item.id}`,
                  isRealVerified: true,
                  isFixture: false,
                  isLive: true,
                  attributionRequired: true,
                  attributionConfig: {
                    providerName: 'Adzuna',
                    text: 'Powered by Adzuna',
                    termsUrl: 'https://www.adzuna.co.za/',
                  },
                },
                isFixture: false,
                isLive: true,
              };
            });

            registry.recordRequest(this.sourceId, true, apiItems.length, 0, 0);
            return apiItems;
          }
        }
      } catch (e: any) {
        registry.recordRequest(this.sourceId, false, 0, 0, 0);
        return [];
      }
    }

    registry.recordRequest(this.sourceId, false, 0, 0, 0);
    return [];
  }
}

/**
 * 7. Jooble Adapter (Tier 2 Authorised Aggregator)
 */
export class JoobleAdapter implements ISourceAdapter {
  sourceId = 'jooble_sa';
  sourceName = 'Jooble REST API';
  sourceTier: SourceTier = 2;
  sourceType: SourceType = 'AUTHORISED_AGGREGATOR';

  async getStatus(): Promise<SourceAdapterStatus> {
    return 'LIVE_EXTERNAL';
  }

  async fetchOpportunities(params?: SourceQueryParams): Promise<Opportunity[]> {
    const today = new Date().toISOString().split('T')[0];
    const registry = SourceRegistry.getInstance();

    const apiKey = process.env.JOOBLE_API_KEY;

    if (apiKey) {
      try {
        const response = await fetch(`https://jooble.org/api/${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            keywords: params?.category || params?.keywords || 'jobs',
            location: (params?.city || params?.province || 'South Africa') + ', South Africa',
            page: params?.page || 1,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.jobs && Array.isArray(data.jobs)) {
            const apiItems: Opportunity[] = data.jobs
              .filter((item: any) => !isUSLocation(item.location))
              .map((item: any, idx: number) => {
                const cat = inferCategoryFromTitle(item.title || '', params?.category);
                const original = item.link || 'https://za.jooble.org/';
                return {
                  id: `jooble_${item.id || idx}`,
                  title: item.title || 'Verified Role',
                  employer: item.company || 'Verified Company',
                  location: {
                    city: item.location || params?.city || 'South Africa',
                    province: params?.province || 'Gauteng',
                    regionType: 'LOCAL',
                    country: 'South Africa',
                    remoteStatus: 'ON_SITE',
                    relocationStatus: 'NOT_ALLOWED',
                    geographicEligibility: { isSouthAfricaEligible: true, isLocalOnly: true, allowedCountries: ['South Africa'] },
                  },
                  jobCategory: cat,
                  employmentType: 'Full-time',
                  experienceLevel: (params?.experience as any) || 'Entry level',
                  qualificationRequirement: 'Grade 12 / Relevant Qualification',
                  salary: item.salary
                    ? {
                        formatted: item.salary,
                        period: 'Monthly',
                        currency: 'ZAR',
                      }
                    : undefined,
                  summary: item.snippet ? item.snippet.replace(/<[^>]+>/g, '').substring(0, 200) + '...' : 'Verified position via Jooble.',
                  fullDescription: item.snippet || 'Full details on official application destination.',
                  requirements: ['Grade 12 / Relevant Qualification', 'Valid South African ID / Work authorization'],
                  responsibilities: ['Perform core job duties as assigned by employer'],
                  skillsRequired: ['Professionalism', 'Reliability'],
                  closingDate: '2026-09-20',
                  postedAt: item.updated ? item.updated.split('T')[0] : today,
                  updatedAt: today,
                  sourceProvenance: {
                    sourceId: this.sourceId,
                    sourceName: this.sourceName,
                    sourceTier: 2,
                    sourceType: 'AUTHORISED_AGGREGATOR',
                    originalListingId: String(item.id || `joob_${idx}`),
                    originalUrl: original,
                    sourceListingUrl: original,
                    employerName: item.company || 'Verified Company',
                    publicationDate: item.updated ? item.updated.split('T')[0] : today,
                    lastVerifiedDate: today,
                    lastSeenAt: today,
                    expiresAt: '2026-09-20',
                    sourceStatus: 'LIVE_EXTERNAL',
                    verificationStatus: 'VERIFIED',
                    destinationStatus: 'VERIFIED',
                    freshnessStatus: 'NEW',
                    applicationDestination: item.link || `https://za.jooble.org/desc/${item.id}`,
                    applicationUrl: item.link || `https://za.jooble.org/desc/${item.id}`,
                    isRealVerified: true,
                    isFixture: false,
                    isLive: true,
                    attributionRequired: true,
                    attributionConfig: {
                      providerName: 'Jooble',
                      text: 'Powered by Jooble',
                      termsUrl: 'https://za.jooble.org/',
                    },
                  },
                  isFixture: false,
                  isLive: true,
                };
              });

            registry.recordRequest(this.sourceId, true, apiItems.length, 0, 0);
            return apiItems;
          }
        }
      } catch (e: any) {
        registry.recordRequest(this.sourceId, false, 0, 0, 0);
        return [];
      }
    }

    registry.recordRequest(this.sourceId, false, 0, 0, 0);
    return [];
  }
}

/**
 * 8. Careerjet Adapter (Tier 2 Authorised Aggregator)
 */
export class CareerjetAdapter implements ISourceAdapter {
  sourceId = 'careerjet_sa';
  sourceName = 'Careerjet Publisher API';
  sourceTier: SourceTier = 2;
  sourceType: SourceType = 'AUTHORISED_AGGREGATOR';

  async getStatus(): Promise<SourceAdapterStatus> {
    return 'LIVE_EXTERNAL';
  }

  async fetchOpportunities(params?: SourceQueryParams): Promise<Opportunity[]> {
    const registry = SourceRegistry.getInstance();

    // CAREERJET_AFFILIATE_ID is retained only temporarily because previous JobL versions used the wrong environment variable name.
    const apiKey = process.env.CAREERJET_API_KEY || process.env.CAREERJET_AFFILIATE_ID;
    if (!apiKey) {
      registry.recordRequest(this.sourceId, false, 0, 0, 0);
      return [];
    }

    const userIp = params?.userIp?.trim();
    const userAgent = params?.userAgent?.trim();
    if (!userIp || !userAgent) {
      registry.recordRequest(this.sourceId, false, 0, 0, 0);
      return [];
    }

    try {
      const url = new URL('https://search.api.careerjet.net/v4/query');
      url.searchParams.append('locale_code', 'en_ZA');
      url.searchParams.append('user_ip', userIp);
      url.searchParams.append('user_agent', userAgent);

      const keywords = params?.keywords || (params?.category && params.category !== 'All' && params.category !== 'All Categories' ? params.category : '');
      if (keywords) {
        url.searchParams.append('keywords', keywords);
      }

      const locParts = [params?.city, params?.province].filter(Boolean);
      if (locParts.length > 0) {
        url.searchParams.append('location', locParts.join(', '));
      }

      if (params?.page) {
        url.searchParams.append('page', String(params.page));
      }
      if (params?.limit) {
        url.searchParams.append('page_size', String(Math.min(Math.max(params.limit, 1), 99)));
      }

      const authHeader = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'User-Agent': userAgent,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        registry.recordRequest(this.sourceId, false, 0, 0, 0);
        return [];
      }

      const data = await response.json();
      if (!data) {
        registry.recordRequest(this.sourceId, false, 0, 0, 0);
        return [];
      }

      // Handle non-JOBS responses (e.g. LOCATION_UNKNOWN, LOCATION_AMBIGUOUS)
      if (data.type !== 'JOBS' || !Array.isArray(data.jobs)) {
        registry.recordRequest(this.sourceId, true, 0, 0, 0);
        return [];
      }

      const today = new Date().toISOString().split('T')[0];
      const opportunities: Opportunity[] = [];

      for (let idx = 0; idx < data.jobs.length; idx++) {
        const item = data.jobs[idx];
        if (!item || !item.title || typeof item.title !== 'string' || !item.title.trim() || !item.url) {
          continue;
        }

        const urlHash = Buffer.from(item.url).toString('hex').slice(0, 16);
        const id = `careerjet_${urlHash}`;

        // Employer: Use company when present, never manufacture 'Verified Employer'
        const employer = (item.company && typeof item.company === 'string' && item.company.trim())
          ? item.company.trim()
          : 'Unspecified Employer';

        // Description: Excerpt only
        const summary = (item.description && typeof item.description === 'string')
          ? item.description.trim()
          : '';
        const fullDescription = undefined;

        // Location: Strictly from source, zero search-param contamination
        const rawLoc = (item.locations && typeof item.locations === 'string' && item.locations.trim())
          ? item.locations.trim()
          : (item.location && typeof item.location === 'string' && item.location.trim())
            ? item.location.trim()
            : undefined;

        let city = 'Unknown';
        let province = 'Unknown';
        let country = 'Unknown';

        if (rawLoc) {
          const parts = rawLoc.split(',').map(s => s.trim()).filter(Boolean);
          if (parts.length >= 2) {
            city = parts[0];
            province = parts[1];
          } else {
            // Single-part location: do NOT assume single token is city or province
            city = 'Unknown';
            province = 'Unknown';
          }

          // Vacancy country: only set to 'South Africa' if explicitly established in source location
          const lowerLoc = rawLoc.toLowerCase();
          if (lowerLoc.includes('south africa') || lowerLoc.endsWith(', za') || lowerLoc === 'za') {
            country = 'South Africa';
          }
        }

        // Date & Freshness parsing
        let pubDate: string | undefined = undefined;
        let freshnessStatus: FreshnessStatus = 'UNKNOWN';

        if (item.date && typeof item.date === 'string') {
          const parsed = new Date(item.date);
          if (!isNaN(parsed.getTime())) {
            pubDate = parsed.toISOString().split('T')[0];
            const diffDays = (Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24);
            if (diffDays >= 0) {
              if (diffDays <= 3) freshnessStatus = 'NEW';
              else if (diffDays <= 7) freshnessStatus = 'FRESH';
              else if (diffDays <= 30) freshnessStatus = 'RECENT';
              else freshnessStatus = 'STALE';
            } else {
              freshnessStatus = 'NEW';
            }
          }
        }

        // Salary parsing
        let salaryObj: Opportunity['salary'] = undefined;
        if (item.salary || item.salary_min !== undefined || item.salary_max !== undefined) {
          const minNum = (item.salary_min !== undefined && item.salary_min !== null && !isNaN(Number(item.salary_min)))
            ? Number(item.salary_min)
            : undefined;
          const maxNum = (item.salary_max !== undefined && item.salary_max !== null && !isNaN(Number(item.salary_max)))
            ? Number(item.salary_max)
            : undefined;

          let period: 'Hourly' | 'Monthly' | 'Annual' | 'Stipend' | 'Weekly' | 'Daily' | 'Unknown' = 'Unknown';
          const st = String(item.salary_type || '').trim().toUpperCase();
          if (st === 'Y' || st === 'YEAR' || st === 'YEARLY' || st === 'ANNUALLY') {
            period = 'Annual';
          } else if (st === 'M' || st === 'MONTH' || st === 'MONTHLY') {
            period = 'Monthly';
          } else if (st === 'W' || st === 'WEEK' || st === 'WEEKLY') {
            period = 'Weekly';
          } else if (st === 'D' || st === 'DAY' || st === 'DAILY') {
            period = 'Daily';
          } else if (st === 'H' || st === 'HOUR' || st === 'HOURLY') {
            period = 'Hourly';
          }

          const currency = (item.salary_currency_code && typeof item.salary_currency_code === 'string' && item.salary_currency_code.trim())
            ? item.salary_currency_code.trim().toUpperCase()
            : undefined;

          let formatted = '';
          if (item.salary && typeof item.salary === 'string' && item.salary.trim()) {
            formatted = item.salary.trim();
          } else if (minNum !== undefined && maxNum !== undefined) {
            formatted = currency ? `${currency} ${minNum} - ${maxNum}` : `${minNum} - ${maxNum}`;
          } else if (minNum !== undefined) {
            formatted = currency ? `${currency} ${minNum}` : `${minNum}`;
          } else if (maxNum !== undefined) {
            formatted = currency ? `${currency} ${maxNum}` : `${maxNum}`;
          }

          salaryObj = {
            formatted,
            period,
            minAmount: minNum,
            maxAmount: maxNum,
            currency,
          };
        }

        const opp: Opportunity = {
          id,
          title: item.title.trim(),
          employer,
          location: {
            rawLocationText: rawLoc,
            city,
            province,
            regionType: 'UNKNOWN',
            country,
            remoteStatus: 'UNKNOWN',
          },
          jobCategory: 'Unclassified',
          employmentType: 'Unknown',
          experienceLevel: 'Unknown',
          qualificationRequirement: 'NOT_SPECIFIED',
          salary: salaryObj,
          summary,
          fullDescription,
          requirements: [],
          responsibilities: [],
          skillsRequired: [],
          closingDate: undefined,
          postedAt: pubDate,
          updatedAt: today,
          isFixture: false,
          isLive: true,
          sourceProvenance: {
            sourceId: this.sourceId,
            sourceName: this.sourceName,
            sourceTier: 2,
            sourceType: 'AUTHORISED_AGGREGATOR',
            originalListingId: urlHash,
            originalUrl: item.url,
            sourceListingUrl: item.url,
            employerName: employer,
            publicationDate: pubDate,
            lastVerifiedDate: today,
            lastSeenAt: today,
            expiresAt: undefined,
            sourceStatus: 'LIVE_EXTERNAL',
            verificationStatus: 'UNVERIFIED',
            destinationStatus: 'LISTING_ONLY',
            freshnessStatus,
            applicationDestination: item.url,
            applicationUrl: item.url,
            isRealVerified: false,
            isFixture: false,
            isLive: true,
            attributionRequired: true,
            attributionConfig: {
              providerName: 'Careerjet',
              text: 'Powered by Careerjet',
              termsUrl: 'https://www.careerjet.co.za/',
            },
          },
        };

        opportunities.push(opp);
      }

      registry.recordRequest(this.sourceId, true, opportunities.length, 0, 0);
      return opportunities;
    } catch (e: any) {
      registry.recordRequest(this.sourceId, false, 0, 0, 0);
      return [];
    }
  }
}

/**
 * 9. PNet Partnership Adapter (Tier 3 Partnership)
 * Remains disabled (PARTNERSHIP_REQUIRED) until an authorised API/feed exists.
 * Does NOT scrape PNet or extract without authorization.
 */
export class PNetAdapter implements ISourceAdapter {
  sourceId = 'pnet_sa_partnership';
  sourceName = 'PNet Recruitment Partnership Feed';
  sourceTier: SourceTier = 3;
  sourceType: SourceType = 'PARTNER';

  async getStatus(): Promise<SourceAdapterStatus> {
    return 'PARTNERSHIP_REQUIRED';
  }

  async fetchOpportunities(params?: SourceQueryParams): Promise<Opportunity[]> {
    return [];
  }
}
