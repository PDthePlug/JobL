import { DpsaPublicVacanciesAdapter } from '../adapters/sourceAdapters.ts';

function parseLocationWithProvincialContext(centreTextRaw: string, department: string, postChunk: string) {
  let centreText = (centreTextRaw || '')
    .replace(/REF\s*NO[\s\S]*$/i, '')
    .replace(/SALARY[\s\S]*$/i, '')
    .replace(/\(X\d+\s*Posts?\)/i, '')
    .trim()
    .replace(/\s+/g, ' ');

  let province = 'Unknown';
  const combo = `${centreText} ${department} ${postChunk.slice(0, 300)}`;

  if (/Gauteng|GAUTENG/i.test(combo)) province = 'Gauteng';
  else if (/Western Cape|WESTERN CAPE/i.test(combo)) province = 'Western Cape';
  else if (/KwaZulu-Natal|KZN|KWAZULU-NATAL/i.test(combo)) province = 'KwaZulu-Natal';
  else if (/Eastern Cape|EASTERN CAPE/i.test(combo)) province = 'Eastern Cape';
  else if (/Limpopo|LIMPOPO/i.test(combo)) province = 'Limpopo';
  else if (/Mpumalanga|MPUMALANGA/i.test(combo)) province = 'Mpumalanga';
  else if (/Free State|FREE STATE/i.test(combo)) province = 'Free State';
  else if (/North West|NORTH WEST/i.test(combo)) province = 'North West';
  else if (/Northern Cape|NORTHERN CAPE/i.test(combo)) province = 'Northern Cape';

  // Check if multiple distinct cities or regions are listed
  const isMultipleCentres =
    (/;|\/|\bor\b/i.test(centreText) && !/and/i.test(centreText)) ||
    (centreText.includes(',') && /limpopo|mpumalanga|gauteng|durban|pretoria|cape town/i.test(centreText) && /;\s*|\/\s*/.test(centreText));

  let city = 'Unknown';

  if (!isMultipleCentres) {
    if (/Pretoria|Tshwane|Centurion|Hatfield|Arcadia|Gezina|Soshanguve/i.test(centreText)) {
      city = 'Pretoria';
      if (province === 'Unknown') province = 'Gauteng';
    } else if (/Johannesburg|Joburg|Sandton|Rosebank|Braamfontein|Soweto|Randburg|Roodepoort|Ekurhuleni|Germiston|Kempton Park/i.test(centreText)) {
      if (/Sandton/i.test(centreText)) city = 'Sandton';
      else if (/Midrand/i.test(centreText)) city = 'Midrand';
      else if (/Kempton Park/i.test(centreText)) city = 'Kempton Park';
      else city = 'Johannesburg';
      if (province === 'Unknown') province = 'Gauteng';
    } else if (/Midrand/i.test(centreText)) {
      city = 'Midrand';
      if (province === 'Unknown') province = 'Gauteng';
    } else if (/Cape Town|Mowbray|Parow|Goodwood|Khayelitsha|Mitchells Plain|Rondebosch|Claremont|Wynberg/i.test(centreText)) {
      city = 'Cape Town';
      if (province === 'Unknown') province = 'Western Cape';
    } else if (/Bellville/i.test(centreText)) {
      city = 'Bellville';
      if (province === 'Unknown') province = 'Western Cape';
    } else if (/Durban|Pinetown|Umlazi|Chatsworth|Westville|Umhlanga/i.test(centreText)) {
      if (/Pinetown/i.test(centreText)) city = 'Pinetown';
      else city = 'Durban';
      if (province === 'Unknown') province = 'KwaZulu-Natal';
    } else if (/Pietermaritzburg/i.test(centreText)) {
      city = 'Pietermaritzburg';
      if (province === 'Unknown') province = 'KwaZulu-Natal';
    } else if (/Bloemfontein/i.test(centreText)) {
      city = 'Bloemfontein';
      if (province === 'Unknown') province = 'Free State';
    } else if (/Polokwane|Pietersburg/i.test(centreText)) {
      city = 'Polokwane';
      if (province === 'Unknown') province = 'Limpopo';
    } else if (/Thohoyandou/i.test(centreText)) {
      city = 'Thohoyandou';
      if (province === 'Unknown') province = 'Limpopo';
    } else if (/Mbombela|Nelspruit/i.test(centreText)) {
      city = 'Mbombela';
      if (province === 'Unknown') province = 'Mpumalanga';
    } else if (/Kimberley/i.test(centreText)) {
      city = 'Kimberley';
      if (province === 'Unknown') province = 'Northern Cape';
    } else if (/Mahikeng|Mafikeng|Mmabatho/i.test(centreText)) {
      city = 'Mahikeng';
      if (province === 'Unknown') province = 'North West';
    } else if (/Bisho|Bhisho/i.test(centreText)) {
      city = 'Bhisho';
      if (province === 'Unknown') province = 'Eastern Cape';
    } else if (/Gqeberha|Port Elizabeth/i.test(centreText)) {
      city = 'Gqeberha';
      if (province === 'Unknown') province = 'Eastern Cape';
    } else if (/East London/i.test(centreText)) {
      city = 'East London';
      if (province === 'Unknown') province = 'Eastern Cape';
    } else if (/Mthatha|Umtata/i.test(centreText)) {
      city = 'Mthatha';
      if (province === 'Unknown') province = 'Eastern Cape';
    } else if (/Rustenburg/i.test(centreText)) {
      city = 'Rustenburg';
      if (province === 'Unknown') province = 'North West';
    } else if (/Upington/i.test(centreText)) {
      city = 'Upington';
      if (province === 'Unknown') province = 'Northern Cape';
    } else if (/Malmesbury/i.test(centreText)) {
      city = 'Malmesbury';
      if (province === 'Unknown') province = 'Western Cape';
    }
  }

  return {
    rawLocationText: centreText || undefined,
    city,
    province,
  };
}

