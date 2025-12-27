import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Bot, User, X, History, Wand2, FileText, AlignLeft, PenLine, Calendar } from 'lucide-react';
import { useNoteStore } from '@/store/useNoteStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { cn } from '@/lib/utils';

export function AIPanel() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<{
    role: 'user' | 'assistant', 
    content: string,
    actions?: { label: string, onClick: () => void }[]
  }[]>([]);
  
  const { getActiveNote } = useNoteStore();
  const { toggleAIPanel } = useSettingsStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = (text: string = input) => {
    if (!text.trim() || isLoading) return;
    
    const note = getActiveNote();
    const userMessage = text.trim();
    
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsLoading(true);
    
    // Mock response
    setTimeout(() => {
        const response = `Here is a suggested conclusion:\n\n> "Scaling isn't just about handling more traffic; it's about handling more complexity. By adopting feature-based architecture and rigorously extracting logic into custom hooks, you pave the way for a codebase that welcomes new features rather than resisting them."\n\nFor section 2, how about: **"Extracting Logic with Custom Hooks"**?`;
        
        setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: response,
            actions: [
                { label: 'Insert Conclusion', onClick: () => {} },
                { label: 'Update Title', onClick: () => {} }
            ]
        }]);
        setIsLoading(false);
    }, 1500);
  };

  const quickActions = [
    { icon: Wand2, label: 'Fix Grammar', prompt: 'Fix grammar in the selected text' },
    { icon: FileText, label: 'Summarize', prompt: 'Summarize this note' },
    { icon: AlignLeft, label: 'Make Shorter', prompt: 'Make the selected text shorter' },
  ];

  const welcomeSuggestions = [
    { icon: FileText, label: '내가 적은 것들 정리해줘', prompt: '내가 적은 것들 정리해줘' },
    { icon: PenLine, label: '블로그 글 작성 도와줘', prompt: '블로그 글 작성을 도와줘.' },
    { icon: Calendar, label: '일정 정리 도와줘', prompt: '일정 정리를 도와줘.' },
    { icon: FileText, label: '이 메모 정리해줘', prompt: '이 메모를 깔끔하게 정리해줘.' },
    { icon: Sparkles, label: 'README.md를 작성해줘', prompt: 'README.md를 작성해줘' },
  ];

  return (
    <aside className="w-[400px] bg-sidebar flex flex-col h-screen shrink-0 z-20">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-sidebar-border bg-sidebar/50 backdrop-blur-sm">
        <div className="flex items-center gap-2.5 font-semibold text-base text-sidebar-foreground">
          <span className='font-brand text-2xl'>MAi</span>
        </div>
        <div className="flex items-center gap-1">
            <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-md transition-colors">
                <History size={18} />
            </button>
            <button 
                onClick={toggleAIPanel}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-md transition-colors"
            >
                <X size={18} />
            </button>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-8">
        {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-4 space-y-6 text-center">
                <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center text-primary mb-2">
                    <Bot size={32} />
                </div>
                <div className="space-y-2 max-w-[280px]">
                    <h3 className="font-semibold text-lg text-foreground">무엇을 도와드릴까요?</h3>
                    <p className="text-sm text-muted-foreground">
                        글쓰기, 요약, 아이디어 생성 등 다양한 작업을 도와드립니다.
                    </p>
                </div>
                
                <div className="grid grid-cols-1 gap-2.5 w-full">
                    {welcomeSuggestions.map((item, i) => (
                        <button
                            key={i}
                            onClick={() => handleSend(item.prompt)}
                            className="flex items-center gap-3 p-3 text-left bg-sidebar-accent/30 hover:bg-sidebar-accent border border-sidebar-border/50 hover:border-sidebar-border rounded-xl transition-all group"
                        >
                            <div className="p-2 bg-background rounded-lg text-muted-foreground group-hover:text-primary transition-colors">
                                <item.icon size={16} />
                            </div>
                            <span className="text-sm font-medium text-sidebar-foreground">{item.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        ) : (
            messages.map((msg, idx) => (
            <div key={idx} className="flex flex-col gap-2">
                {/* Sender Info */}
                <div className={cn(
                    "flex items-center gap-2 text-xs font-medium text-muted-foreground px-1",
                    msg.role === 'user' ? "justify-end" : "justify-start"
                )}>
                    {msg.role === 'assistant' ? (
                        <>
                            <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-primary">
                                <Bot size={12} />
                            </div>
                            <span>MAi</span>
                        </>
                    ) : (
                        <>
                            <span>You</span>
                            <div className="w-5 h-5 rounded bg-muted flex items-center justify-center">
                                <User size={12} />
                            </div>
                        </>
                    )}
                </div>

                {/* Bubble */}
                <div className={cn(
                    "rounded-xl px-4 py-3 text-sm leading-relaxed shadow-sm border",
                    msg.role === 'user' 
                        ? "bg-primary/5 border-primary/10 text-foreground ml-12" 
                        : "bg-sidebar-accent/50 border-sidebar-border text-foreground mr-8"
                )}>
                    <div className="whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none">
                        {msg.content.split('\n').map((line, i) => {
                            if (line.startsWith('> ')) {
                                return (
                                    <blockquote key={i} className="border-l-2 border-primary pl-3 my-2 text-muted-foreground italic">
                                        {line.replace('> ', '')}
                                    </blockquote>
                                );
                            }
                            return <p key={i} className="my-1">{line}</p>;
                        })}
                    </div>
                </div>

                {/* Action Buttons (Assistant Only) */}
                {msg.role === 'assistant' && msg.actions && (
                    <div className="flex gap-2 mt-1 ml-1">
                        {msg.actions.map((action, i) => (
                            <button 
                                key={i}
                                onClick={action.onClick}
                                className="px-3 py-1.5 bg-sidebar-accent hover:bg-sidebar-accent/80 border border-sidebar-border rounded-md text-xs font-medium transition-colors"
                            >
                                {action.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        )))}
        
        {isLoading && (
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground px-1">
                    <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-primary">
                        <Bot size={12} />
                    </div>
                    <span>MAi</span>
                </div>
                <div className="bg-sidebar-accent/50 border border-sidebar-border rounded-xl px-4 py-3 w-fit">
                    <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" />
                    </div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-sidebar-border bg-sidebar space-y-3">
        {/* Quick Actions */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {quickActions.map((action, i) => (
                <button
                    key={i}
                    onClick={() => handleSend(action.prompt)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-sidebar-accent/50 hover:bg-sidebar-accent border border-sidebar-border rounded-full text-xs font-medium whitespace-nowrap transition-colors"
                >
                    <action.icon size={12} className="text-muted-foreground" />
                    <span>{action.label}</span>
                </button>
            ))}
        </div>

        {/* Input Field */}
        <div className="relative flex items-center">
            <input 
                ref={inputRef}
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Ask MAi..."
                disabled={isLoading}
                className="w-full bg-sidebar-accent/30 border border-sidebar-border rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-muted-foreground/50"
            />
            <button 
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className={cn(
                    "absolute right-2 p-1.5 rounded-lg transition-all duration-200",
                    input.trim() && !isLoading
                        ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                        : "bg-muted/50 text-muted-foreground cursor-not-allowed"
                )}
            >
                <Send size={16} className={cn(input.trim() && !isLoading && "ml-0.5")} />
            </button>
        </div>
        
        <div className="text-[10px] text-center text-muted-foreground/60">
            AI can make mistakes. Please review generated text.
        </div>
      </div>
    </aside>
  );
}
