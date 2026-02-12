import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Milkdown, MilkdownProvider, useEditor, useInstance } from '@milkdown/react';
import { Crepe } from '@milkdown/crepe';
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener';
import { editorViewCtx } from '@milkdown/core';
import '@milkdown/crepe/theme/common/style.css';
import '@/milkdown-slash-menu.css';
import { useSettingsStore } from '@/store/useSettingsStore';
import { normalizeForClipboard } from '@/lib/markdown';
// import { FloatingAI } from './FloatingAI';

export interface MilkdownEditorRef {
  focus: () => void;
}

interface MilkdownEditorProps {
  initialContent: string;
  onChange: (markdown: string) => void;
  readOnly?: boolean;
}

const Editor = ({ initialContent, onChange, readOnly = false, editorRef }: MilkdownEditorProps & { editorRef?: React.RefObject<MilkdownEditorRef> }) => {
  const { theme } = useSettingsStore();
  const [loading, getInstance] = useInstance();
  const editorContainerRef = useRef<HTMLDivElement>(null);

  useEditor((root) => {
    const crepe = new Crepe({
      root,
      defaultValue: initialContent,
      feature: {
        [Crepe.Feature.CodeMirror]: true,
        [Crepe.Feature.ImageBlock]: true,
        [Crepe.Feature.BlockEdit]: true,
        [Crepe.Feature.Placeholder]: true,
      },
    });

    crepe.editor
      .config((ctx) => {
        ctx.get(listenerCtx).markdownUpdated((ctx, markdown, prevMarkdown) => {
          if (markdown !== prevMarkdown) {
            onChange(markdown);
          }
        });
      })
      .use(listener);

    if (readOnly) {
      crepe.setReadonly(true);
    }

    return crepe;
  }, []); // Empty dependency array to prevent re-initialization on content change

  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container) return;

    const handleCopy = (event: ClipboardEvent) => {
      const selection = window.getSelection()?.toString() ?? '';
      if (!selection) return;
      if (!event.clipboardData) return;

      event.preventDefault();
      event.clipboardData.setData('text/plain', normalizeForClipboard(selection));
    };

    container.addEventListener('copy', handleCopy);
    return () => container.removeEventListener('copy', handleCopy);
  }, []);

  useImperativeHandle(editorRef, () => ({
    focus: () => {
      const editor = getInstance();
      if (editor) {
        editor.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          view.focus();
        });
      }
    }
  }), [getInstance]);

  return (
    <div ref={editorContainerRef} className="h-full">
      <Milkdown />
    </div>
  );
};

const MilkdownEditorWrapper = forwardRef<MilkdownEditorRef, MilkdownEditorProps>(
  function MilkdownEditorWrapper(props, ref) {
    const { fontSize, pageWidth } = useSettingsStore();
    const internalRef = useRef<MilkdownEditorRef>(null);
    const editorRef = (ref as React.RefObject<MilkdownEditorRef>) || internalRef;

    return (
      <MilkdownProvider>
        <div
          className="h-full w-full overflow-y-auto milkdown-container relative"
          style={{
            '--editor-font-size': `${fontSize}px`,
          } as React.CSSProperties}
        >
          <div className={pageWidth === 'narrow' ? 'max-w-6xl mx-auto bg-background' : 'w-full'}>
            <div style={{ fontSize: `${fontSize}px` }}>
              <Editor {...props} editorRef={editorRef} />
            </div>
            {/* <FloatingAI /> */}
          </div>
        </div>
      </MilkdownProvider>
    );
  }
);

export default MilkdownEditorWrapper;
