import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, 
  Square, 
  Play, 
  RotateCcw, 
  Send, 
  Volume2, 
  Loader2,
  Briefcase,
  MessageCircle,
  Skull,
  Scroll,
  Smile,
  FileText,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { transcribeAndConvert, textToSpeech, CONVERSION_STYLES } from './services/geminiService';

const ICON_MAP: Record<string, any> = {
  Briefcase,
  MessageCircle,
  Skull,
  Scroll,
  Smile,
  FileText
};

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState(CONVERSION_STYLES[0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ transcription: string; convertedText: string } | null>(null);
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      setError(null);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("Microphone access denied or not available.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      if (timerRef.current) window.clearInterval(timerRef.current);
    }
  };

  const resetRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setResult(null);
    setTtsAudioUrl(null);
    setRecordingTime(0);
    setError(null);
  };

  const handleConvert = async () => {
    if (!audioBlob) return;

    setIsProcessing(true);
    setError(null);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64data = (reader.result as string).split(',')[1];
        const response = await transcribeAndConvert(base64data, audioBlob.type, selectedStyle.prompt);
        setResult(response);
        setIsProcessing(false);
      };
    } catch (err) {
      console.error("Conversion error:", err);
      setError("Failed to process audio. Please try again.");
      setIsProcessing(false);
    }
  };

  const handlePlayTts = async () => {
    if (!result?.convertedText) return;
    
    if (ttsAudioUrl) {
      const audio = new Audio(ttsAudioUrl);
      audio.play();
      return;
    }

    setIsTtsLoading(true);
    try {
      const url = await textToSpeech(result.convertedText);
      if (url) {
        setTtsAudioUrl(url);
        const audio = new Audio(url);
        audio.play();
      }
    } catch (err) {
      console.error("TTS error:", err);
    } finally {
      setIsTtsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#0a0502] text-[#e0d8d0] font-sans selection:bg-[#ff4e00] selection:text-white">
      {/* Immersive Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[#3a1510] blur-[120px] opacity-40 animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#ff4e00] blur-[120px] opacity-20" />
      </div>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12 md:py-24">
        {/* Header */}
        <header className="mb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl font-serif font-light tracking-tight mb-4">
              Vox<span className="text-[#ff4e00] italic">Convert</span>
            </h1>
            <p className="text-lg text-[#e0d8d0]/60 max-w-xl mx-auto font-light">
              Transform your voice into any style. Speak naturally, convert instantly, and hear the difference.
            </p>
          </motion.div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Left Column: Styles */}
          <div className="md:col-span-4 space-y-4">
            <h2 className="text-xs uppercase tracking-[0.2em] text-[#ff4e00] font-semibold mb-6">Choose Style</h2>
            <div className="grid grid-cols-2 md:grid-cols-1 gap-3">
              {CONVERSION_STYLES.map((style) => {
                const Icon = ICON_MAP[style.icon];
                return (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style)}
                    className={`flex items-center gap-3 p-4 rounded-2xl border transition-all duration-300 text-left ${
                      selectedStyle.id === style.id 
                      ? 'bg-[#ff4e00]/10 border-[#ff4e00] text-[#ff4e00]' 
                      : 'bg-white/5 border-white/10 hover:bg-white/10 text-[#e0d8d0]/70'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium text-sm">{style.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Recorder & Result */}
          <div className="md:col-span-8 space-y-8">
            {/* Recorder Card */}
            <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[32px] p-8 md:p-12 shadow-2xl">
              <div className="flex flex-col items-center justify-center space-y-8">
                {/* Timer & Status */}
                <div className="text-center">
                  <div className={`text-5xl font-mono font-light tracking-widest mb-2 ${isRecording ? 'text-[#ff4e00]' : 'text-[#e0d8d0]/40'}`}>
                    {formatTime(recordingTime)}
                  </div>
                  <div className="text-xs uppercase tracking-widest text-[#e0d8d0]/40 font-medium">
                    {isRecording ? 'Recording...' : audioBlob ? 'Ready to Convert' : 'Tap to Record'}
                  </div>
                </div>

                {/* Main Action Button */}
                <div className="relative">
                  <AnimatePresence mode="wait">
                    {!audioBlob ? (
                      <motion.button
                        key="record"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 ${
                          isRecording 
                          ? 'bg-[#ff4e00] shadow-[0_0_40px_rgba(255,78,0,0.4)]' 
                          : 'bg-white/10 hover:bg-white/20'
                        }`}
                      >
                        {isRecording ? <Square fill="white" size={32} /> : <Mic size={32} />}
                        {isRecording && (
                          <motion.div 
                            animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className="absolute inset-0 rounded-full bg-[#ff4e00]"
                          />
                        )}
                      </motion.button>
                    ) : (
                      <motion.div
                        key="actions"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex items-center gap-6"
                      >
                        <button 
                          onClick={resetRecording}
                          className="w-16 h-16 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#e0d8d0]/60 transition-colors"
                          title="Reset"
                        >
                          <RotateCcw size={24} />
                        </button>
                        <button 
                          onClick={handleConvert}
                          disabled={isProcessing}
                          className="w-24 h-24 rounded-full bg-[#ff4e00] hover:bg-[#ff6a2a] flex items-center justify-center shadow-[0_0_40px_rgba(255,78,0,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                          {isProcessing ? (
                            <Loader2 className="animate-spin" size={32} />
                          ) : (
                            <Send className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" size={32} />
                          )}
                        </button>
                        <button 
                          onClick={() => {
                            const audio = new Audio(audioUrl!);
                            audio.play();
                          }}
                          className="w-16 h-16 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#e0d8d0]/60 transition-colors"
                          title="Play Original"
                        >
                          <Play size={24} />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 px-4 py-2 rounded-full"
                  >
                    <AlertCircle size={16} />
                    {error}
                  </motion.div>
                )}
              </div>
            </div>

            {/* Results Section */}
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Transcription */}
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
                    <h3 className="text-xs uppercase tracking-widest text-[#e0d8d0]/40 font-semibold mb-4 flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-green-500" />
                      Original Transcription
                    </h3>
                    <p className="text-[#e0d8d0]/80 leading-relaxed font-light italic">
                      "{result.transcription}"
                    </p>
                  </div>

                  {/* Converted Text */}
                  <div className="bg-[#ff4e00]/5 border border-[#ff4e00]/20 rounded-3xl p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4">
                      <button 
                        onClick={handlePlayTts}
                        disabled={isTtsLoading}
                        className="w-12 h-12 rounded-full bg-[#ff4e00] text-white flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-50"
                      >
                        {isTtsLoading ? <Loader2 className="animate-spin" size={20} /> : <Volume2 size={20} />}
                      </button>
                    </div>
                    <h3 className="text-xs uppercase tracking-widest text-[#ff4e00] font-semibold mb-4">
                      {selectedStyle.name} Version
                    </h3>
                    <p className="text-2xl md:text-3xl font-serif leading-tight text-white">
                      {result.convertedText}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-12 text-center border-t border-white/5 mt-24">
        <p className="text-xs uppercase tracking-widest text-[#e0d8d0]/20 font-medium">
          Powered by Gemini 3.1 & 2.5 TTS
        </p>
      </footer>
    </div>
  );
}
