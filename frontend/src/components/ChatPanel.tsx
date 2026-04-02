import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useGameSocket } from '@/hooks/useGameSocket';
import { Input } from '@/components/ui/input';
import { Send, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ChatPanel() {
  const { chatMessages, username: myUsername } = useGameStore();
  const { sendChat } = useGameSocket(null);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendChat(input.trim());
    setInput('');
  };

  return (
    <div className="flex flex-col h-full glass rounded-3xl overflow-hidden border border-white/5">
      <div className="p-4 border-b border-white/5 flex items-center gap-2 bg-white/2">
        <MessageSquare className="w-4 h-4 text-teal-400" />
        <span className="text-xs font-black uppercase tracking-widest text-white">Live Operations</span>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide"
      >
        {chatMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 opacity-20">
             <MessageSquare className="w-8 h-8" />
             <p className="text-[10px] font-bold uppercase tracking-tighter">No encrypted signals yet</p>
          </div>
        ) : (
          chatMessages.map((msg, i) => {
            const isMe = msg.username === myUsername;
            return (
              <div 
                key={i} 
                className={cn(
                  "flex flex-col gap-1 max-w-[85%]",
                  isMe ? "ml-auto items-end" : "items-start"
                )}
              >
                {!isMe && (
                  <span className="text-[10px] font-black text-slate-500 ml-1 uppercase">{msg.username}</span>
                )}
                <div className={cn(
                  "px-3 py-2 rounded-2xl text-sm font-medium",
                  isMe 
                    ? "bg-teal-500 text-black rounded-tr-none" 
                    : "bg-white/5 text-white border border-white/5 rounded-tl-none"
                )}>
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-3 bg-black/20 border-t border-white/5">
        <div className="relative">
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Send message..."
            className="bg-white/5 border-white/5 h-10 rounded-xl pr-10 text-xs placeholder:text-slate-600 focus:border-teal-500/30 transition-all"
          />
          <button 
            onClick={handleSend}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-teal-400 hover:text-teal-300 transition-colors p-1"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
