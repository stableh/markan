import { useImperativeHandle, forwardRef, useRef, useLayoutEffect } from 'react';
import type { CSSProperties } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import type { MilkdownEditorRef } from '@/components/editor/MilkdownEditor';
import { toPlainDisplay, fromPlainDisplay } from '@/lib/markdown';

interface PlainTextEditorProps {
  content: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

const PlainTextEditor = forwardRef<MilkdownEditorRef, PlainTextEditorProps>(
  function PlainTextEditor({ content, onChange, readOnly = false }, ref) {
    const { fontSize, pageWidth } = useSettingsStore();
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        textareaRef.current?.focus();
      },
    }));

    const displayValue = toPlainDisplay(content);

    useLayoutEffect(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.style.height = '0px';
      const parentHeight = el.parentElement?.clientHeight ?? 0;
      const nextHeight = Math.max(el.scrollHeight, parentHeight);
      el.style.height = `${nextHeight}px`;
    }, [displayValue, fontSize, pageWidth]);

    return (
      <div
        className="h-full w-full overflow-y-auto plain-editor-container relative"
        style={{
          '--editor-font-size': `${fontSize}px`,
        } as CSSProperties}
      >
        <div className={pageWidth === 'narrow' ? 'max-w-6xl mx-auto bg-background' : 'w-full'}>
          <textarea
            ref={textareaRef}
            value={displayValue}
            onChange={(e) => onChange(fromPlainDisplay(e.target.value))}
            readOnly={readOnly}
            spellCheck
            className="plain-editor"
            placeholder="Start writing..."
          />
        </div>
      </div>
    );
  }
);

export default PlainTextEditor;
