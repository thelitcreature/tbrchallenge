import { motion } from 'framer-motion';

export type Mode = 'discover' | 'tbr' | 'wishlist';

interface ModeToggleProps {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  tbrCount: number;
  wishlistCount: number;
}

const TABS: { key: Mode; label: string }[] = [
  { key: 'discover', label: 'Discover' },
  { key: 'tbr', label: 'Choose from my TBR' },
  { key: 'wishlist', label: 'Want to Read' },
];

export function ModeToggle({ mode, onModeChange, tbrCount, wishlistCount }: ModeToggleProps) {
  const activeIndex = TABS.findIndex((t) => t.key === mode);
  const count = (key: Mode) => key === 'tbr' ? tbrCount : key === 'wishlist' ? wishlistCount : 0;

  return (
    <div className="relative inline-flex bg-secondary rounded-full p-1">
      <motion.div
        className="absolute top-1 bottom-1 rounded-full bg-card shadow-card"
        layout
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        style={{
          left: `calc(${(activeIndex / TABS.length) * 100}% + 4px)`,
          width: `calc(${100 / TABS.length}% - 8px)`,
        }}
      />
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onModeChange(tab.key)}
          className={`relative z-10 px-4 sm:px-5 py-2 rounded-full text-sm font-body font-medium transition-colors flex items-center gap-1.5 ${
            mode === tab.key ? 'text-foreground' : 'text-muted-foreground'
          }`}
        >
          {tab.label}
          {count(tab.key) > 0 && (
            <span className="bg-primary text-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center font-semibold">
              {count(tab.key)}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
