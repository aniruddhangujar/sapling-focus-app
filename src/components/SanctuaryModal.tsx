
import React from 'react';
import PixelButton from './PixelButton';

interface Props {
  onClose: () => void;
  onUnlock: () => void;
}

const SanctuaryModal: React.FC<Props> = ({ onClose, onUnlock }) => {
  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-6 z-[300] animate-in fade-in duration-300 backdrop-blur-md">
      <div className="bg-[#121211] w-full max-w-[340px] border-2 border-zinc-900 p-8 flex flex-col items-center text-center shadow-[0_0_100px_rgba(0,0,0,0.8)] relative">
        {/* Sanctuary Heart Icon - Matching the Grove Card */}
        <div className="mb-10 text-[#6da354]">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </div>

        <h2 className="pixel-font text-lg text-white uppercase tracking-tighter leading-tight mb-8 px-2">
          Right now, your growth is temporary.
        </h2>

        <div className="space-y-6 mb-10 text-zinc-500 pixel-font text-[9px] leading-relaxed uppercase tracking-widest">
          <p>
            The Sanctuary preserves your grove — your history, your cycles, and the rare forms your focus unlocks over time.
          </p>
          <p className="text-zinc-300">
            Would you like to make this growth permanent?
          </p>
        </div>

        <div className="w-full space-y-6">
          <button 
            onClick={onUnlock}
            className="w-full py-6 bg-[#6da354] hover:bg-[#7db364] text-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all pixel-font text-[12px] uppercase tracking-tighter"
          >
            Unlock Sanctuary<br/>for ₹199
          </button>

          <button 
            onClick={onClose}
            className="pixel-font text-[8px] text-zinc-700 hover:text-zinc-400 uppercase tracking-widest underline decoration-zinc-900 underline-offset-4 transition-colors"
          >
            Continue slowly for now
          </button>
        </div>

        <div className="mt-12 w-full border-t border-zinc-900 pt-6 flex flex-col items-center">
          <div className="flex gap-1 mb-3">
            {[...Array(24)].map((_, i) => (
              <div key={i} className="w-1 h-1 bg-zinc-900 rounded-full" />
            ))}
          </div>
          <span className="pixel-font text-[7px] text-zinc-800 uppercase tracking-widest font-bold">
            A one-time gift. No subscriptions, ever.
          </span>
        </div>
      </div>
    </div>
  );
};

export default SanctuaryModal;
