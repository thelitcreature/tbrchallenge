import { motion } from 'framer-motion';

type Mode = 'discover' | 'tbr';

interface ModeToggleProps {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  tbrCount: number;
}

export function ModeToggle({ mode, onModeChange, tbrCount }: ModeToggleProps) {
  return (
    <div className="relative inline-flex bg-secondary rounded-full p-1">
      <motion.div
        className="absolute top-1 bottom-1 rounded-full bg-card shadow-card"
        layout
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        style={{
          left: mode === 'discover' ? '4px' : '50%',
          right: mode === 'tbr' ? '4px' : '50%',
        }}
      />
      <button
        onClick={() => onModeChange('discover')}
        className={`relative z-10 px-5 py-2 rounded-full text-sm font-body font-medium transition-colors ${
          mode === 'discover' ? 'text-foreground' : 'text-muted-foreground'
        }`}
      >
        Discover
      </button>
      <button
        onClick={() => onModeChange('tbr')}
        className={`relative z-10 px-5 py-2 rounded-full text-sm font-body font-medium transition-colors flex items-center gap-1.5 ${
          mode === 'tbr' ? 'text-foreground' : 'text-muted-foreground'
        }`}
      >
        My TBR
        {tbrCount > 0 && (
          <span className="bg-primary text-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center font-semibold">
            {tbrCount}
          </span>
        )}
      </button>
    </div>
  );
}
