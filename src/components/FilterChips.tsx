import { motion } from 'framer-motion';

interface FilterChipsProps<T extends string> {
  label: string;
  options: T[];
  selected: T[];
  onToggle: (option: T) => void;
}

export function FilterChips<T extends string>({ label, options, selected, onToggle }: FilterChipsProps<T>) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-body font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2 justify-center">
        {options.map((option) => {
          const isActive = selected.includes(option);
          return (
            <motion.button
              key={option}
              whileTap={{ scale: 0.95 }}
              onClick={() => onToggle(option)}
              className={`px-4 py-1.5 rounded-full text-sm font-body font-medium transition-colors duration-200 ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {option}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
