import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';

const VISIBLE_COUNT = 6;

interface FilterChipsProps<T extends string> {
  label: string;
  options: T[];
  selected: T[];
  onToggle: (option: T) => void;
}

export function FilterChips<T extends string>({ label, options, selected, onToggle }: FilterChipsProps<T>) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = options.length > VISIBLE_COUNT;
  const visible = expanded ? options : options.slice(0, VISIBLE_COUNT);

  return (
    <div className="space-y-2 w-full">
      <p className="text-sm font-body font-medium text-muted-foreground">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        <AnimatePresence initial={false}>
          {visible.map((option) => {
            const isActive = selected.includes(option);
            return (
              <motion.button
                key={option}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onToggle(option)}
                className={`px-2 py-1.5 rounded-full text-xs sm:text-sm font-body font-medium transition-colors duration-200 truncate ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {option}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 mx-auto text-xs font-body text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? 'Show less' : 'Show all'}
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      )}
    </div>
  );
}