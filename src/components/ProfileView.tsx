import React from 'react';
import { useApp } from '../context/AppContext';
import { User, Award, Shield, RotateCcw, TrendingUp, CheckCircle, BarChart3 } from 'lucide-react';

interface ProfileViewProps {
  onNavigate: (view: 'home' | 'tournaments' | 'matches' | 'bets' | 'profile' | 'admin') => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onNavigate }) => {
  const { user, resetAllData } = useApp();

  // Calculations
  const winRate = user.stats.predictionsPlaced > 0 
    ? Math.round((user.stats.predictionsWon / user.stats.predictionsPlaced) * 100)
    : 0;

  const xpPercent = Math.round((user.xp / user.xpNext) * 100);

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
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #FF5C00 0%, #8B5CF6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <User size={28} color="white" />
        </div>
        
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'white', fontFamily: 'Outfit, sans-serif' }}>
            {user.username}
          </h3>
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
          <span>{user.xp} / {user.xpNext} XP</span>
        </div>

        <div style={{
          height: '8px',
          backgroundColor: 'rgba(255,255,255,0.03)',
          borderRadius: '4px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            height: '100%',
            width: `${xpPercent}%`,
            background: 'linear-gradient(90deg, #FF5C00 0%, #FF8A47 100%)',
            borderRadius: '4px',
            boxShadow: '0 0 10px rgba(255, 92, 0, 0.5)'
          }} />
        </div>
      </div>

      {/* Stats Grid */}
      <h4 style={{
        fontSize: '11px',
        color: '#8F8F9B',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '12px'
      }}>
        АНАЛІТИКА ПРЕДИКТІВ
      </h4>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        marginBottom: '20px'
      }}>
        {/* Placed */}
        <div className="esports-card" style={{ padding: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BarChart3 size={18} color="#FF5C00" />
          <div>
            <span style={{ fontSize: '8px', color: '#51515E', textTransform: 'uppercase' }}>Зроблено</span>
            <span style={{ fontSize: '14px', fontWeight: '800', color: 'white', display: 'block', fontFamily: 'Outfit, sans-serif' }}>
              {user.stats.predictionsPlaced}
            </span>
          </div>
        </div>

        {/* Won */}
        <div className="esports-card" style={{ padding: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle size={18} color="#10B981" />
          <div>
            <span style={{ fontSize: '8px', color: '#51515E', textTransform: 'uppercase' }}>Виграно</span>
            <span style={{ fontSize: '14px', fontWeight: '800', color: 'white', display: 'block', fontFamily: 'Outfit, sans-serif' }}>
              {user.stats.predictionsWon}
            </span>
          </div>
        </div>

        {/* Win Rate */}
        <div className="esports-card" style={{ padding: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <TrendingUp size={18} color="#8B5CF6" />
          <div>
            <span style={{ fontSize: '8px', color: '#51515E', textTransform: 'uppercase' }}>Вінрейт</span>
            <span style={{ fontSize: '14px', fontWeight: '800', color: 'white', display: 'block', fontFamily: 'Outfit, sans-serif' }}>
              {winRate}%
            </span>
          </div>
        </div>

        {/* Match Records */}
        <div className="esports-card" style={{ padding: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Shield size={18} color="#FF5C00" />
          <div>
            <span style={{ fontSize: '8px', color: '#51515E', textTransform: 'uppercase' }}>Рекорд ігор</span>
            <span style={{ fontSize: '14px', fontWeight: '800', color: 'white', display: 'block', fontFamily: 'Outfit, sans-serif' }}>
              {user.stats.wins}W - {user.stats.losses}L
            </span>
          </div>
        </div>
      </div>

      {/* Admin Panel Card section */}
      <h4 style={{
        fontSize: '11px',
        color: '#8F8F9B',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '12px'
      }}>
        🛡️ Адміністрування турнірів
      </h4>

      <div className="esports-card orange-glow" style={{
        padding: '16px',
        border: '1px solid rgba(255, 92, 0, 0.15)',
        background: 'rgba(255, 92, 0, 0.02)',
        marginBottom: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Shield size={20} color="#FF5C00" />
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: '800', color: 'white', fontFamily: 'Outfit, sans-serif' }}>
              Керування Турнірами VOLKI
            </h3>
            <span style={{ fontSize: '9px', color: '#8F8F9B' }}>
              Створюйте кубки, запускайте LIVE матчі та керуйте сітками
            </span>
          </div>
        </div>

        <p style={{ fontSize: '11px', color: '#8F8F9B', lineHeight: 1.4 }}>
          Наша нова преміум-система дозволяє повноцінно керувати турнірними сітками як з телефону, так і у повному екрані на ПК як окремий сайт.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button
            onClick={() => onNavigate('admin')}
            style={{
              backgroundColor: '#FF5C00',
              border: 'none',
              borderRadius: '8px',
              padding: '10px',
              fontSize: '11px',
              fontWeight: '700',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'center'
            }}
          >
            У цьому вікні
          </button>
          <button
            onClick={() => window.open(window.location.origin + window.location.pathname + '?admin=true', '_blank')}
            style={{
              backgroundColor: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '8px',
              padding: '10px',
              fontSize: '11px',
              fontWeight: '700',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'center'
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#FF5C00'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}
          >
            Як окремий сайт ↗
          </button>
        </div>
      </div>

      {/* Account Settings / Maintenance block */}
      <h4 style={{
        fontSize: '11px',
        color: '#8F8F9B',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '12px'
      }}>
        НАЛАШТУВАННЯ ТА СКИТАННЯ
      </h4>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
          <RotateCcw size={16} /> СКИНУТИ ВСІ ДАНІ (MOCK DATABASE)
        </button>
      </div>

    </div>
  );
};
