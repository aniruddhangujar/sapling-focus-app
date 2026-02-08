
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SaplingGoal, PomoVisualMode, TreeType, TimelineType } from '../types';
import PixelButton from './PixelButton';
import SaplingCanvas from './SaplingCanvas';
import { QUOTES, MUSIC_TRACKS } from '../constants';

interface Props {
  goal: SaplingGoal | null; 
  visualMode?: PomoVisualMode;
  onFinish: (minutes: number) => void;
  onCancel: () => void;
}

type SessionState = 'active' | 'break_choice' | 'on_break' | 'success';

const BREAK_REMINDERS = [
  "Take a sip of water.",
  "Stretch your back gently.",
  "Rest your eyes on something distant.",
  "Breathe deeply for a moment.",
  "Stand up and move your legs.",
  "You're making great progress.",
  "Release the tension in your hands."
];

interface BirdData {
  id: string;
  type: 'blue' | 'red';
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  perched: boolean;
  spawnedAt: number;
}

const PixelBird: React.FC<{ data: BirdData; frame: number }> = ({ data, frame }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = 32;
  const grid = 16;
  const pSize = size / grid;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = false;

    const drawPixel = (px: number, py: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(px * pSize, py * pSize, pSize, pSize);
    };

    const color = data.type === 'blue' ? '#3b82f6' : '#ef4444';
    const darkColor = data.type === 'blue' ? '#1d4ed8' : '#b91c1c';
    const wingFlap = !data.perched && Math.sin(frame * 0.6) > 0;

    // Body
    [[7,7,color],[8,7,color],[9,7,color],[7,8,color],[8,8,color],[9,8,color],[10,7,'#fbbf24']].forEach(([px,py,c]) => drawPixel(px as number, py as number, c as string));
    // Eye
    drawPixel(9,7,'#000');
    // Wings
    if (wingFlap) {
       drawPixel(7,6,darkColor);
       drawPixel(8,6,darkColor);
    } else {
       drawPixel(7,8,darkColor);
       drawPixel(8,8,darkColor);
    }
  }, [data, frame]);

  return (
    <div 
      className="absolute transition-all duration-300 pointer-events-none z-20" 
      style={{ left: `${data.x}%`, top: `${data.y}%`, transform: 'translateX(-50%)' }}
    >
      <canvas ref={canvasRef} width={size} height={size} style={{ imageRendering: 'pixelated' }} />
    </div>
  );
};

const Butterfly: React.FC<{ frame: number }> = ({ frame }) => {
  const x = useMemo(() => 10 + Math.random() * 80, []);
  const y = useMemo(() => 15 + Math.random() * 45, []);
  const color = useMemo(() => ['#fbbf24', '#f87171', '#60a5fa', '#a78bfa', '#fff'][Math.floor(Math.random()*5)], []);
  const bx = x + Math.sin(frame * 0.05 + x) * 15;
  const by = y + Math.cos(frame * 0.04 + y) * 10;
  const wingOpen = Math.sin(frame * 0.3) > 0;

  return (
    <div 
      className="absolute w-1 h-1 transition-all duration-100 z-10"
      style={{ left: `${bx}%`, top: `${by}%`, backgroundColor: color, opacity: wingOpen ? 1 : 0.4 }}
    />
  );
};

