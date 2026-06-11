import { describe, expect, it } from 'vitest'
import { renderMathToHtml } from './MathRenderer'

describe('renderMathToHtml', () => {
  it('renders valid LaTeX to KaTeX html', () => {
    const result = renderMathToHtml('E = mc^2', false)
    expect(result.error).toBeNull()
    expect(result.html).toContain('katex')
  })

  it('renders fractions and integrals without error', () => {
    expect(renderMathToHtml('\\frac{a}{b}', false).error).toBeNull()
    expect(renderMathToHtml('\\int_0^1 x^2 dx = \\frac{1}{3}', true).error).toBeNull()
  })

  it('returns a user-facing error for invalid LaTeX without throwing', () => {
    const result = renderMathToHtml('\\frac{a}{', false)
    expect(result.error).not.toBeNull()
    expect(result.html).toBe('')
    // No raw stack trace leakage — message stays short.
    expect(result.error).not.toContain('\n')
  })

  it('treats empty input as neutral', () => {
    const result = renderMathToHtml('   ', false)
    expect(result.error).toBeNull()
    expect(result.html).toBe('')
  })
})
