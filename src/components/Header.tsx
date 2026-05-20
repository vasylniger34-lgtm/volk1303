import React from 'react';
import { useApp } from '../context/AppContext';
import { Bell, Plus } from 'lucide-react';

interface HeaderProps {
  onNavigate: (view: 'home' | 'tournaments' | 'matches' | 'bets' | 'profile' | 'admin') => void;
  currentView: string;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate, currentView: _currentView }) => {
  const { user, addFunds, showToast } = useApp();

  return (
    <header className="glass-panel" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 20px',
      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      {/* Brand Logo */}
      <div 
        onClick={() => onNavigate('home')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer'
        }}
      >
        <img 
          src="/wolf_logo.png" 
          alt="VOLKI logo" 
          style={{
            width: '32px',
            height: '32px',
            objectFit: 'contain'
          }} 
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
          <h1 style={{
            fontSize: '15px',
            fontWeight: '900',
            fontFamily: 'Outfit, sans-serif',
            letterSpacing: '0.5px',
            color: '#fff',
            lineHeight: 1.0
          }}>
            VOLKI
          </h1>
          <span style={{
            fontSize: '11px',
            fontWeight: '900',
            fontFamily: 'Outfit, sans-serif',
            color: '#FF5C00',
            letterSpacing: '1.5px',
            lineHeight: 1.0,
            display: 'block'
          }}>
            13:03
          </span>
        </div>
      </div>

      {/* Right side items */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Balance block */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          padding: '4px 8px 4px 10px',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '8px', color: '#8F8F9B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Баланс
            </span>
            <span style={{ fontSize: '13px', fontWeight: '800', color: '#fff', fontFamily: 'Outfit, sans-serif', display: 'flex', alignItems: 'center', gap: '2px' }}>
              {user.balance.toLocaleString('uk-UA')} 🪙
            </span>
          </div>
          <button 
            onClick={() => addFunds(2500)}
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '4px',
              backgroundColor: '#FF5C00',
              border: 'none',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'transform 0.1s'
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Plus size={12} strokeWidth={3} />
          </button>
        </div>

        {/* Notifications */}
        <button 
          style={{
            background: 'none',
            border: 'none',
            color: '#8F8F9B',
            cursor: 'pointer',
            padding: '4px',
            position: 'relative'
          }}
          onClick={() => showToast('Немає нових сповіщень', 'info')}
        >
          <Bell size={20} />
          <span style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#FF5C00',
            border: '2px solid var(--bg-color)'
          }} />
        </button>
      </div>
    </header>
  );
};
