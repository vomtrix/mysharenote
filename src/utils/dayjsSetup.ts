import i18n from '@utils/i18n';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(localizedFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

dayjs.locale(i18n.language || 'en');

i18n.on('languageChanged', (lng) => {
  dayjs.locale(lng || 'en');
});

try {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (tz) dayjs.tz.setDefault(tz);
} catch (_) {}

export default dayjs;
