import { motion } from 'framer-motion';
import { House, Compass, BookMarked, Trophy } from 'lucide-react';

export type Mode = 'home' | 'discover' | 'tbr' | 'challenges';

interface ModeToggleProps {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  tbrCount: number;
}

const TABS: { key: Mode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'home', label: 'Home', icon: House },
  { key: 'tbr', label: 'My TBR', icon: BookMarked },
  { key: 'discover', label: 'Discover', icon: Compass },
  { key: 'challenges', label: 'Challenges', icon: Trophy },
];

export function ModeToggle({ mode, onModeChange, tbrCount }: ModeToggleProps) {
  const activeIndex = TABS.findIndex((t) => t.key === mode);
  const count = (key: Mode) => key === 'tbr' ? tbrCount : 0;

  return (
    <div className="relative inline-flex bg-secondary rounded-full p-1 w-full max-w-[600px]">
      <motion.div
        className="absolute top-1 bottom-1 rounded-full bg-card shadow-card"
        layout
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        style={{
          left: `calc(${(activeIndex / TABS.length) * 100}% + 4px)`,
          width: `calc(${100 / TABS.length}% - 8px)`,
        }}
      />
      {TABS.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            onClick={() => onModeChange(tab.key)}
            className={`relative z-10 flex-1 px-2 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-body font-medium transition-colors flex items-center justify-center gap-1 sm:gap-1.5 text-center ${
              mode === tab.key ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="hidden sm:inline">{tab.label}</span>
            {count(tab.key) > 0 && (
              <span className="bg-primary text-primary-foreground text-[10px] sm:text-xs w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center font-semibold">
                {count(tab.key)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
