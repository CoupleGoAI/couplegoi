import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Dices, Flame, Heart, Sparkles } from 'lucide-react';

const HomeScreen: React.FC = () => {
  return (
    <div className="mobile-container gradient-hero min-h-screen pb-24">
      {/* Header */}
      <div className="px-6 pt-14 pb-2 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Good evening 💕</p>
          <h1 className="font-serif text-2xl font-bold mt-0.5">Hey, you two</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-semibold border-2 border-background">Y</div>
            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground text-xs font-semibold border-2 border-background">P</div>
          </div>
        </div>
      </div>

      {/* Streak */}
      <div className="px-6 mt-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-card shadow-card border border-border"
        >
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <Flame className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">7-day streak 🔥</p>
            <p className="text-xs text-muted-foreground">Keep chatting to grow your bond</p>
          </div>
        </motion.div>
      </div>

      {/* Main Actions */}
      <div className="px-6 mt-6 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">What shall we do?</p>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full text-left p-6 rounded-3xl bg-card border border-border shadow-card hover:shadow-soft transition-all active:scale-[0.98]"
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shrink-0">
              <MessageCircle className="w-7 h-7 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-serif text-xl font-bold">AI Chat</h3>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Talk things through with your personal AI — together or solo.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">Resolve</span>
            <span className="px-3 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-medium">Reflect</span>
            <span className="px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium">Connect</span>
          </div>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full text-left p-6 rounded-3xl bg-card border border-border shadow-card hover:shadow-soft transition-all active:scale-[0.98]"
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center shrink-0">
              <Dices className="w-7 h-7 text-secondary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-serif text-xl font-bold">Truth or Dare</h3>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Play together in real-time. Romantic, spicy, or silly — your pick.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'hsl(340 80% 92%)', color: 'hsl(340 60% 50%)' }}>
              <Heart className="w-3 h-3 inline mr-1" />Romantic
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'hsl(15 90% 92%)', color: 'hsl(15 70% 45%)' }}>
              🌶 Spicy
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'hsl(270 60% 93%)', color: 'hsl(270 50% 50%)' }}>
              😄 Fun
            </span>
          </div>
        </motion.button>
      </div>

      {/* Daily Suggestion */}
      <div className="px-6 mt-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-5 rounded-3xl border border-border bg-card/60 backdrop-blur"
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Daily idea</span>
          </div>
          <p className="text-sm leading-relaxed">
            Send your partner a voice note telling them one thing you appreciate about them today. 💌
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default HomeScreen;