async function testProvincialContext() {
  const adapter = new DpsaPublicVacanciesAdapter();
  const opps = await adapter.fetchOpportunities();

  let preciseCityAndProvince = 0;
  let provinceOnly = 0;
  let rawCentreTextOnly = 0;
  let multipleCentres = 0;
  let variousInstitutions = 0;
  let headOffice = 0;
  let genuinelyUnspecified = 0;

  opps.forEach((o) => {
    const rawLoc = o.location.rawLocationText || '';
    const desc = o.fullDescription || '';
    const parsed = parseLocationWithProvincialContext(rawLoc, o.employer, desc);

    const isVarious = /various/i.test(rawLoc);
    const isHeadOffice = /head office|national office|central office/i.test(rawLoc);
    const isMulti = /;|\/|\bor\b/i.test(rawLoc) || (rawLoc.match(/,/g) || []).length >= 2;

    if (isVarious) variousInstitutions++;
    if (isHeadOffice) headOffice++;
    if (isMulti) multipleCentres++;

    if (parsed.city !== 'Unknown' && parsed.province !== 'Unknown') {
      preciseCityAndProvince++;
    } else if (parsed.province !== 'Unknown' && parsed.city === 'Unknown') {
      provinceOnly++;
    } else if (parsed.rawLocationText && parsed.city === 'Unknown' && parsed.province === 'Unknown') {
      rawCentreTextOnly++;
    } else {
      genuinelyUnspecified++;
    }
  });

  console.log('--- REFINED LOCATION COVERAGE METRICS ---');
  console.log(`Precise City + Province: ${preciseCityAndProvince}`);
  console.log(`Province Only: ${provinceOnly}`);
  console.log(`Raw Centre Text Only (both city & prov Unknown): ${rawCentreTextOnly}`);
  console.log(`Multiple Centres: ${multipleCentres}`);
  console.log(`Various Institutions: ${variousInstitutions}`);
  console.log(`Head Office / National Office / Central Office: ${headOffice}`);
  console.log(`Genuinely Unspecified: ${genuinelyUnspecified}`);
}

testProvincialContext().catch(console.error);
