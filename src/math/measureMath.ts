import { MATH_BOX_PADDING, renderMathToHtml } from './MathRenderer'

/**
 * Measures the natural rendered size (in PDF units) of a math expression at a given font size,
 * so a new Math Box can be created already fitting its content. DOM-based and synchronous
 * (KaTeX renders synchronously). Falls back to a small default on failure.
 */
export const measureMathSize = (
  latex: string,
  displayMode: boolean,
  fontSize: number,
): { width: number; height: number } => {
  const fallback = { width: 160, height: 48 }

  if (typeof document === 'undefined') {
    return fallback
  }

  const rendered = renderMathToHtml(latex, displayMode)
  const probe = document.createElement('div')
  Object.assign(probe.style, {
    position: 'fixed',
    left: '-100000px',
    top: '0',
    visibility: 'hidden',
    display: 'inline-block',
    boxSizing: 'border-box',
    padding: `${MATH_BOX_PADDING}px`,
    fontSize: `${fontSize}px`,
  } satisfies Partial<CSSStyleDeclaration>)

  const inner = document.createElement('span')
  if (rendered.error || latex.trim().length === 0) {
    inner.textContent = latex.trim() || 'math'
    inner.style.fontFamily = 'ui-monospace, Menlo, monospace'
  } else {
    inner.innerHTML = rendered.html
  }

  probe.appendChild(inner)
  document.body.appendChild(probe)

  try {
    const rect = probe.getBoundingClientRect()
    return {
      width: Math.max(24, Math.ceil(rect.width)),
      height: Math.max(20, Math.ceil(rect.height)),
    }
  } catch {
    return fallback
  } finally {
    probe.remove()
  }
}
