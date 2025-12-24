import { useEffect, useRef } from 'react';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';
import { Crepe } from '@milkdown/crepe';
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener';
import '@milkdown/crepe/theme/common/style.css';
import { useSettingsStore } from '@/store/useSettingsStore';

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
  return (
    <MilkdownProvider>
      <div className="h-full w-full overflow-hidden milkdown-container">
        <Editor {...props} />
      </div>
    </MilkdownProvider>
  );
}
