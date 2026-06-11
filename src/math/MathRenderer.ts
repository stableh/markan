import katex from 'katex'

/** Default math font size in PDF units (a touch larger than body text). */
export const DEFAULT_MATH_FONT_SIZE = 18
/** Small fixed inner padding (PDF units) so a background/box doesn't hug the glyphs. */
export const MATH_BOX_PADDING = 4

export type MathRenderResult = {
  html: string
  error: string | null
}

/**
 * Turns a KaTeX/ProseMirror-style technical error into a short, user-facing message.
 * Raw stack traces and internal detail are kept out of the UI (logged to console instead).
 */
const cleanErrorMessage = (error: unknown): string => {
  const raw = error instanceof Error ? error.message : String(error)
  const stripped = raw.replace(/^KaTeX parse error:\s*/i, '').trim()
  return stripped.length > 0 ? stripped : '수식을 해석할 수 없습니다.'
}

/**
 * Safely renders LaTeX to KaTeX HTML.
 * Never throws — invalid input returns an error string so callers can show a fallback
 * without crashing the app.
 */
export const renderMathToHtml = (latex: string, displayMode: boolean): MathRenderResult => {
  const source = latex.trim()

  if (source.length === 0) {
    return { html: '', error: null }
  }

  try {
    const html = katex.renderToString(source, {
      displayMode,
      throwOnError: true,
      output: 'html',
      strict: false,
    })

    return { html, error: null }
  } catch (error) {
    // Technical details stay in the console only.
    console.error('KaTeX render failed', error)
    return { html: '', error: cleanErrorMessage(error) }
  }
}
