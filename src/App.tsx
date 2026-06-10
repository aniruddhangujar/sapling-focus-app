
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SaplingGoal, UserProfile, TimelineType, TreeType, AppTab, PomoVisualMode } from './types';
import PixelButton from './components/PixelButton';
import SaplingCanvas from './components/SaplingCanvas';
import GoalModal from './components/GoalModal';
import FocusSession from './components/FocusSession';
import AniChat from './components/AniChat';
import SanctuaryModal from './components/SanctuaryModal';
import { COLORS, TREE_CONFIGS } from './constants';

// Per-tree-type accent colors for card styling
const TREE_ACCENT_COLORS: Record<string, { border: string; glow: string; progress: string; bg: string; text: string }> = {
  [TreeType.OAK]:            { border: 'border-green-800/50',   glow: 'card-glow-green', progress: 'from-green-600 to-emerald-400',   bg: 'bg-green-500/5',   text: 'text-green-400' },
  [TreeType.CHERRY_BLOSSOM]: { border: 'border-pink-800/50',    glow: 'card-glow-pink',  progress: 'from-pink-500 to-rose-300',      bg: 'bg-pink-500/5',    text: 'text-pink-300' },
  [TreeType.PINE]:           { border: 'border-green-900/50',   glow: 'card-glow-green', progress: 'from-green-700 to-green-500',     bg: 'bg-green-500/5',   text: 'text-green-500' },
  [TreeType.BAMBOO]:         { border: 'border-emerald-700/50', glow: 'card-glow-green', progress: 'from-emerald-500 to-green-300',   bg: 'bg-emerald-500/5', text: 'text-emerald-400' },
  [TreeType.CACTUS]:         { border: 'border-lime-700/50',    glow: 'card-glow-lime',  progress: 'from-lime-500 to-yellow-300',    bg: 'bg-lime-500/5',    text: 'text-lime-400' },
  [TreeType.MAPLE]:          { border: 'border-red-800/50',     glow: 'card-glow-red',   progress: 'from-red-500 to-orange-400',     bg: 'bg-red-500/5',     text: 'text-red-400' },
  [TreeType.BAOBAB]:         { border: 'border-amber-700/50',   glow: 'card-glow-amber', progress: 'from-amber-500 to-yellow-300',   bg: 'bg-amber-500/5',   text: 'text-amber-400' },
  [TreeType.CEDAR]:          { border: 'border-teal-800/50',    glow: 'card-glow-teal',  progress: 'from-teal-600 to-cyan-400',      bg: 'bg-teal-500/5',    text: 'text-teal-400' },
  [TreeType.WILLOW]:         { border: 'border-lime-700/50',    glow: 'card-glow-lime',  progress: 'from-lime-500 to-green-300',     bg: 'bg-lime-500/5',    text: 'text-lime-400' },
  [TreeType.SEQUOIA]:        { border: 'border-green-900/50',   glow: 'card-glow-green', progress: 'from-green-800 to-emerald-500',   bg: 'bg-green-500/5',   text: 'text-green-500' },
  [TreeType.BONSAI]:         { border: 'border-emerald-700/50', glow: 'card-glow-green', progress: 'from-emerald-600 to-green-400',   bg: 'bg-emerald-500/5', text: 'text-emerald-400' },
};

