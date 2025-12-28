import { useEffect, useRef } from 'react';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';
import { Crepe } from '@milkdown/crepe';
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener';
import '@milkdown/crepe/theme/common/style.css';
import { useSettingsStore } from '@/store/useSettingsStore';
import { FloatingAI } from './FloatingAI';

interface MilkdownEditorProps {
  initialContent: string;
  onChange: (markdown: string) => void;
  readOnly?: boolean;
}

const Editor = ({ initialContent, onChange, readOnly = false }: MilkdownEditorProps) => {
  const { theme } = useSettingsStore();
  
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

  return <Milkdown />;
};

export default function MilkdownEditorWrapper(props: MilkdownEditorProps) {
  const { fontSize, pageWidth } = useSettingsStore();

  return (
    <MilkdownProvider>
      <div 
        className="h-full w-full overflow-hidden milkdown-container relative"
        style={{ 
          '--editor-font-size': `${fontSize}px`,
        } as React.CSSProperties}
      >
        <div className={`h-full overflow-y-auto ${pageWidth === 'narrow' ? 'max-w-6xl mx-auto bg-background shadow-sm' : 'w-full'}`}>
          <div style={{ fontSize: `${fontSize}px` }}>
            <Editor {...props} />
          </div>
          <FloatingAI />
        </div>
      </div>
    </MilkdownProvider>
  );
}
