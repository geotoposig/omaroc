import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

interface Message {
  text: string;
  sender: 'me' | 'partner' | 'system';
}

interface ChatBoxProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  disabled: boolean;
}

export const ChatBox: React.FC<ChatBoxProps> = ({ messages, onSendMessage, disabled }) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-thumb-zinc-200"
      >
        {messages.map((msg, i) => (
          <div 
            key={i} 
            className="flex flex-col"
          >
            <div className="text-sm leading-relaxed">
              {msg.sender === 'me' ? (
                <span className="font-bold text-[#0055ff]">You: </span>
              ) : msg.sender === 'partner' ? (
                <span className="font-bold text-[#ff0000]">Stranger: </span>
              ) : null}
              <span className={`${msg.sender === 'system' ? 'text-zinc-400 italic text-xs' : 'text-zinc-900'}`}>
                {msg.text}
              </span>
            </div>
          </div>
        ))}
      </div>
      
      <form onSubmit={handleSubmit} className="p-4 border-t border-zinc-200 bg-zinc-50">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={disabled ? "Connecting..." : "Type a message..."}
            disabled={disabled}
            className="flex-1 bg-white border border-zinc-300 rounded px-4 py-2 text-sm text-zinc-900 focus:outline-none focus:border-[#0055ff] disabled:bg-zinc-100 transition-all"
          />
          <button
            type="submit"
            disabled={disabled || !input.trim()}
            className="px-6 py-2 bg-[#0055ff] text-white rounded font-bold text-sm hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};