// Ambient floating particles component
const FloatingParticles: React.FC = () => {
  const particles = useMemo(() => 
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      left: `${5 + (i * 5.5) % 90}%`,
      delay: `${(i * 1.7) % 12}s`,
      duration: `${10 + (i * 3.1) % 15}s`,
      size: 1.5 + (i % 3) * 1,
      opacity: 0.15 + (i % 4) * 0.1,
      color: i % 5 === 0 ? '#fbbf24' : i % 3 === 0 ? '#a3e635' : '#22c55e',
    })), []
  );
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full animate-float-up"
          style={{
            left: p.left,
            bottom: '-10px',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationDelay: p.delay,
            animationDuration: p.duration,
            opacity: p.opacity,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}40`,
          }}
        />
      ))}
    </div>
  );
};

const SaplingLogo: React.FC = () => (
  <div className="w-10 h-10 bg-[#050a05] border-2 border-green-800 flex items-center justify-center relative shadow-[0_0_15px_rgba(34,197,94,0.1)] overflow-hidden">
    <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle,#22c55e_1px,transparent_1px)] bg-[length:4px_4px]" />
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 4V10M12 10C12 10 9 7 6 7C3 7 3 10 3 10C3 10 6 10 9 13M12 10C12 10 15 7 18 7C21 7 21 10 21 10C21 10 18 10 15 13M12 21V10" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="10" r="1.5" fill="#4ade80" />
    </svg>
  </div>
);

const App: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('sapling_profile_v3');
    try {
      return saved ? JSON.parse(saved) : { isPremium: false, totalFocusTime: 0, grove: [] };
    } catch (e) {
      return { isPremium: false, totalFocusTime: 0, grove: [] };
    }
  });

  const [activeTab, setActiveTab] = useState<AppTab>('grove');
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showSanctuaryModal, setShowSanctuaryModal] = useState(false);
  const [activeSessionGoal, setActiveSessionGoal] = useState<SaplingGoal | null | 'pomodoro'>(null);
  const [pomoVisualMode, setPomoVisualMode] = useState<PomoVisualMode>('clock');

  useEffect(() => {
    localStorage.setItem('sapling_profile_v3', JSON.stringify(profile));
  }, [profile]);

  const addGoal = (newGoal: Partial<SaplingGoal>) => {
    const goal: SaplingGoal = {
      id: Math.random().toString(36).substr(2, 9),
      accruedMinutes: 0,
      isComplete: false,
      health: 100,
      perfectionScore: 1.0,
      startDate: Date.now(),
      ...newGoal
    } as SaplingGoal;
    setProfile(prev => ({ ...prev, grove: [...prev.grove, goal] }));
    setShowGoalModal(false);
  };

  const handleFocusFinish = (minutes: number) => {
    // We only call this when the session is truly closed by the user from FocusSession
    if (activeSessionGoal === 'pomodoro') {
      setProfile(prev => ({ ...prev, totalFocusTime: prev.totalFocusTime + minutes }));
    } else if (activeSessionGoal) {
      setProfile(prev => {
        const updatedGrove = prev.grove.map(g => {
          if (g.id === (activeSessionGoal as SaplingGoal).id) {
            const newAccrued = g.accruedMinutes + minutes;
            const isComplete = newAccrued >= g.totalTargetMinutes;
            return {
              ...g,
              accruedMinutes: newAccrued,
              lastFocusDate: Date.now(),
              isComplete,
              health: Math.min(100, g.health + 15)
            };
          }
          return g;
        });
        return { ...prev, grove: updatedGrove, totalFocusTime: prev.totalFocusTime + minutes };
      });
    }
    setActiveSessionGoal(null);
  };

  const renderGrove = () => {
    const activeGoals = profile.grove.filter(g => !g.isComplete);
    const getAccent = (type: TreeType) => TREE_ACCENT_COLORS[type] || TREE_ACCENT_COLORS[TreeType.OAK];
    
    return (
      <div className="relative min-h-full">
        {/* Ambient floating particles */}
        <FloatingParticles />
        
        <div className="relative z-10 space-y-8 md:space-y-12 p-6 md:p-8 animate-in fade-in duration-500">
          {/* Grove Header */}
          <div className="flex flex-row justify-between items-end pb-8 gap-4 border-b border-zinc-800/50">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-gentle-pulse" />
                <h1 className="pixel-font text-xl md:text-2xl text-white uppercase tracking-[0.2em]">The Grove</h1>
              </div>
              <p className="text-zinc-500 text-xs tracking-wide ml-5">Your living forest of intentions</p>
            </div>
            <PixelButton onClick={() => setShowGoalModal(true)} variant="success" className="h-12 px-5 whitespace-nowrap">+ Plant Seed</PixelButton>
          </div>

          {activeGoals.length === 0 ? (
            /* ---- Beautiful Empty State ---- */
            <div className="relative border border-zinc-800/30 rounded-lg overflow-hidden">
              {/* Ambient background gradient */}
              <div className="absolute inset-0 bg-gradient-to-b from-green-950/20 via-transparent to-amber-950/10" />
              <div className="absolute inset-0 hud-grid opacity-30" />
              
              <div className="relative p-12 md:p-20 text-center space-y-8">
                {/* Decorative corners */}
                <div className="absolute top-3 left-3 w-6 h-6 border-t border-l border-green-800/40" />
                <div className="absolute top-3 right-3 w-6 h-6 border-t border-r border-green-800/40" />
                <div className="absolute bottom-3 left-3 w-6 h-6 border-b border-l border-green-800/40" />
                <div className="absolute bottom-3 right-3 w-6 h-6 border-b border-r border-green-800/40" />
                
                {/* Central illustration */}
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 blur-3xl bg-green-500/10 rounded-full scale-150" />
                    <div className="relative text-6xl md:text-7xl animate-sway" style={{ transformOrigin: 'bottom center' }}>🌱</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h2 className="pixel-font text-sm md:text-base text-zinc-300 uppercase tracking-[0.3em]">Quiet Soil</h2>
                  <p className="text-zinc-500 text-sm leading-relaxed max-w-md mx-auto">
                    The grove is waiting. Plant your first seed — give it a name, choose a tree spirit, and watch it grow with every moment of focus you pour in.
                  </p>
                </div>
                
                <div className="flex justify-center gap-6 text-zinc-700 text-xs">
                  <span className="flex items-center gap-2"><span className="text-base">🌿</span> Set an intention</span>
                  <span className="flex items-center gap-2"><span className="text-base">⏱</span> Focus deeply</span>
                  <span className="flex items-center gap-2"><span className="text-base">🌳</span> Watch it grow</span>
                </div>
              </div>
            </div>
          ) : (
            /* ---- Goal Cards with Tree-Type Accents ---- */
            <div className="grid grid-cols-1 gap-8">
              {activeGoals.map(goal => {
                const accent = getAccent(goal.type);
                const progressPct = Math.min(100, (goal.accruedMinutes / goal.totalTargetMinutes) * 100);
                const treeConfig = TREE_CONFIGS[goal.type];
                
                return (
                  <div 
                    key={goal.id} 
                    className={`group relative bg-[#030603]/80 border ${accent.border} p-6 md:p-8 flex flex-col gap-6 hover:border-opacity-100 transition-all duration-500 ${accent.glow} rounded-sm`}
                  >
                    {/* Accent top bar */}
                    <div 
                      className="absolute top-0 left-0 right-0 h-[2px] opacity-40 group-hover:opacity-80 transition-opacity duration-500"
                      style={{ background: `linear-gradient(90deg, transparent, ${treeConfig?.color || '#22c55e'}, transparent)` }}
                    />
                    
                    {/* Corner decorations */}
                    <div className="absolute top-2 left-2 w-2 h-2 border-t border-l opacity-30 group-hover:opacity-60 transition-opacity" style={{ borderColor: treeConfig?.color || '#22c55e' }} />
                    <div className="absolute bottom-2 right-2 w-2 h-2 border-b border-r opacity-30 group-hover:opacity-60 transition-opacity" style={{ borderColor: treeConfig?.color || '#22c55e' }} />
                    
                    <div className="flex flex-col sm:flex-row gap-6 md:gap-8">
                      {/* Tree canvas area */}
                      <div className={`${accent.bg} border border-zinc-800/30 flex items-center justify-center shrink-0 w-full sm:w-48 aspect-square relative overflow-hidden rounded-sm`}>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                        <SaplingCanvas goal={goal} size={180} />
                      </div>

                      <div className="flex-1 flex flex-col justify-between">
                        <div className="space-y-5">
                          {/* Title & type */}
                          <div className="space-y-2">
                            <h3 className="pixel-font text-lg md:text-xl text-zinc-100 uppercase tracking-tight truncate">{goal.name}</h3>
                            <div className="flex items-center gap-3">
                              <span className={`text-[10px] font-semibold uppercase tracking-widest ${accent.text}`}>{goal.type}</span>
                              <span className="text-zinc-800">•</span>
                              <span className="text-[10px] text-zinc-600 uppercase tracking-widest">{goal.timeline}</span>
                            </div>
                          </div>
                          
                          {/* Progress bar — colored per tree type */}
                          <div className="space-y-2.5">
                            <div className="flex justify-between items-baseline">
                              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Growth</span>
                              <span className={`pixel-font text-xs ${accent.text}`}>{Math.round(progressPct)}%</span>
                            </div>
                            <div className="h-1.5 bg-zinc-900/80 w-full rounded-full overflow-hidden">
                              <div 
                                className={`h-full bg-gradient-to-r ${accent.progress} rounded-full transition-all duration-1000 ease-out`}
                                style={{ 
                                  width: `${progressPct}%`,
                                  boxShadow: `0 0 12px ${treeConfig?.color || '#22c55e'}40`
                                }}
                              />
                            </div>
                          </div>
                        </div>
                        
                        {/* Bottom row: stats + action */}
                        <div className="flex flex-row items-end gap-4 mt-6">
                          <div className="flex-1 bg-black/30 p-3 border border-zinc-800/40 rounded-sm">
                            <div className="text-zinc-600 mb-1 uppercase text-[9px] tracking-wider font-medium">Accumulated</div>
                            <div className={`font-bold text-sm leading-none whitespace-nowrap ${accent.text}`}>
                              {Math.floor(goal.accruedMinutes / 60)}h {Math.round(goal.accruedMinutes % 60)}m
                            </div>
                          </div>
                          <PixelButton 
                            className="flex-1 py-3 text-[9px]" 
                            variant="primary"
                            onClick={() => setActiveSessionGoal(goal)}
                          >
                            COMMENCE
                          </PixelButton>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTasks = () => {
    const dummyGoal: SaplingGoal = {
      id: 'pomo-preview',
      name: 'Pomo Ritual',
      type: TreeType.OAK,
      timeline: TimelineType.DAY,
      startDate: Date.now(),
      durationInDays: 1,
      dailyTargetMinutes: 25,
      totalTargetMinutes: 25,
      accruedMinutes: 10,
      isComplete: false,
      health: 100,
      perfectionScore: 1.0
    };

    return (
      <div className="p-8 md:p-12 flex flex-col h-full space-y-10 animate-in fade-in duration-700 hud-grid">
        <div className="text-center space-y-4">
           <h1 className="pixel-font text-2xl md:text-3xl text-zinc-100 uppercase tracking-[0.4em]">Pomo Utility</h1>
           <p className="text-zinc-800 text-[10px] uppercase tracking-[0.2em]">Temporal Alignment Active</p>
           
           <div className="flex justify-center gap-2 mt-4 relative z-50">
              <button 
                key="btn-chronos"
                onClick={() => setPomoVisualMode('clock')}
                className={`px-6 py-3 border-2 pixel-font text-[8px] uppercase tracking-widest transition-all ${pomoVisualMode === 'clock' ? 'border-green-600 bg-green-950/20 text-white shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'border-zinc-900 bg-black/40 text-zinc-700 hover:text-zinc-500'}`}
              >
                CHRONOS
              </button>
              <button 
                key="btn-grove"
                onClick={() => setPomoVisualMode('tree')}
                className={`px-6 py-3 border-2 pixel-font text-[8px] uppercase tracking-widest transition-all ${pomoVisualMode === 'tree' ? 'border-green-600 bg-green-950/20 text-white shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'border-zinc-900 bg-black/40 text-zinc-700 hover:text-zinc-500'}`}
              >
                GROVE
              </button>
           </div>
        </div>

        <div className="relative flex-1 flex flex-col items-center justify-center">
           <div className="relative w-72 md:w-80 h-72 md:h-80 flex items-center justify-center bg-[#010401] border-2 border-green-900/20 shadow-2xl group overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-green-500/30 group-hover:border-green-500 transition-all z-20" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-green-500/30 group-hover:border-green-500 transition-all z-20" />

              {pomoVisualMode === 'clock' ? (
                <div key="view-clock" className="absolute inset-0 flex items-center justify-center">
                   <div className="relative w-[90%] h-[90%]">
                      <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90 drop-shadow-[0_0_8px_rgba(34,197,94,0.1)]">
                        <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="2" fill="transparent" className="text-zinc-900/20" />
                        <circle 
                          cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="4" fill="transparent" 
                          strokeDasharray="282.7" 
                          strokeDashoffset="70.67" 
                          className="text-green-500"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <h2 className="pixel-font text-5xl text-white select-none tracking-tighter leading-none mt-2">25:00</h2>
                        <span className="pixel-font text-[8px] text-zinc-700 uppercase mt-10 tracking-[0.4em]">Cycle Ready</span>
                      </div>
                   </div>
                </div>
              ) : (
                <div key="view-tree" className="absolute inset-0 flex flex-col items-center justify-center bg-[#010401] p-4 animate-in zoom-in-95 fade-in duration-300">
                  <div className="relative flex items-center justify-center">
                    <SaplingCanvas goal={dummyGoal} size={280} />
                  </div>
                  <div className="absolute bottom-10 flex flex-col items-center">
                    <h2 className="pixel-font text-3xl text-white select-none tracking-tighter leading-none mt-2">25:00</h2>
                    <span className="pixel-font text-[7px] text-zinc-800 uppercase mt-4 tracking-[0.3em]">Temporal Nature</span>
                  </div>
                </div>
              )}
           </div>
        </div>

        <PixelButton 
          onClick={() => setActiveSessionGoal('pomodoro')} 
          variant="success"
          className="w-full py-8 md:py-10 text-[14px] border-2 tracking-[0.5em] uppercase shadow-[0_10px_40px_rgba(34,197,94,0.15)]"
        >
          Begin Cycle
        </PixelButton>
      </div>
    );
  };

  const renderSanctuary = () => {
    const completed = profile.grove.filter(g => g.isComplete);
    return (
      <div className="p-8 space-y-10 animate-in fade-in duration-700 hud-grid min-h-full">
        <h1 className="pixel-font text-xl text-zinc-500 uppercase tracking-[0.5em] text-center">Historical Logs</h1>
        {completed.length === 0 ? (
          <div className="text-center py-40 opacity-10">
             <p className="pixel-font text-[12px] uppercase tracking-[0.6em]">Empty Archive</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-8">
            {completed.map(goal => (
              <div key={goal.id} className="bg-[#030603] border border-green-950/40 p-8 text-center relative group shadow-lg">
                <SaplingCanvas goal={goal} size={120} animate={false} />
                <h4 className="pixel-font text-[10px] mt-8 text-zinc-500 uppercase truncate">{goal.name}</h4>
                <div className="mt-4 text-[7px] text-zinc-800 pixel-font uppercase tracking-widest font-bold">Grown</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col max-w-2xl mx-auto border-x border-zinc-800/30 bg-[#020502] relative shadow-2xl overflow-hidden">
      {/* ---- Enhanced Header ---- */}
      <header className="px-6 py-5 md:px-8 md:py-6 border-b border-zinc-800/40 flex justify-between items-center glass sticky top-0 z-[60]">
        <div className="flex items-center gap-4">
          <SaplingLogo />
          <div>
            <span className="pixel-font text-xl md:text-2xl tracking-tighter text-white">SAPLING</span>
            <div className="text-[9px] text-zinc-600 tracking-widest mt-0.5">Focus Grove</div>
          </div>
        </div>
        <div className="text-right flex flex-col items-end min-w-[100px]">
           <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 font-medium">Total Focus</div>
           <div className="pixel-font text-base md:text-lg font-bold tracking-tight bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
              {Math.floor(profile.totalFocusTime / 60)}H {Math.round(profile.totalFocusTime % 60)}M
           </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-32">
        {activeTab === 'grove' && renderGrove()}
        {activeTab === 'tasks' && renderTasks()}
        {activeTab === 'sanctuary' && renderSanctuary()}
        {activeTab === 'ani' && <AniChat profile={profile} activeSessionGoal={activeSessionGoal} />}
      </main>

      {/* ---- Glassmorphism Nav ---- */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto glass-nav p-4 md:p-5 grid grid-cols-4 gap-2 md:gap-4 z-[60]">
        {[
          { id: 'grove', label: 'GROVE', icon: <path d="M7 14l5-5 5 5M12 9v12 M5 5h14v14H5z" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round" /> },
          { id: 'tasks', label: 'POMO', icon: <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor" /> },
          { id: 'sanctuary', label: 'LOGS', icon: <rect x="6" y="6" width="12" height="12" fill="currentColor" /> },
          { id: 'ani', label: 'ANI', icon: <g fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/></g> }
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as AppTab)}
            className={`flex flex-col items-center gap-2.5 transition-all duration-300 ${activeTab === tab.id ? 'opacity-100 scale-105' : 'opacity-35 hover:opacity-60 scale-100'}`}
          >
            <div className={`relative w-11 h-11 flex items-center justify-center border transition-all duration-300 rounded-lg ${
              activeTab === tab.id 
                ? 'border-green-500/60 text-green-400 bg-green-500/10' 
                : 'border-zinc-800/50 text-zinc-600 hover:border-zinc-700'
            }`}>
              {activeTab === tab.id && (
                <div className="absolute inset-0 rounded-lg bg-green-500/5 shadow-[0_0_20px_rgba(34,197,94,0.2)]" />
              )}
              <svg width="18" height="18" viewBox="0 0 24 24" className="relative z-10">
                {tab.icon}
              </svg>
            </div>
            <span className={`pixel-font text-[7px] tracking-widest transition-colors duration-300 ${activeTab === tab.id ? 'text-green-400' : 'text-zinc-700'}`}>{tab.label}</span>
          </button>
        ))}
      </nav>

      {showGoalModal && <GoalModal onClose={() => setShowGoalModal(false)} onSubmit={addGoal} />}
      {showSanctuaryModal && <SanctuaryModal onClose={() => setShowSanctuaryModal(false)} onUnlock={() => setProfile(prev => ({...prev, isPremium: true}))} />}
      
      {activeSessionGoal && (
        <FocusSession 
          goal={activeSessionGoal === 'pomodoro' ? null : activeSessionGoal}
          visualMode={activeSessionGoal === 'pomodoro' ? pomoVisualMode : 'tree'}
          onFinish={handleFocusFinish}
          onCancel={() => setActiveSessionGoal(null)}
        />
      )}
    </div>
  );
};

export default App;
