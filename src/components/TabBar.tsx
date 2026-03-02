import React from 'react';
import { Home, MessageCircle, Gamepad2, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'game', label: 'Game', icon: Gamepad2 },
  { id: 'profile', label: 'Profile', icon: User },
];

const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-background/80 backdrop-blur-xl border-t border-border safe-area-bottom z-50">
      <nav className="flex items-center justify-around px-2 pt-2 pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-2xl transition-all duration-200 min-w-[64px]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-xl transition-all duration-200",
                isActive && "gradient-primary shadow-soft"
              )}>
                <Icon className={cn("w-5 h-5", isActive && "text-primary-foreground")} />
              </div>
              <span className={cn(
                "text-[10px] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default TabBar;
