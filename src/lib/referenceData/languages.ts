// Curated language list (subset of ISO 639-1) most relevant for legal document/translation use cases.
// Arabic & English pinned to the top.

export interface Language {
  code: string;     // ISO 639-1 (e.g. 'ar')
  name: string;
  nameAr: string;
  nativeName: string;
}

export const LANGUAGES: Language[] = [
  { code: 'ar', name: 'Arabic', nameAr: 'العربية', nativeName: 'العربية' },
  { code: 'en', name: 'English', nameAr: 'الإنجليزية', nativeName: 'English' },
  { code: 'ku', name: 'Kurdish', nameAr: 'الكردية', nativeName: 'Kurdî' },
  { code: 'tr', name: 'Turkish', nameAr: 'التركية', nativeName: 'Türkçe' },
  { code: 'fa', name: 'Persian', nameAr: 'الفارسية', nativeName: 'فارسی' },
  { code: 'fr', name: 'French', nameAr: 'الفرنسية', nativeName: 'Français' },
  { code: 'de', name: 'German', nameAr: 'الألمانية', nativeName: 'Deutsch' },
  { code: 'es', name: 'Spanish', nameAr: 'الإسبانية', nativeName: 'Español' },
  { code: 'it', name: 'Italian', nameAr: 'الإيطالية', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nameAr: 'البرتغالية', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nameAr: 'الروسية', nativeName: 'Русский' },
  { code: 'zh', name: 'Chinese', nameAr: 'الصينية', nativeName: '中文' },
  { code: 'ja', name: 'Japanese', nameAr: 'اليابانية', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nameAr: 'الكورية', nativeName: '한국어' },
  { code: 'hi', name: 'Hindi', nameAr: 'الهندية', nativeName: 'हिन्दी' },
  { code: 'ur', name: 'Urdu', nameAr: 'الأردية', nativeName: 'اردو' },
  { code: 'nl', name: 'Dutch', nameAr: 'الهولندية', nativeName: 'Nederlands' },
  { code: 'sv', name: 'Swedish', nameAr: 'السويدية', nativeName: 'Svenska' },
  { code: 'no', name: 'Norwegian', nameAr: 'النرويجية', nativeName: 'Norsk' },
  { code: 'da', name: 'Danish', nameAr: 'الدنماركية', nativeName: 'Dansk' },
  { code: 'fi', name: 'Finnish', nameAr: 'الفنلندية', nativeName: 'Suomi' },
  { code: 'pl', name: 'Polish', nameAr: 'البولندية', nativeName: 'Polski' },
  { code: 'el', name: 'Greek', nameAr: 'اليونانية', nativeName: 'Ελληνικά' },
  { code: 'he', name: 'Hebrew', nameAr: 'العبرية', nativeName: 'עברית' },
  { code: 'th', name: 'Thai', nameAr: 'التايلاندية', nativeName: 'ไทย' },
  { code: 'vi', name: 'Vietnamese', nameAr: 'الفيتنامية', nativeName: 'Tiếng Việt' },
];
