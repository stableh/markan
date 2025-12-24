import { useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { useNoteStore } from '@/store/useNoteStore';

export function AIPanel() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([
    { role: 'assistant', content: 'Hello! I can help you refine your notes or generate blog posts. What do you need?' }
  ]);
  const { getActiveNote } = useNoteStore();

  const handleSend = () => {
    if (!input.trim()) return;
    
    const note = getActiveNote();
    // In a real app, we would send note.content to the AI here
    
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setInput('');
    
    // Mock response
    setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: `(Mock AI Response for "${note?.title || 'Untitled'}"): I understand you want to "${input}". This feature will be connected to an LLM API soon!` }]);
    }, 1000);
  };

  return (
    <aside className="w-80 bg-sidebar border-l border-sidebar-border flex flex-col h-screen shrink-0">
      <div className="p-4 border-b border-sidebar-border flex items-center gap-2 font-medium text-sidebar-foreground">
        <Sparkles size={18} className="text-primary" />
        <span>AI Assistant</span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-sidebar-accent text-sidebar-foreground'
                }`}>
                    {msg.content}
                </div>
            </div>
        ))}
      </div>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex gap-2">
            <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask AI..."
                className="flex-1 bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button 
                onClick={handleSend}
                className="bg-primary text-primary-foreground p-2 rounded-md hover:bg-primary/90 transition-colors cursor-pointer"
            >
                <Send size={16} />
            </button>
        </div>
      </div>
    </aside>
  );
}
