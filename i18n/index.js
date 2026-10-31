import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import kn from './locales/kn.json';

const LANGUAGE_KEY = 'app_language';

const languageDetector = {
  type: 'languageDetector',
  async: true,
  detect: async (callback) => {
    try {
      const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
      callback(saved === 'kn' ? 'kn' : 'en');
    } catch { callback('en'); }
  },
  init: () => {},
  cacheUserLanguage: async (lng) => {
    try { await AsyncStorage.setItem(LANGUAGE_KEY, lng); } catch { /* Language still works for this session. */ }
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      kn: { translation: kn },
    },
    fallbackLng: 'en',
    react: { useSuspense: false },
    interpolation: { escapeValue: false },
  });

export default i18n;
