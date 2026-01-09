import { createInstance } from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import cn from '@config/translations/cn.json';
import en from '@config/translations/en.json';
import ru from '@config/translations/ru.json';

const i18nInstance = createInstance();

i18nInstance
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ru: { translation: ru },
      cn: { translation: cn }
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'ru', 'cn'],
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    },
    interpolation: {
      escapeValue: false
    }
  });

export default i18nInstance;
