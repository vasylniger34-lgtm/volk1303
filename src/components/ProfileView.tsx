import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User, Award, Shield, RotateCcw, TrendingUp, CheckCircle, BarChart3, Camera, Pencil, Check, X, LogOut } from 'lucide-react';

interface ProfileViewProps {
  onNavigate: (view: 'home' | 'tournaments' | 'matches' | 'bets' | 'profile' | 'admin') => void;
}

const AVATAR_GRADIENTS = [
  ['#FF5C00', '#8B5CF6'],
  ['#10B981', '#3B82F6'],
  ['#EF4444', '#EC4899'],
  ['#F59E0B', '#EF4444'],
  ['#8B5CF6', '#06B6D4'],
  ['#14532D', '#10B981'],
  ['#E11D48', '#7C3AED'],
];

export const ProfileView: React.FC<ProfileViewProps> = ({ onNavigate: _onNavigate }) => {
  const { user, resetAllData, updateProfile, authLogout } = useApp();

  // Editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [newUsername, setNewUsername] = useState(user.username);

  // Calculations
  const winRate = user.stats.predictionsPlaced > 0 
    ? Math.round((user.stats.predictionsWon / user.stats.predictionsPlaced) * 100)
    : 0;

  const xpPercent = Math.round((user.xp / user.xpNext) * 100);

  const currentGradient = AVATAR_GRADIENTS[user.avatarGradient || 0];

  const cycleAvatar = () => {
    const next = ((user.avatarGradient || 0) + 1) % AVATAR_GRADIENTS.length;
    updateProfile({ avatarGradient: next });
  };

  const saveName = () => {
    if (newUsername.trim() && newUsername !== user.username) {
      updateProfile({ username: newUsername.trim() });
    }
    setIsEditingName(false);
  };

  const cancelEditName = () => {
    setNewUsername(user.username);
    setIsEditingName(false);
  };

  return (
    <div className="scroll-container" style={{ padding: '16px' }}>
      
      {/* Profile Header Title */}
      <h2 style={{
        fontSize: '18px',
        fontWeight: '800',
        textTransform: 'uppercase',
        fontFamily: 'Outfit, sans-serif',
        marginBottom: '16px'
      }}>
        Профіль гравця
      </h2>

      {/* Avatar Card */}
      <div className="esports-card orange-glow" style={{
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        border: '1px solid rgba(255, 92, 0, 0.15)',
        marginBottom: '20px'
      }}>
        {/* Clickable Avatar */}
        <div 
          onClick={cycleAvatar}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: `linear-gradient(135deg, ${currentGradient[0]} 0%, ${currentGradient[1]} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.1)',
            cursor: 'pointer',
            position: 'relative',
            transition: 'transform 0.2s'
          }}
        >
          <User size={28} color="white" />
          <div style={{
            position: 'absolute',
            bottom: '-4px',
            right: '-4px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: '#0E0E16',
            border: '2px solid #FF5C00',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Camera size={10} color="#FF5C00" />
          </div>
        </div>
        
        <div style={{ flex: 1 }}>
          {isEditingName ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="text"
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && saveName()}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255, 92, 0, 0.4)',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '700',
                  fontFamily: 'Outfit, sans-serif',
                  outline: 'none',
                  width: '120px'
                }}
              />
              <button onClick={saveName} style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '6px',
                padding: '5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}>
                <Check size={14} color="#10B981" />
              </button>
              <button onClick={cancelEditName} style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '6px',
                padding: '5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}>
                <X size={14} color="#EF4444" />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'white', fontFamily: 'Outfit, sans-serif' }}>
                {user.username}
              </h3>
              <button onClick={() => setIsEditingName(true)} style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '2px',
                opacity: 0.5,
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
              onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
              >
                <Pencil size={12} color="#FF5C00" />
              </button>
            </div>
          )}
          <span style={{ fontSize: '11px', color: '#FF5C00', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Award size={12} /> PRO PLAYER RANK
          </span>
        </div>

        <div style={{
          backgroundColor: 'rgba(255, 92, 0, 0.08)',
          border: '1px solid rgba(255, 92, 0, 0.15)',
          borderRadius: '8px',
          padding: '6px 12px',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '8px', color: '#8F8F9B', textTransform: 'uppercase', display: 'block' }}>ЛВЛ</span>
          <span style={{ fontSize: '16px', fontWeight: '900', color: 'white', fontFamily: 'Outfit, sans-serif' }}>{user.level}</span>
        </div>
      </div>

      {/* XP Level progress card */}
      <div className="esports-card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#8F8F9B', marginBottom: '6px' }}>
          <span>Прогрес рівня</span>
          <span style={{ color: '#FF5C00', fontWeight: '700' }}>{user.xp} / {user.xpNext} XP</span>
        </div>
        <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '4px' }}>
          <div style={{ width: `${xpPercent}%`, height: '100%', background: 'linear-gradient(90deg, #FF5C00 0%, #FF8A47 100%)', borderRadius: '4px', transition: 'width 0.5s ease' }} />
        </div>
      </div>

      {/* Stats Bento */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
        <div className="esports-card" style={{ padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <TrendingUp size={14} color="#FF5C00" />
            <span style={{ fontSize: '10px', color: '#8F8F9B', textTransform: 'uppercase' }}>Баланс</span>
          </div>
          <span style={{ fontSize: '18px', fontWeight: '900', color: 'white', fontFamily: 'Outfit, sans-serif' }}>{user.balance.toLocaleString()} 🪙</span>
        </div>
        <div className="esports-card" style={{ padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <CheckCircle size={14} color="#10B981" />
            <span style={{ fontSize: '10px', color: '#8F8F9B', textTransform: 'uppercase' }}>Вінрейт</span>
          </div>
          <span style={{ fontSize: '18px', fontWeight: '900', color: 'white', fontFamily: 'Outfit, sans-serif' }}>{winRate}%</span>
        </div>
        <div className="esports-card" style={{ padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <BarChart3 size={14} color="#3B82F6" />
            <span style={{ fontSize: '10px', color: '#8F8F9B', textTransform: 'uppercase' }}>Прогнозів</span>
          </div>
          <span style={{ fontSize: '18px', fontWeight: '900', color: 'white', fontFamily: 'Outfit, sans-serif' }}>{user.stats.predictionsPlaced}</span>
        </div>
        <div className="esports-card" style={{ padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Shield size={14} color="#8B5CF6" />
            <span style={{ fontSize: '10px', color: '#8F8F9B', textTransform: 'uppercase' }}>Перемог</span>
          </div>
          <span style={{ fontSize: '18px', fontWeight: '900', color: 'white', fontFamily: 'Outfit, sans-serif' }}>{user.stats.predictionsWon}</span>
        </div>
      </div>



      {/* Account Settings */}
      <h4 style={{
        fontSize: '11px',
        color: '#8F8F9B',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '12px'
      }}>
        НАЛАШТУВАННЯ
      </h4>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Logout */}
        <button
          onClick={authLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            backgroundColor: 'rgba(255, 92, 0, 0.03)',
            border: '1px solid rgba(255, 92, 0, 0.15)',
            borderRadius: '12px',
            padding: '14px',
            color: '#FF5C00',
            fontSize: '13px',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 92, 0, 0.08)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 92, 0, 0.03)'}
        >
          <LogOut size={16} /> ВИЙТИ З АКАУНТУ
        </button>

        {/* Reset Data */}
        <button
          onClick={resetAllData}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.03)',
            border: '1px solid rgba(239, 68, 68, 0.15)',
            borderRadius: '12px',
            padding: '14px',
            color: '#EF4444',
            fontSize: '13px',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.03)'}
        >
          <RotateCcw size={16} /> СКИНУТИ ВСІ ДАНІ
        </button>
      </div>

    </div>
  );
};
