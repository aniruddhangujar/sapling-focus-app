
import React, { useState } from 'react';
import { TimelineType, TreeType, SaplingGoal } from '../types';
import { TREE_CONFIGS } from '../constants';
import PixelButton from './PixelButton';

interface Props {
  onClose: () => void;
  onSubmit: (goal: Partial<SaplingGoal>) => void;
}

const TreeIcon: React.FC<{ type: TreeType; active: boolean }> = ({ type, active }) => {
  const color = TREE_CONFIGS[type]?.color || '#444';
  const displayColor = active ? color : '#333';
  
  const paths: Record<string, React.ReactNode> = {
    [TreeType.OAK]: (
      <path d="M12 3c-3.3 0-6 2.7-6 6 0 2.2 1.2 4.1 3 5.2V21h6v-6.8c1.8-1.1 3-3 3-5.2 0-3.3-2.7-6-6-6z" />
    ),
    [TreeType.CHERRY_BLOSSOM]: (
      <g>
        <path d="M12 21v-4" />
        <circle cx="12" cy="8" r="4" />
        <circle cx="8" cy="11" r="3" />
        <circle cx="16" cy="11" r="3" />
      </g>
    ),
    [TreeType.PINE]: (
      <path d="M12 2L4 16h16L12 2zm0 4l5 10H7L12 6zm0 15v-5" />
    ),
    [TreeType.BAMBOO]: (
      <path d="M9 21V3M15 21V3M7 8l2-2M17 10l-2-2" strokeWidth="2" />
    ),
    [TreeType.CACTUS]: (
      <path d="M12 21V5c0-1.7-1.3-3-3-3S6 3.3 6 5v5m6 0h3c1.7 0 3 1.3 3 3v4" strokeWidth="2" />
    ),
    [TreeType.MAPLE]: (
      <path d="M12 2l2 4 5 1-4 4 1 5-4-2-4 2 1-5-4-4 5-1z" />
    ),
    [TreeType.BAOBAB]: (
      <path d="M7 21h10v-6c0-4-2-6-5-6s-5 2-5 6v6z" />
    ),
    [TreeType.CEDAR]: (
      <path d="M12 2L6 18h12L12 2zm0 6l3 9H9l3-9z" />
    ),
    [TreeType.WILLOW]: (
      <path d="M12 3v18M12 8c-4 0-6 4-6 8M12 10c4 0 6 4 6 8" strokeWidth="2" />
    ),
    [TreeType.SEQUOIA]: (
      <path d="M10 21h4V5l-2-2-2 2v16z" fill="currentColor" />
    ),
    [TreeType.BONSAI]: (
      <path d="M8 21h8M12 21V16M12 16c-3 0-4-2-4-4s2-4 4-4 4 2 4 4-2 4-4 4z" strokeWidth="1.5" />
    )
  };

  return (
    <svg 
      width="28" height="28" viewBox="0 0 24 24" 
      fill={active ? displayColor : "none"} 
      stroke={displayColor} 
      strokeWidth="1.5"
      className="mb-2 transition-all duration-300"
    >
      {paths[type] || paths[TreeType.OAK]}
    </svg>
  );
};

const NumberInput: React.FC<{ value: number; onChange: (v: number) => void }> = ({ value, onChange }) => (
  <div className="flex bg-[#0a0a0a] border-2 border-zinc-900 items-center overflow-hidden">
    <div className="flex-1 text-center py-4">
      <span className="pixel-font text-xl text-zinc-100">{value}</span>
    </div>
    <div className="flex flex-col border-l-2 border-zinc-900">
      <button 
        onClick={() => onChange(value + 1)} 
        className="px-4 py-2 hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
      >
        <span className="text-[10px]">▲</span>
      </button>
      <button 
        onClick={() => onChange(Math.max(1, value - 1))} 
        className="px-4 py-2 border-t-2 border-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
      >
        <span className="text-[10px]">▼</span>
      </button>
    </div>
  </div>
);

