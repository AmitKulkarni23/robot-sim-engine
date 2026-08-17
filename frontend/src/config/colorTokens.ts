export interface ColorTokens {
  ground: string;
  surface: string;
  surfaceSecondary: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  accentSubtle: string;
  pass: string;
  passBg: string;
  passBorder: string;
  fail: string;
  failBg: string;
  failBorder: string;
  changed: string;
  changedBg: string;
  changedBorder: string;
}

export const lightTokens: ColorTokens = {
  ground: '#F6F8FA',
  surface: '#FFFFFF',
  surfaceSecondary: '#F0F3F6',
  border: '#D0D7DE',
  borderStrong: '#AFB8C1',
  textPrimary: '#1F2328',
  textSecondary: '#656D76',
  textTertiary: '#8C959F',
  accent: '#0969DA',
  accentSubtle: '#DDF4FF',
  pass: '#1A7F37',
  passBg: '#DAFBE1',
  passBorder: '#A7E3B6',
  fail: '#CF222E',
  failBg: '#FFEBE9',
  failBorder: '#FDAEB7',
  changed: '#9A6700',
  changedBg: '#FFF8C5',
  changedBorder: '#EAD370',
};

export const darkTokens: ColorTokens = {
  ground: '#0D1117',
  surface: '#161B22',
  surfaceSecondary: '#1C2128',
  border: '#30363D',
  borderStrong: '#484F58',
  textPrimary: '#E6EDF3',
  textSecondary: '#8B949E',
  textTertiary: '#6E7681',
  accent: '#58A6FF',
  accentSubtle: '#121D2F',
  pass: '#3FB950',
  passBg: '#0D2818',
  passBorder: '#196C2E',
  fail: '#F85149',
  failBg: '#3D1117',
  failBorder: '#7D2126',
  changed: '#D29922',
  changedBg: '#2E1800',
  changedBorder: '#6E4B00',
};

export const getTokens = (mode: 'light' | 'dark'): ColorTokens =>
  mode === 'dark' ? darkTokens : lightTokens;
