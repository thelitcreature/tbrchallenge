import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import onboarding1 from '@/assets/onboarding-1.png';
import onboarding2 from '@/assets/onboarding-2.png';
import onboarding3 from '@/assets/onboarding-3.png';

const SCREENS = [
  {
    image: onboarding1,
    headline: 'Too many books.\nNo idea what to read next?',
    subtext: 'You keep adding books to your TBR… but choosing the next one feels impossible.',
  },
  {
    image: onboarding2,
    headline: 'Let your TBR\nchoose for you.',
    subtext: 'This app helps you pick your next read, finish books you already own, and finally shrink your TBR.',
  },
  {
    image: onboarding3,
    headline: 'Read before you buy.',
    subtext: 'Turn your TBR into a fun challenge and rediscover the books you already wanted to read.',
  },
];

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const isLast = step === SCREENS.length - 1;
  const screen = SCREENS[step];

  const next = () => {
    if (isLast) {
      localStorage.setItem('plottwist-onboarded', '1');
      onComplete();
    } else {
      setStep((s) => s + 1);
    }
  };

  const skip = () => {
    localStorage.setItem('plottwist-onboarded', '1');
    onComplete();
  };

  const [direction, setDirection] = useState(1);

  const handleDragEnd = (_: any, info: { offset: { x: number }; velocity: { x: number } }) => {
    const swipe = Math.abs(info.offset.x) * info.velocity.x;
    if (info.offset.x < -50 || swipe < -500) {
      next();
    } else if ((info.offset.x > 50 || swipe > 500) && step > 0) {
      setDirection(-1);
      setStep((s) => s - 1);
    }
  };

  const originalNext = next;
  const wrappedNext = () => { setDirection(1); originalNext(); };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12 overflow-hidden">
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          initial={{ opacity: 0, x: (d: number) => (typeof d === 'number' ? d : 1) * 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: (d: number) => (typeof d === 'number' ? d : 1) * -60 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.3}
          onDragEnd={handleDragEnd}
          className="flex flex-col items-center text-center max-w-sm w-full cursor-grab active:cursor-grabbing touch-pan-y"
        >
          {/* Illustration */}
          <motion.img
            src={screen.image}
            alt=""
            className="w-52 h-52 object-contain mb-8"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          />

          {/* Headline */}
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground leading-tight whitespace-pre-line mb-4">
            {screen.headline}
          </h2>

          {/* Subtext */}
          <p className="font-body text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xs">
            {screen.subtext}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Controls */}
      <div className="mt-12 flex flex-col items-center gap-4 w-full max-w-xs">
        {/* Dots */}
        <div className="flex gap-2">
          {SCREENS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === step ? 'bg-primary w-6' : 'bg-border hover:bg-muted-foreground/30'
              }`}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>

        {/* CTA */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={next}
          className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-body text-base font-semibold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors"
        >
          {isLast ? 'Start my TBR' : 'Next'}
        </motion.button>

        {/* Skip */}
        {!isLast && (
          <button
            onClick={skip}
            className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
