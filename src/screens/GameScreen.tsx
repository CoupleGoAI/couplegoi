import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Flame, Smile, RotateCcw, ArrowRight } from 'lucide-react';

type Category = 'romantic' | 'spicy' | 'fun';

interface GameCard {
  type: 'truth' | 'dare';
  text: string;
}

const gameData: Record<Category, GameCard[]> = {
  romantic: [
    { type: 'truth', text: "What's the moment you knew you were falling for me?" },
    { type: 'dare', text: "Write a love note and read it out loud right now." },
    { type: 'truth', text: "What's your favorite memory of us?" },
    { type: 'dare', text: "Give your partner a 30-second forehead kiss." },
    { type: 'truth', text: "What do I do that makes you feel most loved?" },
    { type: 'dare', text: "Slow dance together for one full minute — no music needed." },
  ],
  spicy: [
    { type: 'truth', text: "What's something you've always wanted to try with me?" },
    { type: 'dare', text: "Send your partner a flirty text right now, even though they're next to you." },
    { type: 'truth', text: "What outfit of mine drives you wild?" },
    { type: 'dare', text: "Whisper something you've never said before into their ear." },
    { type: 'truth', text: "What's the boldest thing you've imagined us doing?" },
    { type: 'dare', text: "Recreate your most memorable kiss." },
  ],
  fun: [
    { type: 'truth', text: "What's the weirdest thing you do when I'm not around?" },
    { type: 'dare', text: "Do your best impression of your partner for 15 seconds." },
    { type: 'truth', text: "What's the most embarrassing song on your playlist?" },
    { type: 'dare', text: "Let your partner post anything on your Instagram story." },
    { type: 'truth', text: "If we swapped lives for a day, what would you do first?" },
    { type: 'dare', text: "Do a TikTok dance together right now." },
  ],
};

const categoryConfig = {
  romantic: { icon: Heart, label: 'Romantic', gradientClass: 'from-pink-400 to-rose-300', bgClass: 'bg-pink-50' },
  spicy: { icon: Flame, label: 'Spicy', gradientClass: 'from-orange-400 to-red-400', bgClass: 'bg-orange-50' },
  fun: { icon: Smile, label: 'Fun / Silly', gradientClass: 'from-violet-400 to-purple-400', bgClass: 'bg-violet-50' },
};

const GameScreen: React.FC = () => {
  const [category, setCategory] = useState<Category | null>(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [choice, setChoice] = useState<'truth' | 'dare' | null>(null);
  const [turn, setTurn] = useState<'you' | 'partner'>('you');

  const filteredCards = category
    ? choice
      ? gameData[category].filter((c) => c.type === choice)
      : gameData[category]
    : [];

  const currentCard = filteredCards[cardIndex % filteredCards.length];

  const nextCard = () => {
    setCardIndex((prev) => prev + 1);
    setTurn((prev) => (prev === 'you' ? 'partner' : 'you'));
  };

  const resetGame = () => {
    setCategory(null);
    setChoice(null);
    setCardIndex(0);
    setTurn('you');
  };

  return (
    <div className="mobile-container gradient-hero min-h-screen pb-24">
      {/* Header */}
      <div className="px-6 pt-14 pb-2">
        <h1 className="font-serif text-2xl font-bold">Truth or Dare</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Play together, grow closer</p>
      </div>

      {/* Category Selection */}
      {!category && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="px-6 mt-6 space-y-3"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Pick a vibe</p>
          {(Object.keys(categoryConfig) as Category[]).map((cat) => {
            const { icon: Icon, label, bgClass } = categoryConfig[cat];
            return (
              <motion.button
                key={cat}
                whileTap={{ scale: 0.97 }}
                onClick={() => setCategory(cat)}
                className={`w-full flex items-center gap-4 p-5 rounded-3xl ${bgClass} border border-border shadow-card text-left transition-all hover:shadow-soft`}
              >
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${categoryConfig[cat].gradientClass} flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{gameData[cat].length} prompts</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto" />
              </motion.button>
            );
          })}
        </motion.div>
      )}

      {/* Truth / Dare Choice */}
      {category && !choice && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-6 mt-8 flex flex-col items-center gap-6"
        >
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground capitalize">{turn === 'you' ? 'Your' : "Partner's"}</span> turn
          </p>
          <div className="flex gap-4 w-full max-w-xs">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setChoice('truth')}
              className="flex-1 py-8 rounded-3xl bg-card border-2 border-primary/30 shadow-card flex flex-col items-center gap-2 hover:border-primary transition-colors"
            >
              <span className="text-3xl">🤔</span>
              <span className="font-serif text-lg font-bold">Truth</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setChoice('dare')}
              className="flex-1 py-8 rounded-3xl bg-card border-2 border-secondary/30 shadow-card flex flex-col items-center gap-2 hover:border-secondary transition-colors"
            >
              <span className="text-3xl">🎯</span>
              <span className="font-serif text-lg font-bold">Dare</span>
            </motion.button>
          </div>
          <button onClick={resetGame} className="flex items-center gap-1.5 text-sm text-muted-foreground mt-4">
            <RotateCcw className="w-3.5 h-3.5" /> Change category
          </button>
        </motion.div>
      )}

      {/* Card Display */}
      {category && choice && currentCard && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-6 mt-6 flex flex-col items-center gap-6"
        >
          {/* Turn indicator */}
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              turn === 'you' ? 'gradient-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
            }`}>
              {turn === 'you' ? 'Y' : 'P'}
            </div>
            <span className="text-sm font-medium capitalize">{turn === 'you' ? 'Your' : "Partner's"} turn</span>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-1.5">
            {filteredCards.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all ${
                i === cardIndex % filteredCards.length ? 'w-6 gradient-primary' : i < cardIndex % filteredCards.length ? 'w-1.5 bg-primary/30' : 'w-1.5 bg-border'
              }`} />
            ))}
          </div>

          {/* The Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={cardIndex}
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: -90, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className={`w-full max-w-sm aspect-[3/4] rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-soft border border-border ${
                choice === 'truth' ? 'bg-gradient-to-br from-pink-50 to-rose-50' : 'bg-gradient-to-br from-violet-50 to-purple-50'
              }`}
            >
              <span className="text-4xl mb-4">{choice === 'truth' ? '🤔' : '🎯'}</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-primary mb-4">
                {choice === 'truth' ? 'Truth' : 'Dare'}
              </span>
              <p className="font-serif text-xl font-bold leading-relaxed text-foreground">
                {currentCard.text}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Actions */}
          <div className="flex gap-3 w-full max-w-xs">
            <button
              onClick={resetGame}
              className="flex-1 py-3.5 rounded-2xl border border-border bg-card text-sm font-medium hover:bg-muted transition-colors"
            >
              End Game
            </button>
            <button
              onClick={nextCard}
              className="flex-1 py-3.5 rounded-2xl gradient-primary text-primary-foreground text-sm font-semibold shadow-soft hover:opacity-90 transition-opacity"
            >
              Next Card →
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default GameScreen;
