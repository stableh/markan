import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  APP_VERSION,
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  createTranslator,
  getStoredLanguage,
  isLanguageCode,
  resolveLanguage,
  storeLanguage,
} from './languages'

const createStorage = (initial: Record<string, string> = {}): Storage => {
  const values = new Map(Object.entries(initial))

  return {
    get length() {
      return values.size
    },
    clear: vi.fn(() => values.clear()),
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    key: vi.fn((index: number) => Array.from(values.keys())[index] ?? null),
    removeItem: vi.fn((key: string) => values.delete(key)),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value)
    }),
  }
}

describe('languages', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('defines Korean and English as supported languages', () => {
    expect(DEFAULT_LANGUAGE).toBe('ko')
    expect(SUPPORTED_LANGUAGES).toEqual([
      { code: 'ko', label: '한국어', nativeLabel: '한국어' },
      { code: 'en', label: 'English', nativeLabel: 'English' },
    ])
    expect(isLanguageCode('ko')).toBe(true)
    expect(isLanguageCode('en')).toBe(true)
    expect(isLanguageCode('ja')).toBe(false)
  })

  it('falls back to Korean for unsupported language values', () => {
    expect(resolveLanguage('en')).toBe('en')
    expect(resolveLanguage('ko')).toBe('ko')
    expect(resolveLanguage('')).toBe('ko')
    expect(resolveLanguage(null)).toBe('ko')
    expect(resolveLanguage('fr')).toBe('ko')
  })

  it('stores and restores the selected language from localStorage', () => {
    const storage = createStorage()
    vi.stubGlobal('localStorage', storage)

    storeLanguage('en')

    expect(storage.setItem).toHaveBeenCalledWith('markan:language', 'en')
    expect(getStoredLanguage()).toBe('en')
  })

  it('ignores invalid stored language values', () => {
    vi.stubGlobal('localStorage', createStorage({ 'markan:language': 'fr' }))

    expect(getStoredLanguage()).toBe('ko')
  })

  it('translates settings strings for both languages', () => {
    expect(createTranslator('ko')('settings.title')).toBe('설정')
    expect(createTranslator('ko')('settings.language.korean')).toBe('한국어')
    expect(createTranslator('en')('settings.title')).toBe('Settings')
    expect(createTranslator('en')('settings.language.korean')).toBe('Korean')
  })

  it('exports the current app version for the settings dialog', () => {
    expect(APP_VERSION).toBe('0.0.0')
  })
})
