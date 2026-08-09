export interface SALocation {
  city: string;
  suburbOrTownship?: string;
  province: string;
  isTownshipOrLocalHub?: boolean;
}

export const SOUTH_AFRICAN_PROVINCES = [
  'Gauteng',
  'Western Cape',
  'KwaZulu-Natal',
  'Eastern Cape',
  'Free State',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
] as const;

export const PRIMARY_SA_LOCATIONS: SALocation[] = [
  { city: 'Johannesburg', province: 'Gauteng' },
  { city: 'Soweto', suburbOrTownship: 'Soweto', province: 'Gauteng', isTownshipOrLocalHub: true },
  { city: 'Tembisa', suburbOrTownship: 'Tembisa', province: 'Gauteng', isTownshipOrLocalHub: true },
  { city: 'Pretoria', province: 'Gauteng' },
  { city: 'Midrand', province: 'Gauteng' },
  { city: 'Sandton', province: 'Gauteng' },
  { city: 'Kempton Park', province: 'Gauteng' },
  { city: 'Durban', province: 'KwaZulu-Natal' },
  { city: 'Pinetown', province: 'KwaZulu-Natal' },
  { city: 'Umlazi', suburbOrTownship: 'Umlazi', province: 'KwaZulu-Natal', isTownshipOrLocalHub: true },
  { city: 'Pietermaritzburg', province: 'KwaZulu-Natal' },
  { city: 'Cape Town', province: 'Western Cape' },
  { city: 'Khayelitsha', suburbOrTownship: 'Khayelitsha', province: 'Western Cape', isTownshipOrLocalHub: true },
  { city: 'Mitchells Plain', suburbOrTownship: 'Mitchells Plain', province: 'Western Cape', isTownshipOrLocalHub: true },
  { city: 'Bellville', province: 'Western Cape' },
  { city: 'Gqeberha', province: 'Eastern Cape' },
  { city: 'East London', province: 'Eastern Cape' },
  { city: 'Mthatha', province: 'Eastern Cape' },
  { city: 'Bloemfontein', province: 'Free State' },
  { city: 'Polokwane', province: 'Limpopo' },
  { city: 'Thohoyandou', province: 'Limpopo' },
  { city: 'Mbombela', province: 'Mpumalanga' },
  { city: 'Witbank (Emalahleni)', province: 'Mpumalanga' },
  { city: 'Rustenburg', province: 'North West' },
  { city: 'Mahikeng', province: 'North West' },
  { city: 'Kimberley', province: 'Northern Cape' },
  { city: 'Upington', province: 'Northern Cape' },
];
