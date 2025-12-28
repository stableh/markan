import { useState, useEffect, useRef } from 'react';
import { useInstance } from '@milkdown/react';
import { editorViewCtx } from '@milkdown/core';
import { Sparkles, ArrowUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const FloatingAI = () => {
  const [loading, getEditor] = useInstance();
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [candidates, setCandidates] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading) return;
    
    const update = () => {
        // If focus is inside the floating UI, keep it visible
        if (containerRef.current?.contains(document.activeElement)) {
            return;
        }

        const editor = getEditor();
        if (!editor) return;
        
        try {
            const ctx = editor.ctx;
            const view = ctx.get(editorViewCtx);
            if (!view || view.isDestroyed) return;

            const { state } = view;
            const { selection } = state;
            const { empty } = selection;

            if (empty) {
                setVisible(false);
                setCandidates([]); // Reset candidates when selection clears
                return;
            }

            // Check if selection is focused
            if (!view.hasFocus()) {
                // Optional: hide if editor lost focus? 
                // But clicking on the floating UI will steal focus.
                // So we should check if focus is within the floating UI or editor.
            }

            const domSelection = window.getSelection();
            if (!domSelection || domSelection.rangeCount === 0 || domSelection.isCollapsed) {
                 setVisible(false);
                 setCandidates([]);
                 return;
            }
            
            const range = domSelection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            // If rect is empty (e.g. hidden), hide
            if (rect.width === 0 && rect.height === 0) {
                setVisible(false);
                setCandidates([]);
                return;
            }

            // Position below the selection
            // Add some offset to avoid overlapping with the selection handle
            // If selection is near top, add more offset to avoid overlapping with Crepe's floating toolbar which might flip to bottom
            const isNearTop = rect.top < 100;
            const verticalOffset = isNearTop ? 60 : 10;

            const top = rect.bottom + verticalOffset;
            const left = rect.left + (rect.width / 2);
            
            setPosition({ top, left });
            setVisible(true);

        } catch (e) {
            // Ignore errors during initialization
        }
    };

    document.addEventListener('selectionchange', update);
    // Also update on scroll to keep position correct
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);

    return () => {
        document.removeEventListener('selectionchange', update);
        window.removeEventListener('scroll', update, true);
        window.removeEventListener('resize', update);
    };
  }, [loading, getEditor]);

  const handleSubmit = async (text: string = input) => {
      if (!text.trim() || isProcessing) return;
      setIsProcessing(true);
      setCandidates([]);
      
      const editor = getEditor();
      if (!editor) return;
      const ctx = editor.ctx;
      const view = ctx.get(editorViewCtx);

      // Mock AI processing
      setTimeout(() => {
          try {
            const { state } = view;
            const { from, to } = state.selection;
            const originalText = state.doc.textBetween(from, to);
            
            // Mock candidates based on the prompt
            const mockCandidates = [
                `${originalText} (Refined)`,
                `${originalText} (More concise)`,
                `${originalText} (Formal tone)`,
                `Summary: ${originalText.slice(0, 20)}...`
            ];
            
            setCandidates(mockCandidates);
            setInput('');
          } catch (e) {
              toast.error('Failed to generate options');
          } finally {
              setIsProcessing(false);
          }
      }, 1000);
  };

  const handleApply = (text: string) => {
      const editor = getEditor();
      if (!editor) return;
      const ctx = editor.ctx;
      const view = ctx.get(editorViewCtx);

      try {
        const { state, dispatch } = view;
        const { from, to } = state.selection;
        
        const tr = state.tr.replaceWith(from, to, state.schema.text(text));
        dispatch(tr);
        
        toast.success('Applied successfully');
        setVisible(false);
        setCandidates([]);
      } catch (e) {
          toast.error('Failed to apply changes');
      }
  };

  // Prevent the floating UI from closing when clicking inside it
  // Actually selectionchange might fire and clear selection if we click input?
  // No, clicking input keeps selection if we don't clear it.
  // But clicking input *does* move focus from editor to input.
  // If editor loses focus, selection might be visually hidden but it still exists in DOM usually.
  
  if (!visible) return null;

  return (
    <div 
        ref={containerRef}
        className="fixed z-50 flex flex-col gap-2 bg-background/95 backdrop-blur-sm border border-border/50 rounded-xl shadow-xl p-3 w-[320px] animate-in fade-in zoom-in-95 duration-200"
        style={{ 
            top: position.top, 
            left: position.left,
            transform: 'translateX(-50%)' 
        }}
        onMouseDown={(e) => e.stopPropagation()} // Prevent editor from losing focus/selection clearing?
    >
        {candidates.length > 0 ? (
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                    <span className="font-medium text-primary">Select an option</span>
                    <button 
                        onClick={() => setCandidates([])} 
                        className="hover:text-foreground transition-colors"
                    >
                        Back
                    </button>
                </div>
                <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto pr-1 scrollbar-thin">
                    {candidates.map((candidate, i) => (
                        <button
                            key={i}
                            onClick={() => handleApply(candidate)}
                            className="text-left text-sm p-2.5 rounded-lg bg-muted/30 hover:bg-muted border border-transparent hover:border-border transition-all hover:shadow-sm"
                        >
                            {candidate}
                        </button>
                    ))}
                </div>
            </div>
        ) : (
            <>
                {/* AI Input */}
                <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-1 border border-border/50">
                    <div className="p-1.5 bg-primary/10 rounded-md text-primary shrink-0">
                        {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    </div>
                    <input 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                        placeholder="Ask AI to edit..."
                        className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/70 min-w-0"
                        disabled={isProcessing}
                    />
                    <button 
                        onClick={() => handleSubmit()}
                        disabled={!input.trim() || isProcessing}
                        className="p-1.5 hover:bg-background rounded-md transition-colors disabled:opacity-50 text-muted-foreground hover:text-foreground"
                    >
                        <ArrowUp size={14} />
                    </button>
                </div>
                
                {/* Quick Actions */}
                <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                    <button 
                        onClick={() => handleSubmit("Make it more polite")}
                        className="text-[11px] px-2.5 py-1.5 bg-muted/50 hover:bg-muted border border-transparent hover:border-border rounded-md whitespace-nowrap transition-all font-medium text-muted-foreground hover:text-foreground"
                    >
                        Polite
                    </button>
                    <button 
                        onClick={() => handleSubmit("Fix grammar")}
                        className="text-[11px] px-2.5 py-1.5 bg-muted/50 hover:bg-muted border border-transparent hover:border-border rounded-md whitespace-nowrap transition-all font-medium text-muted-foreground hover:text-foreground"
                    >
                        Fix Grammar
                    </button>
                    <button 
                        onClick={() => handleSubmit("Summarize")}
                        className="text-[11px] px-2.5 py-1.5 bg-muted/50 hover:bg-muted border border-transparent hover:border-border rounded-md whitespace-nowrap transition-all font-medium text-muted-foreground hover:text-foreground"
                    >
                        Summarize
                    </button>
                </div>
            </>
        )}
    </div>
  );
};
