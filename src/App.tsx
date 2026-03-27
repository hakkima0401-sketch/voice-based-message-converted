import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Mic, 
  Square, 
  User, 
  Bot, 
  Loader2, 
  MessageSquare, 
  X,
  ChevronRight,
  HelpCircle,
  Volume2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getChatResponse, transcribeAudio } from './services/chatService';
import { textToSpeech } from './services/geminiService';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

const SUGGESTED_QUESTIONS = [
  "What is SmartFAQ?",
  "How does the voice input work?",
  "What AI model are you using?",
  "Can you help me with general questions?"
];

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'model',
      text: "Hello! I'm your SmartFAQ assistant. How can I help you today?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTtsLoading, setIsTtsLoading] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const responseText = await getChatResponse(text, history);
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText || "I'm sorry, I couldn't process that.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setIsLoading(true);
        try {
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = async () => {
            const base64data = (reader.result as string).split(',')[1];
            const transcription = await transcribeAudio(base64data, blob.type);
            if (transcription) {
              handleSend(transcription);
            }
          };
        } catch (err) {
          console.error("Transcription error:", err);
          setIsLoading(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic error:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const handlePlayTts = async (messageId: string, text: string) => {
    setIsTtsLoading(messageId);
    try {
      const url = await textToSpeech(text);
      if (url) {
        const audio = new Audio(url);
        audio.play();
      }
    } catch (err) {
      console.error("TTS error:", err);
    } finally {
      setIsTtsLoading(null);
    }
  };

  return (
    <div className="flex h-screen bg-[#f5f5f5] font-sans text-[#1a1a1a]">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-80 bg-white border-r border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-[#1a1a1a] rounded-xl flex items-center justify-center text-white">
            <Bot size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">SmartFAQ</h1>
        </div>

        <div className="flex-1">
          <h2 className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-4">Suggested</h2>
          <div className="space-y-2">
            {SUGGESTED_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSend(q)}
                className="w-full text-left p-3 rounded-xl hover:bg-gray-100 text-sm text-gray-600 transition-colors flex items-center justify-between group"
              >
                {q}
                <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-gray-100">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
              <User size={16} />
            </div>
            <div className="text-xs">
              <p className="font-semibold">Guest User</p>
              <p className="text-gray-400">Online</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative bg-white md:bg-transparent">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Bot size={20} className="text-[#1a1a1a]" />
            <span className="font-bold">SmartFAQ</span>
          </div>
          <HelpCircle size={20} className="text-gray-400" />
        </header>

        {/* Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth"
        >
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-3 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                    m.role === 'user' ? 'bg-gray-200 text-gray-600' : 'bg-[#1a1a1a] text-white'
                  }`}>
                    {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={`space-y-1 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`p-4 rounded-2xl shadow-sm ${
                      m.role === 'user' 
                      ? 'bg-[#1a1a1a] text-white rounded-tr-none' 
                      : 'bg-white border border-gray-100 rounded-tl-none'
                    }`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
                    </div>
                    {m.role === 'model' && (
                      <button 
                        onClick={() => handlePlayTts(m.id, m.text)}
                        disabled={isTtsLoading === m.id}
                        className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-gray-400 hover:text-[#1a1a1a] transition-colors p-1"
                      >
                        {isTtsLoading === m.id ? <Loader2 size={10} className="animate-spin" /> : <Volume2 size={10} />}
                        Listen
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center">
                    <Bot size={16} />
                  </div>
                  <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-8 bg-white md:bg-transparent">
          <div className="max-w-3xl mx-auto relative">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-2 flex items-center gap-2">
              <button 
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                  isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                }`}
              >
                {isRecording ? <Square size={20} fill="white" /> : <Mic size={20} />}
              </button>
              
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={isRecording ? "Listening..." : "Type your question..."}
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-2"
                disabled={isRecording || isLoading}
              />

              <button 
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="w-12 h-12 rounded-2xl bg-[#1a1a1a] text-white flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100"
              >
                <Send size={20} />
              </button>
            </div>
            <p className="text-[10px] text-center text-gray-400 mt-4 uppercase tracking-[0.2em]">
              Powered by Gemini AI • Voice & Text Support
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
