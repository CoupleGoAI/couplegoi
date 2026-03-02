import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, ChevronLeft } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'partner' | 'ai';
  timestamp: string;
}

const initialMessages: Message[] = [
  { id: '1', text: "Hey, I've been thinking about what you said earlier…", sender: 'partner', timestamp: '7:12 PM' },
  { id: '2', text: "Yeah me too. I didn't mean to come off that way 💛", sender: 'user', timestamp: '7:14 PM' },
  { id: '3', text: "It sounds like you're both reflecting on something important. Would you like me to help you explore this together?", sender: 'ai', timestamp: '7:14 PM' },
];

const aiSuggestions = [
  "Tell them what you appreciate",
  "Ask how they felt",
  "Share what you need",
];

const ChatScreen: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const newMsg: Message = {
      id: Date.now().toString(),
      text: input.trim(),
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput('');
  };

  return (
    <div className="mobile-container flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="px-4 pt-14 pb-3 flex items-center gap-3 border-b border-border bg-background/80 backdrop-blur-xl">
        <button className="p-1.5 rounded-xl hover:bg-muted transition-colors">
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2.5 flex-1">
          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold">Couple Chat</p>
            <p className="text-[10px] text-muted-foreground">AI-assisted conversation</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-32">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 ${
                  msg.sender === 'user'
                    ? 'gradient-primary text-primary-foreground rounded-2xl rounded-br-md'
                    : msg.sender === 'ai'
                    ? 'bg-muted border border-border rounded-2xl rounded-bl-md'
                    : 'bg-card border border-border rounded-2xl rounded-bl-md'
                }`}
              >
                {msg.sender === 'ai' && (
                  <div className="flex items-center gap-1 mb-1">
                    <Sparkles className="w-3 h-3 text-primary" />
                    <span className="text-[10px] font-medium text-primary">AI Insight</span>
                  </div>
                )}
                {msg.sender === 'partner' && (
                  <span className="text-[10px] font-medium text-secondary block mb-1">Partner</span>
                )}
                <p className="text-sm leading-relaxed">{msg.text}</p>
                <p className={`text-[10px] mt-1 ${
                  msg.sender === 'user' ? 'text-primary-foreground/60' : 'text-muted-foreground'
                }`}>
                  {msg.timestamp}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* AI Suggestions */}
      <div className="px-4 pb-2">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {aiSuggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => setInput(s)}
              className="shrink-0 px-3.5 py-2 rounded-2xl bg-primary/8 border border-primary/15 text-xs font-medium text-primary hover:bg-primary/15 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="px-4 pb-24 pt-1">
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-card border border-border">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message…"
            className="flex-1 px-3 py-2.5 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center disabled:opacity-40 transition-opacity"
          >
            <Send className="w-4 h-4 text-primary-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatScreen;
