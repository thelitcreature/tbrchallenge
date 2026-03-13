import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';

export type BookLanguage = '' | 'cs' | 'sk';

const LANGUAGES: { code: BookLanguage; label: string; flag?: string }[] = [
  { code: '', label: 'All' },
  { code: 'cs', label: 'Čeština', flag: '🇨🇿' },
  { code: 'sk', label: 'Slovenčina', flag: '🇸🇰' },
];

interface LanguageFilterProps {
  selected: BookLanguage;
  onChange: (lang: BookLanguage) => void;
}

export function LanguageFilter({ selected, onChange }: LanguageFilterProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {LANGUAGES.map((l) => (
        <motion.button
          key={l.code}
          whileTap={{ scale: 0.95 }}
          onClick={() => onChange(l.code)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-body font-medium transition-colors flex items-center gap-1.5 ${
            selected === l.code
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-muted-foreground hover:text-foreground'
          }`}
        >
          {l.flag ? <span>{l.flag}</span> : <Globe className="w-3 h-3" />}
          {l.label}
        </motion.button>
      ))}
    </div>
  );
}
