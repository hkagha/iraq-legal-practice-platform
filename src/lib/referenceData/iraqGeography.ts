// Iraq's 18 governorates and their major cities/districts (bilingual EN/AR).
// Used by CitySelect when country = 'IQ'. Other countries fall back to free-text.

export interface IraqGovernorate {
  code: string;       // Short code, used in DB enum (matches existing values)
  name: string;       // English
  nameAr: string;     // Arabic
  cities: { name: string; nameAr: string }[];
}

export const IRAQ_GOVERNORATES: IraqGovernorate[] = [
  {
    code: 'baghdad', name: 'Baghdad', nameAr: 'بغداد',
    cities: [
      { name: 'Baghdad', nameAr: 'بغداد' },
      { name: 'Karkh', nameAr: 'الكرخ' },
      { name: 'Rusafa', nameAr: 'الرصافة' },
      { name: 'Adhamiyah', nameAr: 'الأعظمية' },
      { name: 'Kadhimiya', nameAr: 'الكاظمية' },
      { name: 'Sadr City', nameAr: 'مدينة الصدر' },
      { name: 'Mansour', nameAr: 'المنصور' },
      { name: 'Karrada', nameAr: 'الكرادة' },
      { name: 'Dora', nameAr: 'الدورة' },
      { name: 'Abu Ghraib', nameAr: 'أبو غريب' },
      { name: 'Mahmudiyah', nameAr: 'المحمودية' },
      { name: 'Taji', nameAr: 'التاجي' },
    ],
  },
  {
    code: 'basra', name: 'Basra', nameAr: 'البصرة',
    cities: [
      { name: 'Basra', nameAr: 'البصرة' },
      { name: 'Az Zubayr', nameAr: 'الزبير' },
      { name: 'Abu Al-Khaseeb', nameAr: 'أبو الخصيب' },
      { name: 'Al-Faw', nameAr: 'الفاو' },
      { name: 'Shatt Al-Arab', nameAr: 'شط العرب' },
      { name: 'Al-Qurnah', nameAr: 'القرنة' },
      { name: 'Al-Madinah', nameAr: 'المدينة' },
    ],
  },
  {
    code: 'nineveh', name: 'Nineveh', nameAr: 'نينوى',
    cities: [
      { name: 'Mosul', nameAr: 'الموصل' },
      { name: 'Tal Afar', nameAr: 'تلعفر' },
      { name: 'Sinjar', nameAr: 'سنجار' },
      { name: 'Tel Keppe', nameAr: 'تلكيف' },
      { name: 'Hamdaniya', nameAr: 'الحمدانية' },
      { name: 'Bashiqa', nameAr: 'بعشيقة' },
    ],
  },
  {
    code: 'erbil', name: 'Erbil', nameAr: 'أربيل',
    cities: [
      { name: 'Erbil', nameAr: 'أربيل' },
      { name: 'Soran', nameAr: 'سوران' },
      { name: 'Koya', nameAr: 'كويسنجق' },
      { name: 'Shaqlawa', nameAr: 'شقلاوة' },
      { name: 'Choman', nameAr: 'جومان' },
      { name: 'Mergasor', nameAr: 'ميركة سور' },
    ],
  },
  {
    code: 'sulaymaniyah', name: 'Sulaymaniyah', nameAr: 'السليمانية',
    cities: [
      { name: 'Sulaymaniyah', nameAr: 'السليمانية' },
      { name: 'Halabja', nameAr: 'حلبجة' },
      { name: 'Rania', nameAr: 'رانية' },
      { name: 'Penjwen', nameAr: 'بنجوين' },
      { name: 'Chamchamal', nameAr: 'جمجمال' },
      { name: 'Darbandikhan', nameAr: 'دربنديخان' },
      { name: 'Kalar', nameAr: 'كلار' },
    ],
  },
  {
    code: 'duhok', name: 'Duhok', nameAr: 'دهوك',
    cities: [
      { name: 'Duhok', nameAr: 'دهوك' },
      { name: 'Zakho', nameAr: 'زاخو' },
      { name: 'Amadiya', nameAr: 'العمادية' },
      { name: 'Akre', nameAr: 'عقرة' },
      { name: 'Sumel', nameAr: 'سيميل' },
    ],
  },
  {
    code: 'kirkuk', name: 'Kirkuk', nameAr: 'كركوك',
    cities: [
      { name: 'Kirkuk', nameAr: 'كركوك' },
      { name: 'Hawija', nameAr: 'الحويجة' },
      { name: 'Daquq', nameAr: 'داقوق' },
      { name: 'Dibis', nameAr: 'دبس' },
    ],
  },
  {
    code: 'anbar', name: 'Anbar', nameAr: 'الأنبار',
    cities: [
      { name: 'Ramadi', nameAr: 'الرمادي' },
      { name: 'Fallujah', nameAr: 'الفلوجة' },
      { name: 'Al-Qaim', nameAr: 'القائم' },
      { name: 'Hit', nameAr: 'هيت' },
      { name: 'Haditha', nameAr: 'حديثة' },
      { name: 'Rutba', nameAr: 'الرطبة' },
      { name: 'Ana', nameAr: 'عانة' },
    ],
  },
  {
    code: 'salahaddin', name: 'Salah Al-Din', nameAr: 'صلاح الدين',
    cities: [
      { name: 'Tikrit', nameAr: 'تكريت' },
      { name: 'Samarra', nameAr: 'سامراء' },
      { name: 'Baiji', nameAr: 'بيجي' },
      { name: 'Balad', nameAr: 'بلد' },
      { name: 'Dujail', nameAr: 'الدجيل' },
      { name: 'Tooz Khurmatu', nameAr: 'طوزخورماتو' },
    ],
  },
  {
    code: 'diyala', name: 'Diyala', nameAr: 'ديالى',
    cities: [
      { name: 'Baqubah', nameAr: 'بعقوبة' },
      { name: 'Al-Khalis', nameAr: 'الخالص' },
      { name: 'Al-Muqdadiyah', nameAr: 'المقدادية' },
      { name: 'Khanaqin', nameAr: 'خانقين' },
      { name: 'Al-Mansuriyah', nameAr: 'المنصورية' },
      { name: 'Balad Ruz', nameAr: 'بلدروز' },
    ],
  },
  {
    code: 'najaf', name: 'Najaf', nameAr: 'النجف',
    cities: [
      { name: 'Najaf', nameAr: 'النجف' },
      { name: 'Kufa', nameAr: 'الكوفة' },
      { name: 'Al-Manathira', nameAr: 'المناذرة' },
    ],
  },
  {
    code: 'karbala', name: 'Karbala', nameAr: 'كربلاء',
    cities: [
      { name: 'Karbala', nameAr: 'كربلاء' },
      { name: 'Al-Hindiya', nameAr: 'الهندية' },
      { name: 'Ain Al-Tamur', nameAr: 'عين التمر' },
    ],
  },
  {
    code: 'babylon', name: 'Babylon', nameAr: 'بابل',
    cities: [
      { name: 'Hillah', nameAr: 'الحلة' },
      { name: 'Al-Mahawil', nameAr: 'المحاويل' },
      { name: 'Al-Musayyib', nameAr: 'المسيب' },
      { name: 'Al-Hashimiyah', nameAr: 'الهاشمية' },
    ],
  },
  {
    code: 'wasit', name: 'Wasit', nameAr: 'واسط',
    cities: [
      { name: 'Kut', nameAr: 'الكوت' },
      { name: 'Aziziyah', nameAr: 'العزيزية' },
      { name: 'Numaniyah', nameAr: 'النعمانية' },
      { name: 'Suwaira', nameAr: 'الصويرة' },
      { name: 'Badra', nameAr: 'بدرة' },
    ],
  },
  {
    code: 'qadisiyyah', name: 'Al-Qadisiyyah', nameAr: 'القادسية',
    cities: [
      { name: 'Diwaniyah', nameAr: 'الديوانية' },
      { name: 'Al-Hamza', nameAr: 'الحمزة' },
      { name: 'Afaq', nameAr: 'عفك' },
      { name: 'Al-Shamiya', nameAr: 'الشامية' },
    ],
  },
  {
    code: 'muthanna', name: 'Al-Muthanna', nameAr: 'المثنى',
    cities: [
      { name: 'Samawah', nameAr: 'السماوة' },
      { name: 'Al-Rumaitha', nameAr: 'الرميثة' },
      { name: 'Al-Khidhir', nameAr: 'الخضر' },
      { name: 'Al-Salman', nameAr: 'السلمان' },
    ],
  },
  {
    code: 'dhi_qar', name: 'Dhi Qar', nameAr: 'ذي قار',
    cities: [
      { name: 'Nasiriyah', nameAr: 'الناصرية' },
      { name: 'Suq Al-Shuyukh', nameAr: 'سوق الشيوخ' },
      { name: 'Al-Rifai', nameAr: 'الرفاعي' },
      { name: 'Al-Chibayish', nameAr: 'الجبايش' },
      { name: 'Al-Shatra', nameAr: 'الشطرة' },
    ],
  },
  {
    code: 'maysan', name: 'Maysan', nameAr: 'ميسان',
    cities: [
      { name: 'Amarah', nameAr: 'العمارة' },
      { name: 'Al-Majar', nameAr: 'المجر الكبير' },
      { name: 'Qal\'at Saleh', nameAr: 'قلعة صالح' },
      { name: 'Al-Maimouna', nameAr: 'الميمونة' },
      { name: 'Al-Kahlaa', nameAr: 'الكحلاء' },
    ],
  },
];

export function getGovernorateByCode(code?: string | null) {
  if (!code) return undefined;
  return IRAQ_GOVERNORATES.find(g => g.code === code);
}

export function getCitiesForGovernorate(code?: string | null) {
  return getGovernorateByCode(code)?.cities ?? [];
}

export function getAllIraqiCities() {
  return IRAQ_GOVERNORATES.flatMap(g =>
    g.cities.map(c => ({ ...c, governorate: g.code, governorateName: g.name, governorateNameAr: g.nameAr }))
  );
}
