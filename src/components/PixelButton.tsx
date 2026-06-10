
import React from 'react';

interface Props {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  className?: string;
  disabled?: boolean;
}

const PixelButton: React.FC<Props> = ({ onClick, children, variant = 'primary', className = '', disabled = false }) => {
  const base = "px-6 py-3 relative transition-all active:translate-y-1 disabled:opacity-50 disabled:pointer-events-none text-white pixel-font uppercase tracking-widest text-[11px] pixel-corners flex items-center justify-center";
  
  const variants = {
    primary: "bg-[#18181b] hover:bg-zinc-800 border-2 border-zinc-700 text-white shadow-[0_4px_0_0_#000000]",
    secondary: "bg-[#050505] hover:bg-[#0a0a0a] border-2 border-zinc-900 text-zinc-600 shadow-[0_4px_0_0_#000000]",
    danger: "bg-red-950/20 hover:bg-red-900/30 border-2 border-red-900 text-red-500 shadow-[0_4px_0_0_#000000]",
    success: "bg-[#22c55e] hover:bg-[#16a34a] border-2 border-[#15803d] text-black shadow-[0_4px_0_0_#000000]",
    ghost: "bg-transparent hover:bg-white/5 border-transparent opacity-40 hover:opacity-100"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export default PixelButton;
