import React from 'react';
import { motion } from 'framer-motion';
import { Settings, ChevronRight, Heart, Bell, Shield, LogOut, Sparkles } from 'lucide-react';

const ProfileScreen: React.FC = () => {
  const menuItems = [
    { icon: Heart, label: 'Relationship', subtitle: 'Connected since Jan 2026' },
    { icon: Bell, label: 'Notifications', subtitle: 'Daily reminders on' },
    { icon: Shield, label: 'Privacy & Security', subtitle: 'End-to-end encrypted' },
    { icon: Settings, label: 'Preferences', subtitle: 'Language, theme, sounds' },
  ];

  return (
    <div className="mobile-container gradient-hero min-h-screen pb-24">
      <div className="px-6 pt-14 pb-4">
        <h1 className="font-serif text-2xl font-bold">Profile</h1>
      </div>

      {/* Profile Card */}
      <div className="px-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-3xl bg-card border border-border shadow-card flex flex-col items-center text-center"
        >
          <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-2xl font-bold shadow-soft">
            Y
          </div>
          <h2 className="font-serif text-xl font-bold mt-3">You</h2>
          <p className="text-sm text-muted-foreground mt-0.5">you@email.com</p>

          <div className="flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-primary/10">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">Premium Member</span>
          </div>

          {/* Partner Connection */}
          <div className="flex items-center gap-3 mt-5 pt-5 border-t border-border w-full justify-center">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">Y</div>
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4 text-primary" fill="currentColor" />
            </div>
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground text-sm font-semibold">P</div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Connected · 7 day streak 🔥</p>
        </motion.div>
      </div>

      {/* Menu */}
      <div className="px-6 mt-6 space-y-2">
        {menuItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.button
              key={item.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="w-full flex items-center gap-3.5 p-4 rounded-2xl bg-card border border-border hover:shadow-card transition-all text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <Icon className="w-5 h-5 text-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.subtitle}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </motion.button>
          );
        })}
      </div>

      {/* Logout */}
      <div className="px-6 mt-6">
        <button className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-destructive/20 text-destructive text-sm font-medium hover:bg-destructive/5 transition-colors">
          <LogOut className="w-4 h-4" />
          Log Out
        </button>
      </div>
    </div>
  );
};

export default ProfileScreen;
