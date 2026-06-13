import packageJson from '../../package.json'

export type LanguageCode = 'ko' | 'en'

export type TranslationKey =
  | 'settings.title'
  | 'settings.description'
  | 'settings.versionLabel'
  | 'settings.languageLabel'
  | 'settings.language.korean'
  | 'settings.language.english'
  | 'settings.close'
  | 'settings.openAriaLabel'

export const DEFAULT_LANGUAGE: LanguageCode = 'ko'

export const LANGUAGE_STORAGE_KEY = 'markan:language'

export const APP_VERSION = packageJson.version

export const SUPPORTED_LANGUAGES: Array<{
  code: LanguageCode
  label: string
  nativeLabel: string
}> = [
  { code: 'ko', label: '한국어', nativeLabel: '한국어' },
  { code: 'en', label: 'English', nativeLabel: 'English' },
]

const TRANSLATIONS: Record<LanguageCode, Record<TranslationKey, string>> = {
  ko: {
    'settings.title': '설정',
    'settings.description': 'MarkAn 환경을 설정합니다.',
    'settings.versionLabel': '현재 버전',
    'settings.languageLabel': '언어',
    'settings.language.korean': '한국어',
    'settings.language.english': '영어',
    'settings.close': '닫기',
    'settings.openAriaLabel': '설정 열기',
  },
  en: {
    'settings.title': 'Settings',
    'settings.description': 'Configure MarkAn preferences.',
    'settings.versionLabel': 'Current version',
    'settings.languageLabel': 'Language',
    'settings.language.korean': 'Korean',
    'settings.language.english': 'English',
    'settings.close': 'Close',
    'settings.openAriaLabel': 'Open settings',
  },
}

export const isLanguageCode = (value: unknown): value is LanguageCode =>
  value === 'ko' || value === 'en'

export const resolveLanguage = (value: unknown): LanguageCode =>
  isLanguageCode(value) ? value : DEFAULT_LANGUAGE

export const getStoredLanguage = (): LanguageCode => {
  if (typeof localStorage === 'undefined') {
    return DEFAULT_LANGUAGE
  }

  return resolveLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY))
}

export const storeLanguage = (language: LanguageCode) => {
  if (typeof localStorage === 'undefined') {
    return
  }

  localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
}

export const createTranslator =
  (language: LanguageCode) =>
  (key: TranslationKey): string =>
    TRANSLATIONS[language][key]
