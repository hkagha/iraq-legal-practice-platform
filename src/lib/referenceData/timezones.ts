// Curated IANA timezone list — Iraq + neighbors first, then global majors.

export interface Timezone {
  value: string;       // IANA name
  label: string;       // English label
  labelAr: string;
  offset: string;      // Short offset, informational
}

export const TIMEZONES: Timezone[] = [
  { value: 'Asia/Baghdad', label: 'Baghdad', labelAr: 'بغداد', offset: 'UTC+3' },
  { value: 'Asia/Riyadh', label: 'Riyadh', labelAr: 'الرياض', offset: 'UTC+3' },
  { value: 'Asia/Dubai', label: 'Dubai', labelAr: 'دبي', offset: 'UTC+4' },
  { value: 'Asia/Kuwait', label: 'Kuwait', labelAr: 'الكويت', offset: 'UTC+3' },
  { value: 'Asia/Qatar', label: 'Qatar', labelAr: 'قطر', offset: 'UTC+3' },
  { value: 'Asia/Bahrain', label: 'Bahrain', labelAr: 'البحرين', offset: 'UTC+3' },
  { value: 'Asia/Muscat', label: 'Muscat', labelAr: 'مسقط', offset: 'UTC+4' },
  { value: 'Asia/Amman', label: 'Amman', labelAr: 'عمّان', offset: 'UTC+3' },
  { value: 'Asia/Beirut', label: 'Beirut', labelAr: 'بيروت', offset: 'UTC+3' },
  { value: 'Asia/Damascus', label: 'Damascus', labelAr: 'دمشق', offset: 'UTC+3' },
  { value: 'Asia/Tehran', label: 'Tehran', labelAr: 'طهران', offset: 'UTC+3:30' },
  { value: 'Europe/Istanbul', label: 'Istanbul', labelAr: 'إسطنبول', offset: 'UTC+3' },
  { value: 'Africa/Cairo', label: 'Cairo', labelAr: 'القاهرة', offset: 'UTC+2' },
  { value: 'UTC', label: 'UTC', labelAr: 'التوقيت العالمي', offset: 'UTC+0' },
  { value: 'Europe/London', label: 'London', labelAr: 'لندن', offset: 'UTC+0' },
  { value: 'Europe/Paris', label: 'Paris', labelAr: 'باريس', offset: 'UTC+1' },
  { value: 'Europe/Berlin', label: 'Berlin', labelAr: 'برلين', offset: 'UTC+1' },
  { value: 'Europe/Rome', label: 'Rome', labelAr: 'روما', offset: 'UTC+1' },
  { value: 'Europe/Madrid', label: 'Madrid', labelAr: 'مدريد', offset: 'UTC+1' },
  { value: 'Europe/Moscow', label: 'Moscow', labelAr: 'موسكو', offset: 'UTC+3' },
  { value: 'America/New_York', label: 'New York', labelAr: 'نيويورك', offset: 'UTC-5' },
  { value: 'America/Chicago', label: 'Chicago', labelAr: 'شيكاغو', offset: 'UTC-6' },
  { value: 'America/Denver', label: 'Denver', labelAr: 'دنفر', offset: 'UTC-7' },
  { value: 'America/Los_Angeles', label: 'Los Angeles', labelAr: 'لوس أنجلوس', offset: 'UTC-8' },
  { value: 'America/Toronto', label: 'Toronto', labelAr: 'تورنتو', offset: 'UTC-5' },
  { value: 'America/Sao_Paulo', label: 'São Paulo', labelAr: 'ساو باولو', offset: 'UTC-3' },
  { value: 'Asia/Karachi', label: 'Karachi', labelAr: 'كراتشي', offset: 'UTC+5' },
  { value: 'Asia/Kolkata', label: 'Kolkata', labelAr: 'كولكاتا', offset: 'UTC+5:30' },
  { value: 'Asia/Bangkok', label: 'Bangkok', labelAr: 'بانكوك', offset: 'UTC+7' },
  { value: 'Asia/Singapore', label: 'Singapore', labelAr: 'سنغافورة', offset: 'UTC+8' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong', labelAr: 'هونغ كونغ', offset: 'UTC+8' },
  { value: 'Asia/Shanghai', label: 'Shanghai', labelAr: 'شنغهاي', offset: 'UTC+8' },
  { value: 'Asia/Tokyo', label: 'Tokyo', labelAr: 'طوكيو', offset: 'UTC+9' },
  { value: 'Australia/Sydney', label: 'Sydney', labelAr: 'سيدني', offset: 'UTC+10' },
];
