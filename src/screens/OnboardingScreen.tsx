import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ArrowRight, QrCode, ScanLine, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import heroCoupleImg from '@/assets/hero-couple.png';

interface OnboardingScreenProps {
  onComplete: () => void;
}

const steps = [
  {
    id: 'welcome',
    badge: '✨ Welcome to CoupleGoAI',
  },
  {
    id: 'signup',
    title: 'Create your account',
    subtitle: 'Just a name and email to get started',
  },
  {
    id: 'connect',
    title: 'Connect with your partner',
    subtitle: 'Share your QR code or scan theirs',
  },
  {
    id: 'connected',
    title: "You're connected!",
    subtitle: 'Start exploring together',
  },
];

const slideVariants = {
  enter: (d: number) => ({ x: d > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d > 0 ? -300 : 300, opacity: 0 }),
};

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [name, setName] = useState('');
  const [connectMode, setConnectMode] = useState<'generate' | 'scan' | null>(null);

  const next = () => {
    if (step < steps.length - 1) {
      setDirection(1);
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="mobile-container gradient-hero flex flex-col min-h-screen">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 pt-14 pb-4">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === step ? 'w-8 gradient-primary' : i < step ? 'w-1.5 bg-primary/40' : 'w-1.5 bg-border'
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="flex-1 flex flex-col items-center px-8"
        >
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              >
                <img src={heroCoupleImg} alt="Couple illustration" className="w-48 h-48 object-contain" />
              </motion.div>
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Sparkles className="w-3.5 h-3.5" /> CoupleGoAI
              </span>
              <h1 className="font-serif text-3xl font-bold leading-tight">
                Your relationship's{' '}
                <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, hsl(330, 76%, 65%), hsl(270, 60%, 65%))' }}>secret superpower</span>
              </h1>
              <p className="text-muted-foreground text-base leading-relaxed max-w-xs">
                A personal AI for both of you. Grow closer, resolve conflicts, and have fun together.
              </p>
            </div>
          )}

          {/* Step 1: Sign up */}
          {step === 1 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 w-full">
              <div className="w-16 h-16 rounded-3xl gradient-primary flex items-center justify-center shadow-soft">
                <Heart className="w-8 h-8 text-primary-foreground" />
              </div>
              <h2 className="font-serif text-2xl font-bold">{steps[1].title}</h2>
              <p className="text-muted-foreground text-sm">{steps[1].subtitle}</p>
              <div className="w-full space-y-3 max-w-xs">
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-5 py-3.5 rounded-2xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-base"
                />
                <input
                  type="email"
                  placeholder="Email address"
                  className="w-full px-5 py-3.5 rounded-2xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-base"
                />
              </div>
            </div>
          )}

          {/* Step 2: Connect */}
          {step === 2 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 w-full">
              <h2 className="font-serif text-2xl font-bold">{steps[2].title}</h2>
              <p className="text-muted-foreground text-sm">{steps[2].subtitle}</p>
              <div className="flex gap-4 w-full max-w-xs">
                <button
                  onClick={() => setConnectMode('generate')}
                  className={`flex-1 flex flex-col items-center gap-3 p-5 rounded-3xl border-2 transition-all ${
                    connectMode === 'generate'
                      ? 'border-primary bg-primary/5 shadow-soft'
                      : 'border-border bg-card'
                  }`}
                >
                  <QrCode className="w-8 h-8 text-primary" />
                  <span className="text-sm font-medium">Show QR</span>
                </button>
                <button
                  onClick={() => setConnectMode('scan')}
                  className={`flex-1 flex flex-col items-center gap-3 p-5 rounded-3xl border-2 transition-all ${
                    connectMode === 'scan'
                      ? 'border-primary bg-primary/5 shadow-soft'
                      : 'border-border bg-card'
                  }`}
                >
                  <ScanLine className="w-8 h-8 text-secondary" />
                  <span className="text-sm font-medium">Scan QR</span>
                </button>
              </div>

              {connectMode === 'generate' && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-48 h-48 rounded-3xl bg-card border border-border flex items-center justify-center shadow-card"
                >
                  <div className="grid grid-cols-5 gap-1 w-28 h-28">
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div key={i} className={`rounded-sm ${Math.random() > 0.4 ? 'bg-foreground' : 'bg-transparent'}`} />
                    ))}
                  </div>
                </motion.div>
              )}

              {connectMode === 'scan' && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-48 h-48 rounded-3xl bg-foreground/5 border-2 border-dashed border-primary/30 flex items-center justify-center"
                >
                  <div className="text-center">
                    <ScanLine className="w-10 h-10 text-primary mx-auto mb-2 animate-pulse-soft" />
                    <span className="text-xs text-muted-foreground">Point at partner's QR</span>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* Step 3: Connected */}
          {step === 3 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center shadow-soft"
              >
                <Heart className="w-10 h-10 text-primary-foreground" fill="currentColor" />
              </motion.div>
              <h2 className="font-serif text-2xl font-bold">{steps[3].title}</h2>
              <p className="text-muted-foreground text-sm max-w-xs">{steps[3].subtitle}</p>
              <div className="flex items-center gap-3 mt-4">
                <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-lg">
                  {name?.[0]?.toUpperCase() || 'Y'}
                </div>
                <div className="flex items-center gap-1">
                  <Heart className="w-4 h-4 text-primary" fill="currentColor" />
                  <Heart className="w-3 h-3 text-secondary" fill="currentColor" />
                </div>
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-semibold text-lg">
                  P
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Bottom CTA */}
      <div className="px-8 pb-10 pt-4">
        <Button
          onClick={next}
          className="w-full h-14 rounded-2xl gradient-primary text-primary-foreground text-base font-semibold shadow-soft border-0 hover:opacity-90 transition-opacity"
        >
          {step === steps.length - 1 ? "Let's go" : 'Continue'}
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};

export default OnboardingScreen;
