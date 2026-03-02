import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import OnboardingScreen from '@/screens/OnboardingScreen';
import HomeScreen from '@/screens/HomeScreen';
import ChatScreen from '@/screens/ChatScreen';
import GameScreen from '@/screens/GameScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import TabBar from '@/components/TabBar';

const Index = () => {
  const [onboarded, setOnboarded] = useState(false);
  const [activeTab, setActiveTab] = useState('home');

  if (!onboarded) {
    return <OnboardingScreen onComplete={() => setOnboarded(true)} />;
  }

  const screens: Record<string, React.ReactNode> = {
    home: <HomeScreen />,
    chat: <ChatScreen />,
    game: <GameScreen />,
    profile: <ProfileScreen />,
  };

  return (
    <div className="mobile-container relative bg-background">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >
          {screens[activeTab]}
        </motion.div>
      </AnimatePresence>
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
