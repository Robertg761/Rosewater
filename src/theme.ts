import { Platform, TextStyle, ViewStyle } from 'react-native';

export interface Palette {
  key: string;
  label: string;
  /** MaterialCommunityIcons glyph shown on the theme swatch. */
  icon: string;
  dark: boolean;

  background: string;
  backgroundAlt: string;
  card: string;
  cardAlt: string;

  accent: string;
  accentDeep: string;
  accentSoft: string;
  accentSofter: string;
  /** Text/icon colour that sits on top of `accent`. */
  onAccent: string;

  text: string;
  textMuted: string;
  textFaint: string;

  border: string;
  borderStrong: string;

  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  star: string;

  overlay: string;
  shadow: string;
  /** Two-stop wash behind screen headers: tinted at the top, page colour at the bottom. */
  hero: [string, string];
}

export const themes: Record<string, Palette> = {
  rosewater: {
    key: 'rosewater',
    label: 'Rose',
    icon: 'flower-tulip',
    dark: false,
    background: '#FFF4F2',
    backgroundAlt: '#FBE7E4',
    card: '#FFFFFF',
    cardAlt: '#FFF8F7',
    accent: '#C25470',
    accentDeep: '#9B3B57',
    accentSoft: '#FADCE3',
    accentSofter: '#FDEEF1',
    onAccent: '#FFFFFF',
    text: '#35242A',
    textMuted: '#8A7076',
    textFaint: '#B9A3A8',
    border: '#F2DDE1',
    borderStrong: '#E6C6CD',
    success: '#3F8F60',
    successSoft: '#DDF0E4',
    danger: '#C2453F',
    dangerSoft: '#FAE0DE',
    star: '#E5A020',
    overlay: 'rgba(36,20,26,0.62)',
    shadow: '#B07C88',
    hero: ['#FBDDE4', '#FFF4F2'],
  },
  lavender: {
    key: 'lavender',
    label: 'Lavender',
    icon: 'heart',
    dark: false,
    background: '#F7F4FF',
    backgroundAlt: '#EDE7FB',
    card: '#FFFFFF',
    cardAlt: '#FAF8FF',
    accent: '#7B5CC4',
    accentDeep: '#5B3F9B',
    accentSoft: '#E8E0FA',
    accentSofter: '#F3EEFC',
    onAccent: '#FFFFFF',
    text: '#2E2739',
    textMuted: '#7D7490',
    textFaint: '#ADA5BE',
    border: '#E6E0F3',
    borderStrong: '#D4CBE9',
    success: '#3F8F60',
    successSoft: '#DDF0E4',
    danger: '#C2453F',
    dangerSoft: '#FAE0DE',
    star: '#E5A020',
    overlay: 'rgba(24,18,36,0.62)',
    shadow: '#8C7CB4',
    hero: ['#E7DEFA', '#F7F4FF'],
  },
  mint: {
    key: 'mint',
    label: 'Fresh Mint',
    icon: 'leaf',
    dark: false,
    background: '#F1FAF6',
    backgroundAlt: '#DFF2E9',
    card: '#FFFFFF',
    cardAlt: '#F7FCFA',
    accent: '#1F8E68',
    accentDeep: '#14654A',
    accentSoft: '#D6F0E5',
    accentSofter: '#EAF8F2',
    onAccent: '#FFFFFF',
    text: '#1F332B',
    textMuted: '#658077',
    textFaint: '#9BB4AB',
    border: '#DCEDE5',
    borderStrong: '#C3E0D4',
    success: '#2E8B57',
    successSoft: '#DAF1E4',
    danger: '#C2453F',
    dangerSoft: '#FAE0DE',
    star: '#DFA019',
    overlay: 'rgba(16,32,26,0.62)',
    shadow: '#7FA898',
    hero: ['#D5F0E4', '#F1FAF6'],
  },
  sunset: {
    key: 'sunset',
    label: 'Sunset',
    icon: 'weather-sunset',
    dark: false,
    background: '#FFF6EF',
    backgroundAlt: '#FCE8D8',
    card: '#FFFFFF',
    cardAlt: '#FFFAF6',
    accent: '#D2662C',
    accentDeep: '#A64A19',
    accentSoft: '#FBE3CF',
    accentSofter: '#FDF1E7',
    onAccent: '#FFFFFF',
    text: '#3A2A20',
    textMuted: '#8E7565',
    textFaint: '#BFA895',
    border: '#F5E3D3',
    borderStrong: '#EACDB4',
    success: '#3F8F60',
    successSoft: '#DDF0E4',
    danger: '#C2453F',
    dangerSoft: '#FAE0DE',
    star: '#D99B14',
    overlay: 'rgba(40,26,18,0.62)',
    shadow: '#BE9070',
    hero: ['#FBDFC8', '#FFF6EF'],
  },
  midnight: {
    key: 'midnight',
    label: 'Midnight',
    icon: 'moon-waning-crescent',
    dark: true,
    background: '#141220',
    backgroundAlt: '#1C1929',
    card: '#211D2F',
    cardAlt: '#2A2540',
    accent: '#E294B0',
    accentDeep: '#C46E8E',
    accentSoft: '#3A2E42',
    accentSofter: '#2A2436',
    // The accent is a light pink here, so on-accent text has to be dark.
    onAccent: '#2A1520',
    text: '#F3EEF5',
    textMuted: '#A398AC',
    textFaint: '#796E85',
    border: '#332D44',
    borderStrong: '#453D59',
    success: '#7FC28E',
    successSoft: '#25382B',
    danger: '#E58079',
    dangerSoft: '#3A2523',
    star: '#F0C64F',
    overlay: 'rgba(6,4,10,0.8)',
    shadow: '#000000',
    hero: ['#2B2440', '#141220'],
  },
};

