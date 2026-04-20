// ISO 3166-1 country list with English + Arabic names, dial codes, and flag emojis.
// Iraq is pinned to the top of UI lists via the helper getCountriesForSelect().

export interface Country {
  code: string;          // ISO 3166-1 alpha-2 (e.g. 'IQ')
  name: string;          // English short name
  nameAr: string;        // Arabic name
  dialCode: string;      // E.164 dial code without '+', as string ('964', '1', '44')
  flag: string;          // Emoji flag
}

export const COUNTRIES: Country[] = [
  { code: 'IQ', name: 'Iraq', nameAr: 'العراق', dialCode: '964', flag: '🇮🇶' },
  { code: 'AF', name: 'Afghanistan', nameAr: 'أفغانستان', dialCode: '93', flag: '🇦🇫' },
  { code: 'AL', name: 'Albania', nameAr: 'ألبانيا', dialCode: '355', flag: '🇦🇱' },
  { code: 'DZ', name: 'Algeria', nameAr: 'الجزائر', dialCode: '213', flag: '🇩🇿' },
  { code: 'AD', name: 'Andorra', nameAr: 'أندورا', dialCode: '376', flag: '🇦🇩' },
  { code: 'AO', name: 'Angola', nameAr: 'أنغولا', dialCode: '244', flag: '🇦🇴' },
  { code: 'AG', name: 'Antigua and Barbuda', nameAr: 'أنتيغوا وبربودا', dialCode: '1268', flag: '🇦🇬' },
  { code: 'AR', name: 'Argentina', nameAr: 'الأرجنتين', dialCode: '54', flag: '🇦🇷' },
  { code: 'AM', name: 'Armenia', nameAr: 'أرمينيا', dialCode: '374', flag: '🇦🇲' },
  { code: 'AU', name: 'Australia', nameAr: 'أستراليا', dialCode: '61', flag: '🇦🇺' },
  { code: 'AT', name: 'Austria', nameAr: 'النمسا', dialCode: '43', flag: '🇦🇹' },
  { code: 'AZ', name: 'Azerbaijan', nameAr: 'أذربيجان', dialCode: '994', flag: '🇦🇿' },
  { code: 'BS', name: 'Bahamas', nameAr: 'الباهاما', dialCode: '1242', flag: '🇧🇸' },
  { code: 'BH', name: 'Bahrain', nameAr: 'البحرين', dialCode: '973', flag: '🇧🇭' },
  { code: 'BD', name: 'Bangladesh', nameAr: 'بنغلاديش', dialCode: '880', flag: '🇧🇩' },
  { code: 'BB', name: 'Barbados', nameAr: 'بربادوس', dialCode: '1246', flag: '🇧🇧' },
  { code: 'BY', name: 'Belarus', nameAr: 'بيلاروسيا', dialCode: '375', flag: '🇧🇾' },
  { code: 'BE', name: 'Belgium', nameAr: 'بلجيكا', dialCode: '32', flag: '🇧🇪' },
  { code: 'BZ', name: 'Belize', nameAr: 'بليز', dialCode: '501', flag: '🇧🇿' },
  { code: 'BJ', name: 'Benin', nameAr: 'بنين', dialCode: '229', flag: '🇧🇯' },
  { code: 'BT', name: 'Bhutan', nameAr: 'بوتان', dialCode: '975', flag: '🇧🇹' },
  { code: 'BO', name: 'Bolivia', nameAr: 'بوليفيا', dialCode: '591', flag: '🇧🇴' },
  { code: 'BA', name: 'Bosnia and Herzegovina', nameAr: 'البوسنة والهرسك', dialCode: '387', flag: '🇧🇦' },
  { code: 'BW', name: 'Botswana', nameAr: 'بوتسوانا', dialCode: '267', flag: '🇧🇼' },
  { code: 'BR', name: 'Brazil', nameAr: 'البرازيل', dialCode: '55', flag: '🇧🇷' },
  { code: 'BN', name: 'Brunei', nameAr: 'بروناي', dialCode: '673', flag: '🇧🇳' },
  { code: 'BG', name: 'Bulgaria', nameAr: 'بلغاريا', dialCode: '359', flag: '🇧🇬' },
  { code: 'BF', name: 'Burkina Faso', nameAr: 'بوركينا فاسو', dialCode: '226', flag: '🇧🇫' },
  { code: 'BI', name: 'Burundi', nameAr: 'بوروندي', dialCode: '257', flag: '🇧🇮' },
  { code: 'KH', name: 'Cambodia', nameAr: 'كمبوديا', dialCode: '855', flag: '🇰🇭' },
  { code: 'CM', name: 'Cameroon', nameAr: 'الكاميرون', dialCode: '237', flag: '🇨🇲' },
  { code: 'CA', name: 'Canada', nameAr: 'كندا', dialCode: '1', flag: '🇨🇦' },
  { code: 'CV', name: 'Cape Verde', nameAr: 'الرأس الأخضر', dialCode: '238', flag: '🇨🇻' },
  { code: 'CF', name: 'Central African Republic', nameAr: 'جمهورية أفريقيا الوسطى', dialCode: '236', flag: '🇨🇫' },
  { code: 'TD', name: 'Chad', nameAr: 'تشاد', dialCode: '235', flag: '🇹🇩' },
  { code: 'CL', name: 'Chile', nameAr: 'تشيلي', dialCode: '56', flag: '🇨🇱' },
  { code: 'CN', name: 'China', nameAr: 'الصين', dialCode: '86', flag: '🇨🇳' },
  { code: 'CO', name: 'Colombia', nameAr: 'كولومبيا', dialCode: '57', flag: '🇨🇴' },
  { code: 'KM', name: 'Comoros', nameAr: 'جزر القمر', dialCode: '269', flag: '🇰🇲' },
  { code: 'CG', name: 'Congo', nameAr: 'الكونغو', dialCode: '242', flag: '🇨🇬' },
  { code: 'CD', name: 'Congo (DRC)', nameAr: 'جمهورية الكونغو الديمقراطية', dialCode: '243', flag: '🇨🇩' },
  { code: 'CR', name: 'Costa Rica', nameAr: 'كوستاريكا', dialCode: '506', flag: '🇨🇷' },
  { code: 'CI', name: "Côte d'Ivoire", nameAr: 'ساحل العاج', dialCode: '225', flag: '🇨🇮' },
  { code: 'HR', name: 'Croatia', nameAr: 'كرواتيا', dialCode: '385', flag: '🇭🇷' },
  { code: 'CU', name: 'Cuba', nameAr: 'كوبا', dialCode: '53', flag: '🇨🇺' },
  { code: 'CY', name: 'Cyprus', nameAr: 'قبرص', dialCode: '357', flag: '🇨🇾' },
  { code: 'CZ', name: 'Czech Republic', nameAr: 'جمهورية التشيك', dialCode: '420', flag: '🇨🇿' },
  { code: 'DK', name: 'Denmark', nameAr: 'الدنمارك', dialCode: '45', flag: '🇩🇰' },
  { code: 'DJ', name: 'Djibouti', nameAr: 'جيبوتي', dialCode: '253', flag: '🇩🇯' },
  { code: 'DM', name: 'Dominica', nameAr: 'دومينيكا', dialCode: '1767', flag: '🇩🇲' },
  { code: 'DO', name: 'Dominican Republic', nameAr: 'جمهورية الدومينيكان', dialCode: '1809', flag: '🇩🇴' },
  { code: 'EC', name: 'Ecuador', nameAr: 'الإكوادور', dialCode: '593', flag: '🇪🇨' },
  { code: 'EG', name: 'Egypt', nameAr: 'مصر', dialCode: '20', flag: '🇪🇬' },
  { code: 'SV', name: 'El Salvador', nameAr: 'السلفادور', dialCode: '503', flag: '🇸🇻' },
  { code: 'GQ', name: 'Equatorial Guinea', nameAr: 'غينيا الاستوائية', dialCode: '240', flag: '🇬🇶' },
  { code: 'ER', name: 'Eritrea', nameAr: 'إريتريا', dialCode: '291', flag: '🇪🇷' },
  { code: 'EE', name: 'Estonia', nameAr: 'إستونيا', dialCode: '372', flag: '🇪🇪' },
  { code: 'SZ', name: 'Eswatini', nameAr: 'إسواتيني', dialCode: '268', flag: '🇸🇿' },
  { code: 'ET', name: 'Ethiopia', nameAr: 'إثيوبيا', dialCode: '251', flag: '🇪🇹' },
  { code: 'FJ', name: 'Fiji', nameAr: 'فيجي', dialCode: '679', flag: '🇫🇯' },
  { code: 'FI', name: 'Finland', nameAr: 'فنلندا', dialCode: '358', flag: '🇫🇮' },
  { code: 'FR', name: 'France', nameAr: 'فرنسا', dialCode: '33', flag: '🇫🇷' },
  { code: 'GA', name: 'Gabon', nameAr: 'الغابون', dialCode: '241', flag: '🇬🇦' },
  { code: 'GM', name: 'Gambia', nameAr: 'غامبيا', dialCode: '220', flag: '🇬🇲' },
  { code: 'GE', name: 'Georgia', nameAr: 'جورجيا', dialCode: '995', flag: '🇬🇪' },
  { code: 'DE', name: 'Germany', nameAr: 'ألمانيا', dialCode: '49', flag: '🇩🇪' },
  { code: 'GH', name: 'Ghana', nameAr: 'غانا', dialCode: '233', flag: '🇬🇭' },
  { code: 'GR', name: 'Greece', nameAr: 'اليونان', dialCode: '30', flag: '🇬🇷' },
  { code: 'GD', name: 'Grenada', nameAr: 'غرينادا', dialCode: '1473', flag: '🇬🇩' },
  { code: 'GT', name: 'Guatemala', nameAr: 'غواتيمالا', dialCode: '502', flag: '🇬🇹' },
  { code: 'GN', name: 'Guinea', nameAr: 'غينيا', dialCode: '224', flag: '🇬🇳' },
  { code: 'GW', name: 'Guinea-Bissau', nameAr: 'غينيا بيساو', dialCode: '245', flag: '🇬🇼' },
  { code: 'GY', name: 'Guyana', nameAr: 'غيانا', dialCode: '592', flag: '🇬🇾' },
  { code: 'HT', name: 'Haiti', nameAr: 'هايتي', dialCode: '509', flag: '🇭🇹' },
  { code: 'HN', name: 'Honduras', nameAr: 'هندوراس', dialCode: '504', flag: '🇭🇳' },
  { code: 'HK', name: 'Hong Kong', nameAr: 'هونغ كونغ', dialCode: '852', flag: '🇭🇰' },
  { code: 'HU', name: 'Hungary', nameAr: 'المجر', dialCode: '36', flag: '🇭🇺' },
  { code: 'IS', name: 'Iceland', nameAr: 'آيسلندا', dialCode: '354', flag: '🇮🇸' },
  { code: 'IN', name: 'India', nameAr: 'الهند', dialCode: '91', flag: '🇮🇳' },
  { code: 'ID', name: 'Indonesia', nameAr: 'إندونيسيا', dialCode: '62', flag: '🇮🇩' },
  { code: 'IR', name: 'Iran', nameAr: 'إيران', dialCode: '98', flag: '🇮🇷' },
  { code: 'IE', name: 'Ireland', nameAr: 'أيرلندا', dialCode: '353', flag: '🇮🇪' },
  { code: 'IL', name: 'Israel', nameAr: 'إسرائيل', dialCode: '972', flag: '🇮🇱' },
  { code: 'IT', name: 'Italy', nameAr: 'إيطاليا', dialCode: '39', flag: '🇮🇹' },
  { code: 'JM', name: 'Jamaica', nameAr: 'جامايكا', dialCode: '1876', flag: '🇯🇲' },
  { code: 'JP', name: 'Japan', nameAr: 'اليابان', dialCode: '81', flag: '🇯🇵' },
  { code: 'JO', name: 'Jordan', nameAr: 'الأردن', dialCode: '962', flag: '🇯🇴' },
  { code: 'KZ', name: 'Kazakhstan', nameAr: 'كازاخستان', dialCode: '7', flag: '🇰🇿' },
  { code: 'KE', name: 'Kenya', nameAr: 'كينيا', dialCode: '254', flag: '🇰🇪' },
  { code: 'KI', name: 'Kiribati', nameAr: 'كيريباتي', dialCode: '686', flag: '🇰🇮' },
  { code: 'KW', name: 'Kuwait', nameAr: 'الكويت', dialCode: '965', flag: '🇰🇼' },
  { code: 'KG', name: 'Kyrgyzstan', nameAr: 'قيرغيزستان', dialCode: '996', flag: '🇰🇬' },
  { code: 'LA', name: 'Laos', nameAr: 'لاوس', dialCode: '856', flag: '🇱🇦' },
  { code: 'LV', name: 'Latvia', nameAr: 'لاتفيا', dialCode: '371', flag: '🇱🇻' },
  { code: 'LB', name: 'Lebanon', nameAr: 'لبنان', dialCode: '961', flag: '🇱🇧' },
  { code: 'LS', name: 'Lesotho', nameAr: 'ليسوتو', dialCode: '266', flag: '🇱🇸' },
  { code: 'LR', name: 'Liberia', nameAr: 'ليبيريا', dialCode: '231', flag: '🇱🇷' },
  { code: 'LY', name: 'Libya', nameAr: 'ليبيا', dialCode: '218', flag: '🇱🇾' },
  { code: 'LI', name: 'Liechtenstein', nameAr: 'ليختنشتاين', dialCode: '423', flag: '🇱🇮' },
  { code: 'LT', name: 'Lithuania', nameAr: 'ليتوانيا', dialCode: '370', flag: '🇱🇹' },
  { code: 'LU', name: 'Luxembourg', nameAr: 'لوكسمبورغ', dialCode: '352', flag: '🇱🇺' },
  { code: 'MO', name: 'Macau', nameAr: 'ماكاو', dialCode: '853', flag: '🇲🇴' },
  { code: 'MG', name: 'Madagascar', nameAr: 'مدغشقر', dialCode: '261', flag: '🇲🇬' },
  { code: 'MW', name: 'Malawi', nameAr: 'مالاوي', dialCode: '265', flag: '🇲🇼' },
  { code: 'MY', name: 'Malaysia', nameAr: 'ماليزيا', dialCode: '60', flag: '🇲🇾' },
  { code: 'MV', name: 'Maldives', nameAr: 'المالديف', dialCode: '960', flag: '🇲🇻' },
  { code: 'ML', name: 'Mali', nameAr: 'مالي', dialCode: '223', flag: '🇲🇱' },
  { code: 'MT', name: 'Malta', nameAr: 'مالطا', dialCode: '356', flag: '🇲🇹' },
  { code: 'MR', name: 'Mauritania', nameAr: 'موريتانيا', dialCode: '222', flag: '🇲🇷' },
  { code: 'MU', name: 'Mauritius', nameAr: 'موريشيوس', dialCode: '230', flag: '🇲🇺' },
  { code: 'MX', name: 'Mexico', nameAr: 'المكسيك', dialCode: '52', flag: '🇲🇽' },
  { code: 'MD', name: 'Moldova', nameAr: 'مولدوفا', dialCode: '373', flag: '🇲🇩' },
  { code: 'MC', name: 'Monaco', nameAr: 'موناكو', dialCode: '377', flag: '🇲🇨' },
  { code: 'MN', name: 'Mongolia', nameAr: 'منغوليا', dialCode: '976', flag: '🇲🇳' },
  { code: 'ME', name: 'Montenegro', nameAr: 'الجبل الأسود', dialCode: '382', flag: '🇲🇪' },
  { code: 'MA', name: 'Morocco', nameAr: 'المغرب', dialCode: '212', flag: '🇲🇦' },
  { code: 'MZ', name: 'Mozambique', nameAr: 'موزمبيق', dialCode: '258', flag: '🇲🇿' },
  { code: 'MM', name: 'Myanmar', nameAr: 'ميانمار', dialCode: '95', flag: '🇲🇲' },
  { code: 'NA', name: 'Namibia', nameAr: 'ناميبيا', dialCode: '264', flag: '🇳🇦' },
  { code: 'NP', name: 'Nepal', nameAr: 'نيبال', dialCode: '977', flag: '🇳🇵' },
  { code: 'NL', name: 'Netherlands', nameAr: 'هولندا', dialCode: '31', flag: '🇳🇱' },
  { code: 'NZ', name: 'New Zealand', nameAr: 'نيوزيلندا', dialCode: '64', flag: '🇳🇿' },
  { code: 'NI', name: 'Nicaragua', nameAr: 'نيكاراغوا', dialCode: '505', flag: '🇳🇮' },
  { code: 'NE', name: 'Niger', nameAr: 'النيجر', dialCode: '227', flag: '🇳🇪' },
  { code: 'NG', name: 'Nigeria', nameAr: 'نيجيريا', dialCode: '234', flag: '🇳🇬' },
  { code: 'KP', name: 'North Korea', nameAr: 'كوريا الشمالية', dialCode: '850', flag: '🇰🇵' },
  { code: 'MK', name: 'North Macedonia', nameAr: 'مقدونيا الشمالية', dialCode: '389', flag: '🇲🇰' },
  { code: 'NO', name: 'Norway', nameAr: 'النرويج', dialCode: '47', flag: '🇳🇴' },
  { code: 'OM', name: 'Oman', nameAr: 'عُمان', dialCode: '968', flag: '🇴🇲' },
  { code: 'PK', name: 'Pakistan', nameAr: 'باكستان', dialCode: '92', flag: '🇵🇰' },
  { code: 'PW', name: 'Palau', nameAr: 'بالاو', dialCode: '680', flag: '🇵🇼' },
  { code: 'PS', name: 'Palestine', nameAr: 'فلسطين', dialCode: '970', flag: '🇵🇸' },
  { code: 'PA', name: 'Panama', nameAr: 'بنما', dialCode: '507', flag: '🇵🇦' },
  { code: 'PG', name: 'Papua New Guinea', nameAr: 'بابوا غينيا الجديدة', dialCode: '675', flag: '🇵🇬' },
  { code: 'PY', name: 'Paraguay', nameAr: 'باراغواي', dialCode: '595', flag: '🇵🇾' },
  { code: 'PE', name: 'Peru', nameAr: 'بيرو', dialCode: '51', flag: '🇵🇪' },
  { code: 'PH', name: 'Philippines', nameAr: 'الفلبين', dialCode: '63', flag: '🇵🇭' },
  { code: 'PL', name: 'Poland', nameAr: 'بولندا', dialCode: '48', flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal', nameAr: 'البرتغال', dialCode: '351', flag: '🇵🇹' },
  { code: 'QA', name: 'Qatar', nameAr: 'قطر', dialCode: '974', flag: '🇶🇦' },
  { code: 'RO', name: 'Romania', nameAr: 'رومانيا', dialCode: '40', flag: '🇷🇴' },
  { code: 'RU', name: 'Russia', nameAr: 'روسيا', dialCode: '7', flag: '🇷🇺' },
  { code: 'RW', name: 'Rwanda', nameAr: 'رواندا', dialCode: '250', flag: '🇷🇼' },
  { code: 'WS', name: 'Samoa', nameAr: 'ساموا', dialCode: '685', flag: '🇼🇸' },
  { code: 'SM', name: 'San Marino', nameAr: 'سان مارينو', dialCode: '378', flag: '🇸🇲' },
  { code: 'SA', name: 'Saudi Arabia', nameAr: 'المملكة العربية السعودية', dialCode: '966', flag: '🇸🇦' },
  { code: 'SN', name: 'Senegal', nameAr: 'السنغال', dialCode: '221', flag: '🇸🇳' },
  { code: 'RS', name: 'Serbia', nameAr: 'صربيا', dialCode: '381', flag: '🇷🇸' },
  { code: 'SC', name: 'Seychelles', nameAr: 'سيشل', dialCode: '248', flag: '🇸🇨' },
  { code: 'SL', name: 'Sierra Leone', nameAr: 'سيراليون', dialCode: '232', flag: '🇸🇱' },
  { code: 'SG', name: 'Singapore', nameAr: 'سنغافورة', dialCode: '65', flag: '🇸🇬' },
  { code: 'SK', name: 'Slovakia', nameAr: 'سلوفاكيا', dialCode: '421', flag: '🇸🇰' },
  { code: 'SI', name: 'Slovenia', nameAr: 'سلوفينيا', dialCode: '386', flag: '🇸🇮' },
  { code: 'SO', name: 'Somalia', nameAr: 'الصومال', dialCode: '252', flag: '🇸🇴' },
  { code: 'ZA', name: 'South Africa', nameAr: 'جنوب أفريقيا', dialCode: '27', flag: '🇿🇦' },
  { code: 'KR', name: 'South Korea', nameAr: 'كوريا الجنوبية', dialCode: '82', flag: '🇰🇷' },
  { code: 'SS', name: 'South Sudan', nameAr: 'جنوب السودان', dialCode: '211', flag: '🇸🇸' },
  { code: 'ES', name: 'Spain', nameAr: 'إسبانيا', dialCode: '34', flag: '🇪🇸' },
  { code: 'LK', name: 'Sri Lanka', nameAr: 'سريلانكا', dialCode: '94', flag: '🇱🇰' },
  { code: 'SD', name: 'Sudan', nameAr: 'السودان', dialCode: '249', flag: '🇸🇩' },
  { code: 'SR', name: 'Suriname', nameAr: 'سورينام', dialCode: '597', flag: '🇸🇷' },
  { code: 'SE', name: 'Sweden', nameAr: 'السويد', dialCode: '46', flag: '🇸🇪' },
  { code: 'CH', name: 'Switzerland', nameAr: 'سويسرا', dialCode: '41', flag: '🇨🇭' },
  { code: 'SY', name: 'Syria', nameAr: 'سوريا', dialCode: '963', flag: '🇸🇾' },
  { code: 'TW', name: 'Taiwan', nameAr: 'تايوان', dialCode: '886', flag: '🇹🇼' },
  { code: 'TJ', name: 'Tajikistan', nameAr: 'طاجيكستان', dialCode: '992', flag: '🇹🇯' },
  { code: 'TZ', name: 'Tanzania', nameAr: 'تنزانيا', dialCode: '255', flag: '🇹🇿' },
  { code: 'TH', name: 'Thailand', nameAr: 'تايلاند', dialCode: '66', flag: '🇹🇭' },
  { code: 'TL', name: 'Timor-Leste', nameAr: 'تيمور الشرقية', dialCode: '670', flag: '🇹🇱' },
  { code: 'TG', name: 'Togo', nameAr: 'توغو', dialCode: '228', flag: '🇹🇬' },
  { code: 'TO', name: 'Tonga', nameAr: 'تونغا', dialCode: '676', flag: '🇹🇴' },
  { code: 'TT', name: 'Trinidad and Tobago', nameAr: 'ترينيداد وتوباغو', dialCode: '1868', flag: '🇹🇹' },
  { code: 'TN', name: 'Tunisia', nameAr: 'تونس', dialCode: '216', flag: '🇹🇳' },
  { code: 'TR', name: 'Turkey', nameAr: 'تركيا', dialCode: '90', flag: '🇹🇷' },
  { code: 'TM', name: 'Turkmenistan', nameAr: 'تركمانستان', dialCode: '993', flag: '🇹🇲' },
  { code: 'UG', name: 'Uganda', nameAr: 'أوغندا', dialCode: '256', flag: '🇺🇬' },
  { code: 'UA', name: 'Ukraine', nameAr: 'أوكرانيا', dialCode: '380', flag: '🇺🇦' },
  { code: 'AE', name: 'United Arab Emirates', nameAr: 'الإمارات العربية المتحدة', dialCode: '971', flag: '🇦🇪' },
  { code: 'GB', name: 'United Kingdom', nameAr: 'المملكة المتحدة', dialCode: '44', flag: '🇬🇧' },
  { code: 'US', name: 'United States', nameAr: 'الولايات المتحدة', dialCode: '1', flag: '🇺🇸' },
  { code: 'UY', name: 'Uruguay', nameAr: 'أوروغواي', dialCode: '598', flag: '🇺🇾' },
  { code: 'UZ', name: 'Uzbekistan', nameAr: 'أوزبكستان', dialCode: '998', flag: '🇺🇿' },
  { code: 'VU', name: 'Vanuatu', nameAr: 'فانواتو', dialCode: '678', flag: '🇻🇺' },
  { code: 'VA', name: 'Vatican City', nameAr: 'الفاتيكان', dialCode: '379', flag: '🇻🇦' },
  { code: 'VE', name: 'Venezuela', nameAr: 'فنزويلا', dialCode: '58', flag: '🇻🇪' },
  { code: 'VN', name: 'Vietnam', nameAr: 'فيتنام', dialCode: '84', flag: '🇻🇳' },
  { code: 'YE', name: 'Yemen', nameAr: 'اليمن', dialCode: '967', flag: '🇾🇪' },
  { code: 'ZM', name: 'Zambia', nameAr: 'زامبيا', dialCode: '260', flag: '🇿🇲' },
  { code: 'ZW', name: 'Zimbabwe', nameAr: 'زيمبابوي', dialCode: '263', flag: '🇿🇼' },
];

// Region grouping for the country dropdown — Iraq + neighbors first, then alpha.
const PRIORITY_CODES = ['IQ', 'SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'JO', 'SY', 'LB', 'PS', 'EG', 'TR', 'IR'];

export function getCountriesForSelect(language: 'en' | 'ar' = 'en') {
  const priority = PRIORITY_CODES
    .map(code => COUNTRIES.find(c => c.code === code))
    .filter((c): c is Country => Boolean(c));
  const rest = COUNTRIES
    .filter(c => !PRIORITY_CODES.includes(c.code))
    .sort((a, b) => (language === 'ar' ? a.nameAr.localeCompare(b.nameAr, 'ar') : a.name.localeCompare(b.name)));
  return [...priority, ...rest];
}

export function getCountryByCode(code?: string | null): Country | undefined {
  if (!code) return undefined;
  return COUNTRIES.find(c => c.code === code.toUpperCase());
}

export function getCountryByDialCode(dialCode?: string | null): Country | undefined {
  if (!dialCode) return undefined;
  const clean = String(dialCode).replace(/\D/g, '');
  // Prefer longer matches first (e.g. "1242" before "1") but rank Iraq, US, UK at top of ties.
  const sorted = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  return sorted.find(c => c.dialCode === clean);
}

/**
 * Splits a stored phone like "+9647712345678" into { dialCode, national } parts.
 * Falls back to default 'IQ' (+964) when nothing parses.
 */
export function parsePhone(input?: string | null): { country: Country; national: string } {
  const fallback = COUNTRIES.find(c => c.code === 'IQ')!;
  if (!input) return { country: fallback, national: '' };
  const digits = String(input).replace(/[^\d+]/g, '');
  if (!digits) return { country: fallback, national: '' };
  const stripped = digits.startsWith('+') ? digits.slice(1) : digits;
  // Try the longest matching dial code (4 → 1 digits)
  const sorted = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  for (const c of sorted) {
    if (stripped.startsWith(c.dialCode)) {
      return { country: c, national: stripped.slice(c.dialCode.length) };
    }
  }
  return { country: fallback, national: stripped };
}

/** Combines a dial code + national number into the canonical "+<dial><number>" form. */
export function buildE164(dialCode: string, national: string): string {
  const clean = (national || '').replace(/\D/g, '');
  if (!clean) return '';
  return `+${dialCode}${clean}`;
}