const GoalModal: React.FC<Props> = ({ onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<TreeType>(TreeType.OAK);
  const [timeline, setTimeline] = useState<TimelineType>(TimelineType.DAY);
  const [durationValue, setDurationValue] = useState(2); 
  const [focusValue, setFocusValue] = useState(4);
  const [focusUnit, setFocusUnit] = useState<'hrs' | 'mins'>('hrs');

  const calculateTotalMinutes = () => {
    let days = durationValue;
    if (timeline === TimelineType.WEEK) days = durationValue * 7;
    if (timeline === TimelineType.MONTH) days = durationValue * 30;
    if (timeline === TimelineType.YEAR) days = durationValue * 365;
    
    const dailyMins = focusUnit === 'hrs' ? focusValue * 60 : focusValue;
    return dailyMins * days;
  };

  const getMaturityText = () => {
    const totalMinutes = calculateTotalMinutes();
    const d = Math.floor(totalMinutes / 1440);
    const h = Math.floor((totalMinutes % 1440) / 60);
    const m = totalMinutes % 60;
    
    let parts = [];
    if (d > 0) parts.push(`${d} ${d === 1 ? 'day' : 'days'}`);
    if (h > 0) parts.push(`${h} ${h === 1 ? 'hour' : 'hours'}`);
    if (m > 0) {
      if (parts.length > 0) parts.push('and');
      parts.push(`${m} ${m === 1 ? 'min' : 'mins'}`);
    }
    
    // Clean up "and" placement
    if (parts.includes('and')) {
       const andIdx = parts.indexOf('and');
       if (andIdx === parts.length - 1) parts.splice(andIdx, 1);
    }

    return `The tree will be fully mature in ${parts.join(' ')}`;
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    let days = durationValue;
    if (timeline === TimelineType.WEEK) days = durationValue * 7;
    if (timeline === TimelineType.MONTH) days = durationValue * 30;
    if (timeline === TimelineType.YEAR) days = durationValue * 365;

    const dailyTarget = focusUnit === 'hrs' ? focusValue * 60 : focusValue;

    onSubmit({
      name,
      type,
      timeline,
      durationInDays: days,
      dailyTargetMinutes: dailyTarget,
      totalTargetMinutes: calculateTotalMinutes(),
      accruedMinutes: 0,
      startDate: Date.now(),
      isComplete: false,
      health: 100,
      perfectionScore: 1.0
    });
  };

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-[150] animate-in fade-in duration-200 backdrop-blur-sm">
      <div className="bg-[#111111] w-[400px] h-[95vh] border-x-2 border-zinc-800 flex flex-col relative shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden">
        
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-zinc-900/30 border-l border-zinc-800 flex flex-col items-center py-4">
           <div className="w-6 bg-zinc-700 h-24 rounded-sm" />
        </div>

        <div className="flex-1 overflow-y-auto p-8 pr-12 space-y-12 pb-16">
          <header className="space-y-6 pt-4 text-center">
            <h2 className="pixel-font text-2xl text-zinc-100 uppercase tracking-tight">PLANT NEW SEED</h2>
            <div className="h-2 bg-black border-y border-zinc-900" />
          </header>

          <section className="space-y-4">
            <h3 className="pixel-font text-[9px] text-zinc-600 uppercase tracking-[0.2em]">INTENT</h3>
            <div className="bg-black border-2 border-zinc-900 p-4 min-h-[56px] flex items-center">
              <input 
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Purpose..."
                className="w-full bg-transparent outline-none pixel-font text-[10px] text-zinc-300 placeholder:text-zinc-800"
              />
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="pixel-font text-[9px] text-zinc-600 uppercase tracking-[0.2em]">TREE VARIETY</h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.values(TreeType).map(t => (
                <button 
                  key={t}
                  onClick={() => setType(t)}
                  className={`group flex flex-col items-center justify-center p-6 border-2 transition-all duration-300 ${type === t ? 'border-green-600 bg-green-950/20' : 'border-zinc-900 bg-black hover:border-zinc-800'}`}
                >
                  <TreeIcon type={t} active={type === t} />
                  <span className={`pixel-font text-[8px] uppercase tracking-widest mt-2 ${type === t ? 'text-zinc-100' : 'text-zinc-700'}`}>{t}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="pixel-font text-[9px] text-zinc-600 uppercase tracking-[0.2em]">GOAL DURATION</h3>
            <div className="flex gap-4">
              <div className="w-24 shrink-0">
                <NumberInput value={durationValue} onChange={setDurationValue} />
              </div>
              <div className="flex-1 grid grid-cols-2 gap-2">
                 {[TimelineType.DAY, TimelineType.WEEK, TimelineType.MONTH, TimelineType.YEAR].map(tl => (
                   <button 
                    key={tl} 
                    onClick={() => setTimeline(tl)}
                    className={`pixel-font text-[7px] p-2 border-2 transition-all ${timeline === tl ? 'border-green-600 text-white bg-green-900/20' : 'border-zinc-900 text-zinc-800'}`}
                   >
                     {tl}
                   </button>
                 ))}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="pixel-font text-[9px] text-zinc-600 uppercase tracking-[0.2em]">DAILY RITUAL</h3>
            <div className="flex gap-4">
              <div className="w-24 shrink-0">
                <NumberInput value={focusValue} onChange={setFocusValue} />
              </div>
              <div className="flex-1 flex gap-2">
                 {['hrs', 'mins'].map(u => (
                   <button 
                    key={u} 
                    onClick={() => setFocusUnit(u as any)}
                    className={`flex-1 pixel-font text-[8px] p-4 border-2 transition-all ${focusUnit === u ? 'border-green-600 text-white bg-green-900/20' : 'border-zinc-900 text-zinc-800'}`}
                   >
                     {u.toUpperCase()}
                   </button>
                 ))}
              </div>
            </div>
          </section>

          {/* Maturity Projection Text at the end of the sections */}
          <section className="pt-4 pb-10 text-center border-t border-zinc-900/30">
            <p className="pixel-font text-[9px] text-green-500 uppercase leading-relaxed tracking-wider font-bold">
              {getMaturityText()}
            </p>
          </section>
        </div>

        <div className="p-8 border-t-2 border-zinc-900 bg-black/80 backdrop-blur-md sticky bottom-0 z-20 flex gap-4">
           <PixelButton onClick={onClose} variant="secondary" className="flex-1">CANCEL</PixelButton>
           <PixelButton onClick={handleCreate} variant="success" className="flex-[2]" disabled={!name.trim()}>PLANT SEED</PixelButton>
        </div>
      </div>
    </div>
  );
};

export default GoalModal;
