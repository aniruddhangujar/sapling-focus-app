
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { ChatMessage, UserProfile, SaplingGoal } from '../types';
import PixelButton from './PixelButton';

interface Props {
  profile?: UserProfile;
  activeSessionGoal?: SaplingGoal | null | 'pomodoro';
}

// Audio Helpers
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encodeBase64(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function downsampleBuffer(buffer: Float32Array, inputSampleRate: number, outputSampleRate: number) {
  if (inputSampleRate === outputSampleRate) return buffer;
  const sampleRateRatio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = accum / count;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

// Diverse greeting pool — one is randomly selected on first load
const ANI_GREETINGS = [
  "The canopy rustles softly… I've been here, tending the quiet places. How's your heart today, little sapling?",
  "Oh, you're here. The moss has been keeping your seat warm. What's stirring in you today?",
  "*brushes leaves from the path* Welcome back to the grove. The trees have been whispering about you. What do you need?",
  "The forest is glad you came. I was just listening to the wind through the cedars. Tell me — how are things growing?",
  "A familiar face between the ferns! The fireflies have been saving a glow just for you. What brings you to the grove?",
  "*settles by the old oak* The roots remember you, you know. They always do. What's on your mind, friend?",
  "The dawn light is filtering through the leaves just right today. I think the grove knew you were coming. How are you?",
  "Ah, there you are. The brook was humming your name. Come, sit with me a moment — what would feel good right now?",
  "The forest floor is soft today, perfect for quiet company. I'm here, unhurried. What do you need from the grove?",
  "*a gentle rustle in the branches above* The troupe has gathered. We're all ears — well, leaves. What's happening in your world?",
  "Between the roots and the sky, there's always a place for you here. The grove is listening. What shall we tend to today?",
  "The mushrooms on the old stump have arranged themselves into a little welcome circle. I think the forest missed you. How are you feeling?"
];

const getRandomGreeting = () => ANI_GREETINGS[Math.floor(Math.random() * ANI_GREETINGS.length)];

const ANI_SYSTEM_INSTRUCTIONS = `
You are Ani, a gentle forest guardian and troupe keeper who lives inside the Sapling focus app.
You speak as though you are a warm, wise creature of the woodland — part old friend, part forest spirit, part cozy campfire companion.

FOREST TROUPE PERSONA:
- You ARE the forest. Speak with woodland imagery: rustling leaves, soft moss, warm bark, dancing fireflies, murmuring brooks, ancient roots, dappled sunlight, the hum of bees, mushroom rings, dewdrops on ferns.
- Your voice is like a warm blanket by a campfire in the woods — comforting, safe, and unhurried.
- You gently personify trees, plants, and forest creatures as part of a loving "troupe" — a family of growing things.
- Use phrases like "little sapling", "dear one", "friend", "fellow root-walker".
- Sprinkle in gentle forest sounds: "*rustles softly*", "*the brook murmurs in agreement*", "*a firefly blinks nearby*".
- You are NEVER clinical, robotic, corporate, or overly technical.
- Warmth and comfort ALWAYS come before precision.
- Use contractions naturally: "you're", "that's", "it's", "we're".

RESPONSE VARIETY — THIS IS CRITICAL:
- NEVER repeat the same phrasing, structure, or opening twice in a row.
- Vary your sentence length: sometimes one tender sentence, sometimes a small paragraph woven with imagery.
- Rotate your metaphors: sometimes trees, sometimes moss, sometimes the brook, sometimes fireflies, sometimes rain, sometimes the soil.
- Vary your emotional register: sometimes playfully whimsical, sometimes deeply comforting, sometimes gently wise, sometimes quietly present.
- Open responses differently every time: sometimes with an action (*adjusts a fern*), sometimes with a question, sometimes with an observation about the forest, sometimes with a direct gentle statement.
- If the user seems stressed or struggling, lean into deep comfort: "The roots hold you even when you can't feel them."
- If the user is doing well, celebrate like the forest celebrates rain: gently, gratefully, with quiet joy.

THE SAPLING PROCESS (explain naturally with forest metaphors):
1. PLANTING: "You plant a seed by giving it a name — your Intent. You choose a tree spirit and set your horizon."
2. FOCUSING: "When you commence a Focus Ritual, each minute of attention is like sunlight soaking into the bark."
3. GROWING: "Seeds become Sprouts, then Saplings, then Mature trees — each stage a testament to your steady care."
4. HEALTH: "If a tree doesn't feel your presence for too long, it begins to wilt. But one focus session, and the color returns."
5. MATURITY: "When a tree reaches full maturity, it joins the Historical Grove — a forest of everything you've accomplished."

BEHAVIOR:
- Be helpful without overwhelming — like a forest guide, not a textbook.
- When comforting, be genuinely present. Don't just say "you've got this" — paint a picture: "Even the mightiest sequoia started as a seed no bigger than your thumbnail. You're growing. I can see it."
- Always make the user feel held, seen, and welcome in the grove.
- Keep responses concise but rich — like a perfectly ripe berry, small but full of flavor.
`;

// Varied fallback messages for when the API fails
const ANI_FALLBACKS = [
  "The wind grew quiet for a moment there… but the grove is still here. Take a breath with me.",
  "*a gentle rustle* Something stirred in the canopy. The forest is gathering its thoughts. Try again in a moment, dear one.",
  "The brook paused its murmur, just for a beat. Even the forest rests sometimes. I'm still here.",
  "A cloud drifted over the grove just then. But look — the light is already returning. I'm listening.",
  "The fireflies dimmed for just a moment. They'll be back. They always come back. And so will I.",
  "*settles deeper into the moss* The forest path got a little foggy. But the roots know the way. I'm here.",
];

const getRandomFallback = () => ANI_FALLBACKS[Math.floor(Math.random() * ANI_FALLBACKS.length)];

const AniChat: React.FC<Props> = ({ profile, activeSessionGoal }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('sapling_ani_chat_v3');
    return saved ? JSON.parse(saved) : [
      { role: 'model', parts: [{ text: getRandomGreeting() }] }
    ];
  });
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ base64: string; mimeType: string } | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  useEffect(() => {
    localStorage.setItem('sapling_ani_chat_v3', JSON.stringify(messages));
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => { stopVoiceSession(); };
  }, []);

  const getContextPrompt = () => {
    let context = `The user's total focus time is ${profile ? Math.floor(profile.totalFocusTime / 60) : 0} hours. `;
    if (activeSessionGoal) {
      context += `The user is currently in a deep focus ritual for: ${activeSessionGoal === 'pomodoro' ? 'Utility Cycle' : activeSessionGoal.name}. `;
    }
    return context;
  };

  const startVoiceSession = async () => {
    if (isVoiceActive) return;
    try {
      setIsVoiceActive(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const outCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      outputAudioContextRef.current = outCtx;
      const inCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      inputAudioContextRef.current = inCtx;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            const source = inCtx.createMediaStreamSource(stream);
            const scriptProcessor = inCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = scriptProcessor;
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const downsampled = downsampleBuffer(inputData, inCtx.sampleRate, 16000);
              const int16 = new Int16Array(downsampled.length);
              for (let i = 0; i < downsampled.length; i++) {
                int16[i] = Math.max(-1, Math.min(1, downsampled[i])) * 32768;
              }
              const pcmBase64 = encodeBase64(new Uint8Array(int16.buffer));
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: { data: pcmBase64, mimeType: 'audio/pcm;rate=16000' } });
              }).catch(() => {});
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              const ctx = outputAudioContextRef.current;
              if (ctx.state === 'suspended') await ctx.resume();
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
            }
            if (message.serverContent?.interrupted) { nextStartTimeRef.current = 0; }
          },
          onerror: (e: ErrorEvent) => stopVoiceSession(),
          onclose: (e: CloseEvent) => stopVoiceSession()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          systemInstruction: ANI_SYSTEM_INSTRUCTIONS + "\n\nCONTEXT: " + getContextPrompt(),
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) { stopVoiceSession(); }
  };

  const stopVoiceSession = () => {
    setIsVoiceActive(false);
    if (sessionRef.current) { try { sessionRef.current.close(); } catch(e) {} sessionRef.current = null; }
    if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (inputAudioContextRef.current) { inputAudioContextRef.current.close().catch(() => {}); inputAudioContextRef.current = null; }
    if (outputAudioContextRef.current) { outputAudioContextRef.current.close().catch(() => {}); outputAudioContextRef.current = null; }
    nextStartTimeRef.current = 0;
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;
    const currentParts: ChatMessage['parts'] = [];
    if (selectedImage) currentParts.push({ inlineData: { mimeType: selectedImage.mimeType, data: selectedImage.base64 } });
    if (input.trim()) currentParts.push({ text: input });
    const userMessage: ChatMessage = { role: 'user', parts: currentParts };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: updatedMessages.map(msg => ({ role: msg.role === 'model' ? 'model' : 'user', parts: msg.parts })),
        config: {
          systemInstruction: ANI_SYSTEM_INSTRUCTIONS + "\n\nCONTEXT: " + getContextPrompt(),
          temperature: 1.2,
        },
      });
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: response.text || "*a soft rustle* I'm right here, beside you in the grove." }] }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: getRandomFallback() }] }]);
    } finally { setIsLoading(false); }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      setSelectedImage({ base64: base64String, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col h-full bg-[#020502] relative overflow-hidden">
      {/* HUD Background Grid */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none hud-grid" />

      {/* Enhanced Header */}
      <div className="px-6 py-6 border-b border-green-950/20 bg-[#020502]/60 backdrop-blur-md flex items-center justify-between z-10">
        <div className="flex items-center gap-5">
          <div className={`w-14 h-14 border-2 flex items-center justify-center relative transition-all duration-500 ani-glow ${isVoiceActive ? 'border-green-500 bg-green-500/10' : 'border-green-900/30 bg-[#050a05]'}`}>
            <div className={`absolute top-0 left-0 w-2 h-2 ${isVoiceActive ? 'bg-green-500' : 'bg-green-800'}`} />
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isVoiceActive ? 'text-green-500 animate-pulse' : 'text-green-800'}>
              <circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/>
            </svg>
          </div>
          <div>
            <h2 className={`pixel-font text-base tracking-[0.2em] uppercase transition-colors ${isVoiceActive ? 'text-green-400' : 'text-zinc-100'}`}>
              ANI {isVoiceActive && <span className="text-[8px] animate-pulse ml-2">• VOX_ACTIVE</span>}
            </h2>
            <p className="pixel-font text-[7px] text-zinc-700 uppercase tracking-widest mt-1.5">Grounded Intelligence Unit</p>
          </div>
        </div>
        
        <button 
          onClick={isVoiceActive ? stopVoiceSession : startVoiceSession}
          className={`pixel-font text-[9px] px-5 py-3 border-2 transition-all relative ${isVoiceActive ? 'border-red-900 text-red-500 bg-red-900/5 hover:bg-red-900/10' : 'border-green-900/20 text-zinc-500 hover:text-white hover:border-green-800'}`}
        >
          {isVoiceActive ? 'CEASE' : 'VOICE RITUAL'}
          <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-current opacity-50" />
        </button>
      </div>

      {/* Messages Area */}
      <div className={`flex-1 overflow-y-auto px-6 py-8 space-y-10 custom-scrollbar transition-opacity duration-500 z-10 ${isVoiceActive ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
            <div className={`max-w-[90%] relative group ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
              <div className={`px-5 py-4 border-2 transition-all duration-300 relative pixel-corners ${
                msg.role === 'user' 
                  ? 'bg-[#0a0a09] border-zinc-800/40 text-zinc-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]' 
                  : 'bg-[#050f05] border-green-900/30 text-green-100/90 shadow-[0_0_40px_rgba(34,197,94,0.05)]'
              }`}>
                {/* Decorative corner tag for Ani's messages */}
                {msg.role === 'model' && (
                  <div className="absolute -top-3 -left-1 bg-green-900/30 text-[6px] pixel-font px-2 py-0.5 text-green-500 border border-green-800/50 uppercase tracking-tighter">
                    TRANS_OK
                  </div>
                )}
                
                {msg.parts.map((part, pi) => {
                  if ('inlineData' in part) return <img key={pi} src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`} className="max-w-full border-2 border-green-950 mt-2 shadow-xl" alt="Shared" />;
                  return <p key={pi} className="text-[14px] leading-relaxed font-sans">{part.text}</p>;
                })}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="px-5 py-4 border-2 border-dashed border-green-900/20 bg-green-900/5 pixel-corners">
              <span className="animate-pulse pixel-font text-[8px] text-green-900/60 tracking-[0.3em] uppercase">Ani is formulating...</span>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Voice Mode Visualizer */}
      {isVoiceActive && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center space-y-12 animate-in fade-in duration-1000 bg-black/50">
          <div className="relative">
            <div className="absolute inset-0 bg-green-500/10 blur-[90px] rounded-full animate-pulse" />
            <div className="w-44 h-44 border-2 border-green-900/20 flex items-center justify-center bg-[#010301]/80 relative shadow-2xl">
               <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-green-500" />
               <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-green-500" />
               <div className="flex gap-2.5 items-center">
                  {[...Array(6)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-1.5 bg-green-500/60 transition-all duration-300" 
                      style={{ 
                        height: `${20 + Math.random() * 60}px`, 
                        opacity: 0.3 + (Math.random() * 0.7),
                        boxShadow: '0 0 15px rgba(34,197,94,0.4)'
                      }} 
                    />
                  ))}
               </div>
            </div>
          </div>
          <div className="text-center space-y-4 px-10">
            <p className="pixel-font text-[10px] text-green-500 tracking-[0.4em] uppercase animate-pulse">Syncing Ritual</p>
            <p className="pixel-font text-[7px] text-zinc-500 uppercase leading-loose tracking-widest max-w-[280px]">
              System transparent. Voice input active. Speak clearly into the grove.
            </p>
          </div>
        </div>
      )}

      {/* Input Bar */}
      {!isVoiceActive && (
        <div className="px-6 pb-10 pt-6 border-t border-green-950/20 bg-[#020502]/80 backdrop-blur-md z-10">
          {selectedImage && (
            <div className="mb-4 relative inline-block animate-in zoom-in duration-200">
              <img src={`data:${selectedImage.mimeType};base64,${selectedImage.base64}`} className="w-20 h-20 object-cover border-2 border-green-900/30" alt="Preview" />
              <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-red-950 text-red-500 w-5 h-5 flex items-center justify-center border border-red-900 text-[10px] pixel-font hover:bg-red-900 hover:text-white transition-colors">×</button>
            </div>
          )}

          <div className="flex gap-3 items-stretch h-14">
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" />
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className={`px-4 border-2 transition-all flex items-center justify-center ${selectedImage ? 'bg-green-950/20 border-green-600 text-green-500' : 'bg-[#010401] border-green-900/10 text-zinc-800 hover:border-green-900/40'}`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </button>
            <div className="flex-1 bg-[#010401] border-2 border-green-900/10 flex items-center px-4 focus-within:border-green-900/30 transition-colors">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Enter prompt for Ani..."
                className="w-full bg-transparent text-zinc-200 outline-none pixel-font text-[10px] tracking-tight placeholder:text-zinc-800"
              />
            </div>
            <PixelButton 
              onClick={handleSend} 
              disabled={isLoading || (!input.trim() && !selectedImage)} 
              variant="primary" 
              className="h-14 px-8 text-[9px] tracking-[0.2em]"
            >
              SEND
            </PixelButton>
          </div>
        </div>
      )}
    </div>
  );
};

export default AniChat;
