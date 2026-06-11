import { useEffect, useRef, useState } from 'react'
import { renderMathToHtml } from './MathRenderer'

type MathInputModalProps = {
  initialLatex: string
  initialDisplayMode: boolean
  mode: 'create' | 'edit'
  onApply: (latex: string, displayMode: boolean) => void
  onCancel: () => void
}

const EXAMPLES = ['E = mc^2', '\\frac{a}{b}', '\\int_0^1 x^2 dx = \\frac{1}{3}']

export function MathInputModal({
  initialLatex,
  initialDisplayMode,
  mode,
  onApply,
  onCancel,
}: MathInputModalProps) {
  const [latex, setLatex] = useState(initialLatex)
  const [displayMode, setDisplayMode] = useState(initialDisplayMode)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const rendered = renderMathToHtml(latex, displayMode)
  const trimmed = latex.trim()
  const canApply = trimmed.length > 0 && !rendered.error

  useEffect(() => {
    const textarea = textareaRef.current

    if (textarea) {
      textarea.focus()
      textarea.select()
    }
  }, [])

  const handleApply = () => {
    if (!canApply) {
      return
    }

    onApply(trimmed, displayMode)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Keep the modal's keys from reaching the global shortcut handler / document.
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      onCancel()
      return
    }

    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()
      handleApply()
    }
  }

  return (
    <div
      className="math-modal-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel()
        }
      }}
    >
      <div
        className="math-modal"
        role="dialog"
        aria-label={mode === 'edit' ? '수식 편집' : '수식 입력'}
        onKeyDown={handleKeyDown}
      >
        <div className="math-modal-header">
          <span>{mode === 'edit' ? '수식 편집' : '수식 입력'}</span>
          <label className="math-modal-display-toggle">
            <input
              type="checkbox"
              checked={displayMode}
              onChange={(event) => setDisplayMode(event.currentTarget.checked)}
            />
            <span>Display mode</span>
          </label>
        </div>

        <textarea
          ref={textareaRef}
          className="math-modal-input"
          value={latex}
          spellCheck={false}
          placeholder="예: E = mc^2"
          onChange={(event) => setLatex(event.currentTarget.value)}
          rows={4}
        />

        <div className="math-modal-preview-label">미리보기</div>
        <div className="math-modal-preview">
          {trimmed.length === 0 ? (
            <span className="math-modal-preview-placeholder">LaTeX를 입력하세요.</span>
          ) : rendered.error ? (
            <span className="math-modal-preview-error">수식 오류: {rendered.error}</span>
          ) : (
            <span
              className={displayMode ? 'math-modal-preview-display' : ''}
              dangerouslySetInnerHTML={{ __html: rendered.html }}
            />
          )}
        </div>

        <div className="math-modal-examples">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              className="math-modal-example"
              onClick={() => setLatex(example)}
            >
              {example}
            </button>
          ))}
        </div>

        <div className="math-modal-actions">
          <button type="button" className="tool-button" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="tool-button primary"
            onClick={handleApply}
            disabled={!canApply}
            title="Apply (⌘⏎)"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}