const FocusSession: React.FC<Props> = ({ goal, visualMode = 'clock', onFinish, onCancel }) => {
  const initialDuration = goal ? goal.dailyTargetMinutes * 60 : 25 * 60;
  
  const [sessionState, setSessionState] = useState<SessionState>('active');
  const [seconds, setSeconds] = useState(initialDuration);
  const [isActive, setIsActive] = useState(false);
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const [breakReminderIdx, setBreakReminderIdx] = useState(0);
  const [selectedMusic, setSelectedMusic] = useState(MUSIC_TRACKS[1]); 
  const [isMusicEnabled, setIsMusicEnabled] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [breakDuration, setBreakDuration] = useState(5); 
  const [accruedMins, setAccruedMins] = useState(0);
  const [frame, setFrame] = useState(0);
  const [birds, setBirds] = useState<BirdData[]>([]);
  
  const initialSecondsRef = useRef(initialDuration);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Dummy goal for Pomodoro mode tree visualization
  const pomoDummyGoal: SaplingGoal = useMemo(() => ({
    id: 'pomo-session-tree',
    name: 'Pomo Session',
    type: TreeType.PINE,
    timeline: TimelineType.DAY,
    startDate: Date.now(),
    durationInDays: 1,
    dailyTargetMinutes: 25,
    totalTargetMinutes: 25,
    accruedMinutes: 0,
    isComplete: false,
    health: 100,
    perfectionScore: 1.0
  }), []);

  useEffect(() => {
    let animId: number;
    const tick = () => {
      setFrame(f => f + 1);
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Timer logic
  useEffect(() => {
    let interval: any;
    if (isActive && seconds > 0) {
      interval = setInterval(() => {
        setSeconds(s => s - 1);
      }, 1000);
    } else if (seconds === 0 && isActive) {
      handleStepComplete();
    }
    return () => clearInterval(interval);
  }, [isActive, seconds]);

  // Break Reminder Cycling
  useEffect(() => {
    if (sessionState !== 'on_break') return;
    const interval = setInterval(() => {
      setBreakReminderIdx(prev => (prev + 1) % BREAK_REMINDERS.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [sessionState]);

  // Bird Nature Logic
  useEffect(() => {
    if (sessionState !== 'on_break') {
      setBirds([]);
      return;
    }
    const interval = setInterval(() => {
      if (birds.length < 3 && Math.random() > 0.85) {
        const side = Math.random() > 0.5 ? -10 : 110;
        setBirds(prev => [...prev, {
          id: Math.random().toString(36).substr(2, 5),
          type: Math.random() > 0.5 ? 'blue' : 'red',
          x: side,
          y: 40 + Math.random() * 40,
          targetX: 20 + Math.random() * 60,
          targetY: 70 + Math.random() * 10,
          perched: false,
          spawnedAt: Date.now()
        }]);
      }
      setBirds(prev => {
        return prev.map(b => {
          let nx = b.x;
          let ny = b.y;
          let np = b.perched;
          const dx = b.targetX - b.x;
          const dy = b.targetY - b.y;
          if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
            nx += dx * 0.05;
            ny += dy * 0.05;
          } else {
            np = true;
          }
          return { ...b, x: nx, y: ny, perched: np };
        });
      });
    }, 100);
    return () => clearInterval(interval);
  }, [sessionState, birds.length]);

  const handleStepComplete = () => {
    setIsActive(false);
    if (sessionState === 'active') {
      const actualMins = Math.max(1, Math.floor((initialSecondsRef.current - seconds) / 60));
      setAccruedMins(actualMins);
      // Move to choice screen
      setSessionState('break_choice');
    } else if (sessionState === 'on_break') {
      // Break is over, move to final success
      setSessionState('success');
    }
  };

  const startBreak = () => {
    setSeconds(breakDuration * 60);
    initialSecondsRef.current = breakDuration * 60;
    setSessionState('on_break');
    setIsActive(true);
  };

  const handleAutoSaveExit = () => {
    // Determine total minutes spent focusing before closing
    const totalFocusMinutes = (sessionState === 'active') 
      ? Math.floor((initialSecondsRef.current - seconds) / 60) 
      : accruedMins;

    onFinish(totalFocusMinutes);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return `${m}:${rs.toString().padStart(2, '0')}`;
  };

  const currentAccruingMins = Math.floor((initialSecondsRef.current - seconds) / 60);
  const elapsedSeconds = initialSecondsRef.current - (sessionState === 'active' ? seconds : 0);
  const progressPercent = (seconds / initialSecondsRef.current);

  const activeGoalForCanvas = goal || pomoDummyGoal;

  if (sessionState === 'success') {
    return (
      <div className="fixed inset-0 bg-[#020502] z-[200] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-1000">
        <div className="space-y-8 w-full max-w-sm flex flex-col items-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-green-500 opacity-90 animate-pulse">
             <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="currentColor" />
          </svg>
          <h1 className="pixel-font text-xl text-white uppercase tracking-[0.3em]">Growth Rooted</h1>
          <div className="bg-[#010301] border-2 border-green-900/20 w-64 h-64 flex items-center justify-center relative shadow-2xl overflow-hidden">
             <SaplingCanvas goal={activeGoalForCanvas} size={200} overrideAccruedMinutes={activeGoalForCanvas.accruedMinutes + (goal ? accruedMins : 0)} />
          </div>
          <PixelButton onClick={() => onFinish(accruedMins)} variant="success" className="w-full py-6 text-[12px] tracking-widest mt-4">RETURN TO GROVE</PixelButton>
        </div>
      </div>
    );
  }

  if (sessionState === 'break_choice') {
    return (
      <div className="fixed inset-0 bg-[#020502] z-[200] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
        <div className="space-y-12 w-full max-w-sm">
           <div className="flex flex-col items-center space-y-4">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" className="opacity-80">
                <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z M6 1v3 M10 1v3 M14 1v3" />
              </svg>
              <h1 className="pixel-font text-lg text-white uppercase tracking-[0.3em]">Cycle End</h1>
              <p className="pixel-font text-[8px] text-zinc-600 uppercase tracking-widest">Time Focused: {accruedMins}M</p>
           </div>
           <div className="bg-[#030603] p-6 border border-green-950/20 space-y-4">
              <p className="pixel-font text-[7px] text-zinc-600 uppercase tracking-widest text-center">Break Sanctuary</p>
              <div className="grid grid-cols-4 gap-2">
                 {[5, 10, 15, 20].map(d => (
                   <button 
                     key={d} 
                     onClick={() => setBreakDuration(d)}
                     className={`py-3 pixel-font text-[9px] border-2 transition-all ${breakDuration === d ? 'bg-green-600 border-zinc-950 text-black shadow-lg' : 'bg-[#010401] border-zinc-900 text-zinc-700'}`}
                   >
                     {d}M
                   </button>
                 ))}
              </div>
           </div>
           <div className="space-y-3 pt-4">
              <PixelButton onClick={startBreak} variant="success" className="w-full py-6 text-[11px] tracking-widest">START SANCTUARY BREAK</PixelButton>
              <button onClick={() => setSessionState('success')} className="w-full py-4 pixel-font text-[8px] text-zinc-800 hover:text-zinc-400 uppercase tracking-widest underline underline-offset-4">Skip for now</button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#020502] z-[100] flex flex-col items-center justify-between p-4 text-center animate-in fade-in duration-700 overflow-hidden">
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none hud-grid" />

      {/* HEADER HUD */}
      <div className="w-full max-w-lg pt-4 z-10 shrink-0">
        <div className="flex justify-between items-end px-4 mb-2">
          <div className="text-left">
            <h2 className="pixel-font text-[9px] text-zinc-600 uppercase tracking-[0.4em]">{sessionState === 'on_break' ? 'SANCTUARY' : (goal ? goal.name : 'FOCUS')}</h2>
            <div className={`pixel-font text-[7px] mt-1 ${sessionState === 'on_break' ? 'text-blue-500' : 'text-green-600'}`}>
              {sessionState === 'on_break' ? '• SANCTUARY MODE' : `• +${currentAccruingMins}M ACCRUED`}
            </div>
          </div>
          <div className="text-right">
            <div className="pixel-font text-[6px] text-zinc-800 uppercase tracking-widest">TARGET</div>
            <div className="pixel-font text-[14px] text-zinc-500 font-bold">{formatTime(initialSecondsRef.current)}</div>
          </div>
        </div>
      </div>

      {/* RITUAL VIEWPORT */}
      <div className="relative w-full max-w-[340px] md:max-w-[420px] aspect-square border-y border-green-950/20 bg-[#010301] flex items-center justify-center shadow-2xl overflow-hidden my-4 grow">
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none select-none">
           <span className="pixel-font text-[12px] uppercase tracking-[4em]">{sessionState === 'on_break' ? 'REST' : 'FOCUS'}</span>
        </div>
        
        {/* Nature details for breaks */}
        {sessionState === 'on_break' && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(5)].map((_, i) => <Butterfly key={i} frame={frame + (i * 100)} />)}
          </div>
        )}

        {/* Birds */}
        {sessionState === 'on_break' && birds.map(bird => (
          <PixelBird key={bird.id} data={bird} frame={frame} />
        ))}

        {/* Visual Content */}
        <div className="w-full h-full flex items-center justify-center p-8 z-10">
          {visualMode === 'clock' ? (
            <div className="relative w-full h-full flex items-center justify-center">
               <svg viewBox="0 0 100 100" className="w-[90%] h-[90%] transform -rotate-90 drop-shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                  <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="2" fill="transparent" className="text-zinc-900/20" />
                  <circle 
                    cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="6" fill="transparent" 
                    strokeDasharray="282.7" 
                    strokeDashoffset={`${282.7 * (1 - progressPercent)}`}
                    strokeLinecap="round"
                    className="text-green-500 shadow-[0_0_30px_#22c55e] transition-all duration-1000"
                  />
               </svg>
               <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <h2 className="pixel-font text-5xl md:text-6xl text-white select-none tracking-tighter shadow-green-900/20 leading-none">
                    {formatTime(seconds)}
                  </h2>
                  <span className="pixel-font text-[8px] text-zinc-700 uppercase mt-10 tracking-[0.4em]">{isActive ? 'Ritual in Sync' : 'Static State'}</span>
               </div>
            </div>
          ) : (
            <div className="relative flex flex-col items-center">
              <SaplingCanvas 
                goal={activeGoalForCanvas} 
                size={340} 
                overrideAccruedMinutes={activeGoalForCanvas.accruedMinutes + (goal ? (elapsedSeconds / 60) : 0)} 
              />
              <div className="absolute bottom-[-10px] pixel-font text-3xl text-white select-none tracking-tighter drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                {formatTime(seconds)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TIMER & WELLNESS CONTROLS */}
      <div className="flex flex-col items-center space-y-6 w-full z-10 shrink-0 pb-10">
        <div className="min-h-[40px] flex items-center justify-center px-10">
           <p className="text-zinc-500 text-[11px] italic font-normal uppercase tracking-widest max-w-[320px] transition-all duration-1000">
            "{sessionState === 'on_break' ? BREAK_REMINDERS[breakReminderIdx] : quote}"
           </p>
        </div>

        <div className="w-full max-w-md flex justify-between items-center gap-4 px-10 pt-4">
          <button 
            onClick={() => setShowSettings(true)}
            className={`p-3 border-2 transition-all bg-[#010301] pixel-corners flex items-center justify-center ${isMusicEnabled ? 'border-green-800 text-green-800' : 'border-zinc-900/50 text-zinc-800'}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </button>

          <PixelButton 
            variant={isActive ? 'secondary' : 'primary'}
            onClick={() => setIsActive(!isActive)}
            className="flex-1 py-4 text-[10px] tracking-[0.4em] h-14"
          >
            {isActive ? 'PAUSE' : 'COMMENCE'}
          </PixelButton>

          <button onClick={handleAutoSaveExit} className="p-3 border-2 border-zinc-900 bg-[#010301] text-zinc-800 hover:text-red-900 transition-all pixel-corners flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-[#020502]/98 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-xs bg-[#030603] border-2 border-green-950/20 p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b-2 border-green-950/10 pb-4">
               <h3 className="pixel-font text-[9px] text-green-800 uppercase tracking-widest">Environment</h3>
               <button onClick={() => setShowSettings(false)} className="text-zinc-800 text-2xl leading-none">×</button>
            </div>
            <div className="space-y-2">
              {MUSIC_TRACKS.map(track => (
                <button
                  key={track.id}
                  onClick={() => { setSelectedMusic(track); setIsMusicEnabled(track.id !== 'none'); }}
                  className={`text-[9px] pixel-font w-full p-4 text-left border-2 transition-all ${selectedMusic.id === track.id ? 'border-green-900 bg-green-950/10 text-white' : 'border-zinc-950 bg-black/40 text-zinc-800'}`}
                >
                  {track.name}
                </button>
              ))}
            </div>
            <PixelButton onClick={() => setShowSettings(false)} className="w-full mt-6 py-4 border-2" variant="success">ALIGN</PixelButton>
          </div>
        </div>
      )}

      {isMusicEnabled && selectedMusic.url && (
        <audio ref={audioRef} loop src={selectedMusic.url} style={{ display: 'none' }} />
      )}
    </div>
  );
};

export default FocusSession;