export const themeOrder = ['rosewater', 'lavender', 'mint', 'sunset', 'midnight'];
export const DEFAULT_THEME = 'rosewater';

/* ------------------------------------------------------------------ *
 * Design tokens
 * ------------------------------------------------------------------ */

/** Spacing scale. Every margin/padding in the app should come from here. */
export const S = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

/** Corner radii. */
export const R = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 26,
  pill: 999,
} as const;

/**
 * Custom fonts have no synthetic weights on Android — each weight is its own
 * family, so styles set `fontFamily` and never `fontWeight`.
 */
export const font = {
  regular: 'Nunito_400Regular',
  medium: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  black: 'Nunito_800ExtraBold',
  display: 'Fraunces_600SemiBold',
  displayBold: 'Fraunces_700Bold',
} as const;

/** Text presets, so sizes and line heights stay consistent across screens. */
export const type = {
  hero: { fontFamily: font.displayBold, fontSize: 30, lineHeight: 38 },
  title: { fontFamily: font.displayBold, fontSize: 24, lineHeight: 31 },
  numeral: { fontFamily: font.displayBold, fontSize: 30, lineHeight: 34 },
  cardTitle: { fontFamily: font.bold, fontSize: 16.5, lineHeight: 22 },
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 21 },
  bodyStrong: { fontFamily: font.medium, fontSize: 15, lineHeight: 21 },
  small: { fontFamily: font.regular, fontSize: 13.5, lineHeight: 19 },
  smallStrong: { fontFamily: font.medium, fontSize: 13.5, lineHeight: 19 },
  caption: { fontFamily: font.medium, fontSize: 11.5, lineHeight: 15 },
  label: {
    fontFamily: font.black,
    fontSize: 11.5,
    letterSpacing: 1.1,
    textTransform: 'uppercase' as const,
  },
} satisfies Record<string, TextStyle>;

/**
 * Soft drop shadow. Android tints elevation shadows only from API 28, so the
 * warm `shadow` colour degrades gracefully to grey on older devices.
 */
export function shadow(theme: Palette, level: 1 | 2 | 3 = 1): ViewStyle {
  const height = level === 1 ? 2 : level === 2 ? 6 : 12;
  const radius = level === 1 ? 7 : level === 2 ? 16 : 28;
  const opacity = theme.dark
    ? [0.4, 0.5, 0.6][level - 1]
    : [0.1, 0.14, 0.18][level - 1];
  return {
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation: Platform.OS === 'android' ? level * 4 : 0,
  };
}

/* ------------------------------------------------------------------ *
 * Domain metadata
 * ------------------------------------------------------------------ */

export interface EntryTypeMeta {
  label: string;
  short: string;
  color: string;
  /** MaterialCommunityIcons glyph. */
  icon: string;
}

export const entryTypeMeta: Record<string, EntryTypeMeta> = {
  wash: { label: 'Shampoo wash', short: 'Wash', color: '#5B93C7', icon: 'shower-head' },
  shampoo: { label: 'Shampoo', short: 'Shampoo', color: '#3E86C4', icon: 'bottle-tonic' },
  condition: { label: 'Condition', short: 'Condition', color: '#7D8FD4', icon: 'water-plus' },
  shampoo_condition: { label: 'Shampoo/Condition', short: 'Sham/cond', color: '#4AA0B5', icon: 'waves' },
  cowash: { label: 'Co-wash', short: 'Co-wash', color: '#79ADD6', icon: 'water' },
  clarify: { label: 'Clarifying wash', short: 'Clarify', color: '#3F7BA8', icon: 'water-check' },
  deep: { label: 'Deep condition', short: 'Deep cond.', color: '#B4646F', icon: 'bottle-tonic-plus' },
  protein: { label: 'Protein treatment', short: 'Protein', color: '#9068AE', icon: 'shield-check' },
  oil: { label: 'Oil / sealing', short: 'Oil', color: '#BF991F', icon: 'oil' },
  heat: { label: 'Heat styling', short: 'Heat', color: '#D57F38', icon: 'hair-dryer' },
  trim: { label: 'Trim', short: 'Trim', color: '#6F9A52', icon: 'content-cut' },
  style: { label: 'Protective style', short: 'Style', color: '#4F8B85', icon: 'ribbon' },
  other: { label: 'Other', short: 'Other', color: '#8A7A80', icon: 'dots-horizontal' },
};

export const entryTypeOrder = [
  'wash',
  'shampoo',
  'condition',
  'shampoo_condition',
  'cowash',
  'clarify',
  'deep',
  'protein',
  'oil',
  'heat',
  'trim',
  'style',
  'other',
];

export const WASH_TYPES = ['wash', 'shampoo', 'shampoo_condition', 'cowash', 'clarify'];

/** Highest-priority type of an entry, used for its icon bubble and color. */
export function primaryEntryType(types: string[]): string {
  return types[0] ?? 'other';
}

/** Title for an entry: full label for one type, short labels joined for several. */
export function entryTypesLabel(types: string[]): string {
  if (types.length <= 1) return (entryTypeMeta[types[0]] ?? entryTypeMeta.other).label;
  return types.map((t) => (entryTypeMeta[t] ?? entryTypeMeta.other).short).join(' · ');
}

/** Icon shown next to a product category on the shelf. */
export const categoryIcons: Record<string, string> = {
  Shampoo: 'shower-head',
  Conditioner: 'water',
  'Deep conditioner': 'bottle-tonic-plus',
  'Leave-in': 'spray',
  Oil: 'oil',
  Styler: 'auto-fix',
  Treatment: 'shield-check',
  Other: 'bottle-tonic',
};
