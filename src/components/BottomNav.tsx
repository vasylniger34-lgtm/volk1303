import React from 'react';
import { Home, Trophy, Swords, Landmark, User, Tv } from 'lucide-react';

interface BottomNavProps {
  currentView: 'home' | 'tournaments' | 'matches' | 'bets' | 'profile' | 'admin' | 'streams';
  onNavigate: (view: 'home' | 'tournaments' | 'matches' | 'bets' | 'profile' | 'admin' | 'streams') => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, onNavigate }) => {
  const navItems = [
    { id: 'home', label: 'Головна', icon: Home },
    { id: 'tournaments', label: 'Турніри', icon: Trophy },
    { id: 'streams', label: 'Стріми', icon: Tv },
    { id: 'matches', label: 'Матчі', icon: Swords },
    { id: 'bets', label: 'Ставки', icon: Landmark },
    { id: 'profile', label: 'Профіль', icon: User }
  ] as const;


  return (
    <nav className="glass-panel" style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      padding: '12px 6px 16px 6px',
      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
      zIndex: 100
    }}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.id;
        
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: isActive ? '#FF5C00' : '#8F8F9B',
              cursor: 'pointer',
              flex: 1,
              gap: '4px',
              transition: 'color 0.2s, transform 0.1s'
            }}
          >
            <Icon 
              size={20} 
              strokeWidth={isActive ? 2.5 : 2}
              style={{
                filter: isActive ? 'drop-shadow(0 0 5px rgba(255, 92, 0, 0.3))' : 'none'
              }}
            />
            <span style={{
              fontSize: '10px',
              fontWeight: isActive ? '700' : '500',
              fontFamily: 'Inter, sans-serif'
            }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
