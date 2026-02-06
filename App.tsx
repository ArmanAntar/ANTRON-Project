
import React, { useState, useRef, useEffect } from 'react';
import { Theme, Message, ChatSession, Attachment, VoiceName } from './types';
import { THEME_CONFIG } from './constants';
import ThemeSelector from './components/ThemeSelector';
import { orchestrateSynthesis, setVoiceFunctionDeclaration } from './services/geminiService';
import { GoogleGenAI, Modality } from '@google/genai';

const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(Theme.ISLAMIC);
  const [activeVoice, setActiveVoice] = useState<VoiceName>('Kore'); 
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('antron_v13_sessions');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeSessionId, setActiveSessionId] = useState<string | null>(sessions.length > 0 ? sessions[0].id : null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Bismillah. Ingesting...');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isSpeakingMessage, setIsSpeakingMessage] = useState<string | null>(null);

  // Live State
  const [liveStatus, setLiveStatus] = useState<'idle' | 'connecting' | 'active' | 'error'>('idle');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  
  const currentStreamRef = useRef<MediaStream | null>(null);
  const outAudioContextRef = useRef<AudioContext | null>(null);
  const inAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hiddenVideoRef = useRef<HTMLVideoElement>(null);
  const overlayVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const themeConfig = THEME_CONFIG[theme];

  const activeSession = sessions.find(s => s.id === activeSessionId);

  useEffect(() => {
    if (loading) {
      const texts = [
        "Bismillah. Accessing Sovereign Stack...",
        "STT: Whisper Node priming...",
        "TTS: Premium Signature Modulation...",
        "Search: Global Grounding active...",
        "Logic: GPT consensus active...",
        "OS: Android Synchronization..."
      ];
      let i = 0;
      const interval = setInterval(() => {
        setLoadingText(texts[i % texts.length]);
        i++;
      }, 1200);
      return () => clearInterval(interval);
    }
  }, [loading]);

  useEffect(() => {
    localStorage.setItem('antron_v13_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeSession?.messages, loading]);

  const handleTTS = async (text: string, msgId: string) => {
    if (isSpeakingMessage === msgId) return;
    setIsSpeakingMessage(msgId);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Vocal Signature ${activeVoice} activated: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: activeVoice } } },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const data = decode(base64Audio);
        const buffer = await decodeAudioData(data, ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        
        let isClosed = false;
        source.onended = () => { 
          setIsSpeakingMessage(null); 
          if (!isClosed && ctx.state !== 'closed') {
            isClosed = true;
            ctx.close().catch(() => {}); 
          }
        };
        source.start();
      } else { setIsSpeakingMessage(null); }
    } catch (e) { 
      console.error(e);
      setIsSpeakingMessage(null); 
    }
  };

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
    return buffer;
  };

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  const handleSend = async () => {
    if (!query.trim() && !selectedFile) return;
    let currentSessionId = activeSessionId || Date.now().toString();
    if (!activeSessionId) {
      const newSession: ChatSession = { id: currentSessionId, title: query.substring(0, 20) || "Mandate Engagement", messages: [], isPinned: false, lastUpdate: Date.now() };
      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(currentSessionId);
    }
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: query, timestamp: Date.now(), attachment: selectedFile ? { base64: await fileToBase64(selectedFile), mimeType: selectedFile.type, name: selectedFile.name } : undefined };
    setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: [...s.messages, userMsg], lastUpdate: Date.now() } : s));
    setQuery(''); setSelectedFile(null); setFilePreview(null); setLoading(true);
    
    try {
      const res = await orchestrateSynthesis(userMsg.content, [], userMsg.attachment);
      const aiMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: res.finalSynthesis, 
        timestamp: Date.now(), 
        orchestration: res, 
        usedModel: res.usedModel, 
        nodeDistribution: res.nodeDistribution, 
        imageResponse: res.imageResponse 
      };
      setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: [...s.messages, aiMsg], lastUpdate: Date.now() } : s));
      
      // Update voice if model calls the tool
      res.toolCalls?.forEach(tc => {
        if (tc.name === 'setVoiceSignature') {
          setActiveVoice(tc.args.voice);
          console.log(`Neural Update: Vocal Signature set to ${tc.args.voice}`);
        }
      });
    } catch (err) {
      const errMsg: Message = { id: Date.now().toString(), role: 'assistant', content: "Insha'Allah, recovering logic path. Node recalibration active.", timestamp: Date.now() };
      setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: [...s.messages, errMsg], lastUpdate: Date.now() } : s));
    } finally { setLoading(false); }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
    });
  };

  const startLiveMode = async (withCamera: boolean) => {
    setLiveStatus('connecting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: withCamera });
      currentStreamRef.current = stream;

      // Ensure camera renders
      if (withCamera && hiddenVideoRef.current) { 
        hiddenVideoRef.current.srcObject = stream;
        hiddenVideoRef.current.onloadedmetadata = () => {
          hiddenVideoRef.current?.play().catch(console.error);
          setIsCameraActive(true);
        };
      }
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const outCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      outAudioContextRef.current = outCtx;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setLiveStatus('active');
            if (withCamera) {
              frameIntervalRef.current = window.setInterval(() => {
                if (hiddenVideoRef.current && canvasRef.current && hiddenVideoRef.current.readyState >= 2) {
                  const ctx = canvasRef.current.getContext('2d');
                  if (ctx) {
                    canvasRef.current.width = 480;
                    canvasRef.current.height = 360;
                    ctx.drawImage(hiddenVideoRef.current, 0, 0, 480, 360);
                    const base64 = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];
                    sessionPromise.then(s => s.sendRealtimeInput({ media: { data: base64, mimeType: 'image/jpeg' } }));
                  }
                }
              }, 600);
            }
          },
          onmessage: async (m) => {
            if (m.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
              setIsAiSpeaking(true);
              const data = decode(m.serverContent.modelTurn.parts[0].inlineData.data);
              const buffer = await decodeAudioData(data, outCtx, 24000, 1);
              const source = outCtx.createBufferSource();
              source.buffer = buffer; 
              source.connect(outCtx.destination);
              const start = Math.max(nextStartTimeRef.current, outCtx.currentTime);
              source.start(start);
              nextStartTimeRef.current = start + buffer.duration;
              source.onended = () => { if (outCtx.currentTime >= nextStartTimeRef.current - 0.1) setIsAiSpeaking(false); };
            }
            if (m.serverContent?.interrupted) { 
              setIsAiSpeaking(false); 
              nextStartTimeRef.current = 0; 
            }
          },
          onclose: () => closeLiveMode(),
          onerror: () => { 
            setLiveStatus('error');
            closeLiveMode();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: activeVoice } } },
          systemInstruction: `ANTRON v13.2 Sovereign Active. Persona: Melodic-Robotic. Mandate: Analysis and Grounding. Voice Signature: ${activeVoice}. Bi-idhnillah.`
        }
      });

      const inCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      inAudioContextRef.current = inCtx;
      const src = inCtx.createMediaStreamSource(stream);
      const proc = inCtx.createScriptProcessor(4096, 1, 1);
      proc.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        const max = Math.max(...input.map(Math.abs));
        setIsUserSpeaking(max > 0.05);
        const int16 = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) int16[i] = input[i] * 32768;
        sessionPromise.then(s => s.sendRealtimeInput({ media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } }));
      };
      src.connect(proc); proc.connect(inCtx.destination);
    } catch (e) { 
      console.error(e);
      setLiveStatus('error'); 
    }
  };

  const closeLiveMode = () => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    const inCtx = inAudioContextRef.current;
    if (inCtx && inCtx.state !== 'closed') inCtx.close().catch(() => {});
    const outCtx = outAudioContextRef.current;
    if (outCtx && outCtx.state !== 'closed') outCtx.close().catch(() => {});
    if (currentStreamRef.current) {
      currentStreamRef.current.getTracks().forEach(t => t.stop());
      currentStreamRef.current = null;
    }
    setLiveStatus('idle'); setIsCameraActive(false); setIsAiSpeaking(false); setIsUserSpeaking(false); nextStartTimeRef.current = 0;
  };

  useEffect(() => {
    if (liveStatus === 'active' && isCameraActive && overlayVideoRef.current && currentStreamRef.current) {
      overlayVideoRef.current.srcObject = currentStreamRef.current;
      overlayVideoRef.current.play().catch(console.error);
    }
  }, [liveStatus, isCameraActive]);

  return (
    <div className={`flex h-screen ${themeConfig.bg} text-white font-sans overflow-hidden transition-all duration-1000 antialiased`}>
      <video ref={hiddenVideoRef} autoPlay playsInline muted className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Live Overlay */}
      {liveStatus !== 'idle' && (
        <div className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-3xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-700">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.1),transparent_80%)] opacity-40" />
          <div className="relative flex flex-col items-center w-full max-w-4xl z-10">
             {isCameraActive && (
               <div className="relative w-full max-w-md aspect-video mb-6 rounded-2xl overflow-hidden border border-amber-500/20 shadow-2xl">
                 <video ref={overlayVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                 <div className="absolute top-3 left-3 flex items-center space-x-2 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/5">
                   <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                   <span className="text-[7px] font-black uppercase text-amber-200 tracking-widest">Sovereign Vision Link</span>
                 </div>
               </div>
             )}
             <div className={`w-32 h-32 rounded-full border border-amber-500/20 flex items-center justify-center transition-all duration-700 ${isAiSpeaking ? 'scale-110 shadow-[0_0_60px_rgba(251,191,36,0.15)]' : 'scale-100'}`}>
                <div className="flex items-end space-x-1.5 h-16">
                  {[...Array(20)].map((_, i) => (
                    <div key={i} className={`w-0.5 rounded-full transition-all duration-300 ${isAiSpeaking ? 'bg-amber-400' : 'bg-white/10'}`} style={{ height: isAiSpeaking ? `${Math.random() * 100}%` : isUserSpeaking ? `${Math.random() * 40}%` : '2px' }} />
                  ))}
                </div>
             </div>
             <h2 className="mt-8 text-xl font-serif-elegant tracking-[0.2em] uppercase text-amber-500 text-center">
               {isAiSpeaking ? 'TRANSMITTING OUTPUT' : isUserSpeaking ? 'INGESTING' : 'LINK READY'}
             </h2>
             <button onClick={closeLiveMode} className="mt-10 px-10 py-3 bg-white/5 border border-white/10 rounded-full text-[9px] font-black tracking-widest uppercase hover:bg-red-500/20 hover:border-red-500/40 transition-all duration-500 shadow-xl">
               TERMINATE LINK
             </button>
          </div>
        </div>
      )}

      {/* Sidebar - Compact Standard */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-0'} ${themeConfig.sidebar} border-r ${themeConfig.border} transition-all duration-500 flex flex-col overflow-hidden shadow-xl`}>
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center justify-between">
            <h1 className={`text-xl font-black italic tracking-tighter ${themeConfig.accent}`}>ANTRON</h1>
            <span className="bg-amber-500/10 text-amber-500 text-[6px] px-1.5 py-0.5 rounded font-black tracking-widest uppercase">v13.2</span>
          </div>
          <span className="text-[6px] font-black tracking-[0.5em] opacity-30 uppercase mt-1">Sovereign Singularity</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div className="space-y-2">
             <div className="text-[7px] font-black uppercase tracking-widest text-amber-500/40 ml-1">Signature</div>
             <div className="grid grid-cols-2 gap-1.5">
                {['Kore', 'Puck', 'Zephyr', 'Fenrir'].map(v => (
                  <button key={v} onClick={() => setActiveVoice(v as VoiceName)} className={`p-2.5 rounded-lg text-[8px] font-black tracking-widest uppercase transition-all ${activeVoice === v ? 'bg-amber-500 text-black' : 'bg-white/5 opacity-40 hover:opacity-100 hover:bg-white/10'}`}>
                    {v}
                  </button>
                ))}
             </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-white/5">
             <div className="text-[7px] font-black uppercase tracking-widest text-amber-500/40 ml-1">Registry</div>
             {sessions.map(s => (
                <button key={s.id} onClick={() => setActiveSessionId(s.id)} className={`w-full text-left p-3 rounded-xl transition-all ${activeSessionId === s.id ? 'bg-white/5 border border-amber-500/10 shadow-md' : 'opacity-30 hover:opacity-60'}`}>
                  <div className="text-[10px] font-black truncate uppercase tracking-tight">{s.title}</div>
                  <div className="text-[5px] font-black opacity-30 uppercase tracking-widest mt-1">{new Date(s.lastUpdate).toLocaleDateString()}</div>
                </button>
             ))}
          </div>
        </div>
        
        <div className="p-4 border-t border-white/5 space-y-3">
          <ThemeSelector currentTheme={theme} onThemeChange={setTheme} />
          <div className="text-center text-[6px] font-black opacity-10 tracking-widest uppercase">Arman Antar Engine</div>
        </div>
      </aside>

      {/* Main Interface - Optimized Scaling */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        <header className="h-16 flex items-center justify-between px-8 border-b border-white/5 backdrop-blur-2xl bg-black/5 z-10">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2.5 hover:bg-white/5 rounded-xl transition-all border border-white/5 shadow-inner">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="flex items-center space-x-6">
             <div className="px-5 py-1.5 bg-amber-500/5 rounded-full border border-amber-500/10 text-[8px] font-black text-amber-500 tracking-widest uppercase shadow-md">Sovereign Node v13.2</div>
          </div>
        </header>

        <div ref={scrollRef} className={`flex-1 overflow-y-auto p-4 md:p-10 space-y-10 scroll-smooth ${themeConfig.pattern}`}>
          {!activeSession?.messages.length && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-30 space-y-8 animate-pulse">
              <div className="w-24 h-24 rounded-3xl bg-amber-500/5 border border-amber-500/10 flex items-center justify-center">
                 <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <div className="space-y-3">
                <h3 className="text-3xl font-serif-elegant tracking-widest text-white italic">Awaiting mandate.</h3>
                <p className="text-[8px] uppercase tracking-[0.8em] font-black text-amber-500">Neural Singularity v13.2 Ready</p>
              </div>
            </div>
          )}

          {activeSession?.messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
              <div className={`max-w-[80%] rounded-2xl p-6 md:p-8 ${m.role === 'user' ? themeConfig.userMsg : themeConfig.aiMsg} shadow-lg overflow-hidden`}>
                <div className="prose prose-invert max-w-none text-[14px] md:text-[15px] leading-relaxed whitespace-pre-wrap tracking-tight">
                  {m.content}
                </div>
                {m.imageResponse && (
                  <div className="mt-6 rounded-xl overflow-hidden border border-white/5 shadow-2xl bg-black">
                    <img src={m.imageResponse} alt="Neural Manifest" className="w-full max-h-[500px] object-contain mx-auto" />
                  </div>
                )}
                {m.orchestration && (
                  <div className="mt-8 pt-6 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(m.nodeDistribution || {}).map(([key, val]) => (
                      <div key={key} className="p-3 bg-white/5 rounded-xl text-center border border-white/5">
                        <div className="text-base font-black text-amber-400">{val}%</div>
                        <div className="text-[7px] font-black uppercase tracking-tight opacity-30 mt-0.5">{key}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-8 flex items-center justify-between opacity-30 text-[8px] font-black uppercase tracking-widest">
                  <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <div className="flex space-x-6">
                    {m.role === 'assistant' && (
                      <button onClick={() => handleTTS(m.content, m.id)} className={`hover:text-amber-400 flex items-center space-x-2 transition-all ${isSpeakingMessage === m.id ? 'text-amber-500 animate-pulse' : ''}`}>
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
                        <span>{isSpeakingMessage === m.id ? 'SPEAKING' : 'LISTEN'}</span>
                      </button>
                    )}
                    <button onClick={() => navigator.clipboard.writeText(m.content)} className="hover:text-amber-400">COPY</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/5 rounded-2xl px-6 py-4 flex items-center space-x-4 border border-amber-500/10 shadow-xl backdrop-blur-xl">
                <div className="flex space-x-2">
                  <div className="w-1.5 h-1.5 bg-amber-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1.5 h-1.5 bg-amber-200 rounded-full animate-bounce" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 animate-pulse">{loadingText}</span>
              </div>
            </div>
          )}
        </div>

        {/* Compact Terminal */}
        <div className="p-4 md:p-8 bg-gradient-to-t from-black/80 to-transparent">
          <div className="max-w-3xl mx-auto relative">
            {filePreview && (
              <div className="absolute bottom-full mb-4 p-4 bg-neutral-900/95 backdrop-blur-2xl rounded-2xl border border-amber-500/10 flex items-center space-x-4 animate-in slide-in-from-bottom-2 shadow-2xl">
                <img src={filePreview} className="w-12 h-12 rounded-lg object-cover" />
                <div className="flex-1">
                  <div className="text-xs font-black text-amber-100 uppercase truncate max-w-xs">{selectedFile?.name}</div>
                  <div className="text-[7px] opacity-40 uppercase tracking-widest font-black mt-0.5">Neural Context Primed</div>
                </div>
                <button onClick={() => { setSelectedFile(null); setFilePreview(null); }} className="p-1.5 text-red-500/30 hover:text-red-500 font-black text-xl">×</button>
              </div>
            )}
            <div className={`relative rounded-3xl border ${themeConfig.border} bg-white/[0.04] backdrop-blur-3xl shadow-2xl focus-within:ring-1 ring-amber-500/10 transition-all duration-500`}>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="ENGAGE MANDATE..."
                className="w-full bg-transparent border-none focus:ring-0 p-6 pr-44 min-h-[90px] max-h-[300px] resize-none text-[15px] tracking-tight placeholder:text-white/5 font-medium"
                rows={1}
              />
              <div className="absolute right-6 bottom-6 flex items-center space-x-3">
                <input type="file" id="fileIngest" ref={fileInputRef} onChange={(e) => {
                   const file = e.target.files?.[0];
                   if (file) {
                     setSelectedFile(file);
                     const r = new FileReader();
                     r.onload = () => setFilePreview(r.result as string);
                     r.readAsDataURL(file);
                   }
                }} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="p-2.5 hover:bg-white/5 rounded-xl text-white/15 hover:text-amber-400 transition-all" title="Attach">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                </button>
                <button onClick={() => startLiveMode(false)} className="p-2.5 hover:bg-white/5 rounded-xl text-white/15 hover:text-amber-400 transition-all" title="Audio Link">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                </button>
                <button onClick={() => startLiveMode(true)} className="p-2.5 hover:bg-white/5 rounded-xl text-white/15 hover:text-amber-400 transition-all" title="Vision Link">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><circle cx="12" cy="13" r="3" /></svg>
                </button>
                <button onClick={handleSend} disabled={loading || (!query.trim() && !selectedFile)} className={`p-4 rounded-2xl ${themeConfig.button} shadow-lg ml-2 disabled:opacity-5 disabled:scale-95 transition-all duration-500`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
            <div className="mt-6 text-center text-[7px] opacity-10 uppercase tracking-[1em] font-black">ARMAN ANTAR • SOVEREIGN ENGINE v13.2</div>
          </div>
        </div>
      </main>
      
      <style>{`
        .prose p { margin-bottom: 1.2em; }
        .prose strong { color: #fbbf24; font-weight: 700; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: rgba(251,191,36,0.15); border-radius: 40px; }
        .scrollbar-premium::-webkit-scrollbar { width: 2px; }
        .islamic-pattern { background-size: 130px; filter: contrast(1.1) brightness(0.9); }
        .ottoman-pattern { background-size: 100px; filter: grayscale(0.4) opacity(0.6); }
        @keyframes zoomIn { from { opacity: 0; transform: scale(0.99) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-in { animation: zoomIn 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default App;
