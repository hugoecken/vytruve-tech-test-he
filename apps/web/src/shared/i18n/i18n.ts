import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import { resources } from './resources';

const LANGUAGE_STORAGE_KEY = 'vytruve_language';

/**
 * Initializes localization from an explicit preference or browser language.
 *
 * @returns A promise resolved when translations and document language are ready.
 */
export async function initializeI18n(): Promise<void> {
  i18n.on('languageChanged', setDocumentLanguage);

  await i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      supportedLngs: ['en', 'fr'],
      fallbackLng: 'en',
      load: 'languageOnly',
      interpolation: {
        escapeValue: false,
      },
      detection: {
        order: ['localStorage', 'navigator'],
        lookupLocalStorage: LANGUAGE_STORAGE_KEY,
        caches: ['localStorage'],
      },
    });

  setDocumentLanguage(i18n.resolvedLanguage ?? 'en');
}

/**
 * Keeps the HTML language synchronized for assistive technology.
 *
 * @param language Resolved locale selected by i18next.
 */
function setDocumentLanguage(language: string): void {
  document.documentElement.lang = language;
}

export { i18n };
