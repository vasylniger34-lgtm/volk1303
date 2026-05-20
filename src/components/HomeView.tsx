import React from 'react';
import { useApp } from '../context/AppContext';
import { Trophy, Swords, TrendingUp, User, ChevronRight, Zap } from 'lucide-react';

interface HomeViewProps {
  onNavigate: (view: 'home' | 'tournaments' | 'matches' | 'bets' | 'profile' | 'admin') => void;
  onSelectTournament: (id: string) => void;
  onSelectMatch: (id: string) => void;
  onOpenRegister: (id: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  onSelectTournament,
  onSelectMatch,
  onOpenRegister
}) => {
  const { tournaments, matches } = useApp();

  // Find featured (2X2 AIM CUP)
  const featuredTourney = tournaments.find(t => t.id === '2x2_aim_cup') || tournaments[0];
  
  // Find live match
  const liveMatch = matches.find(m => m.status === 'live');
  
  // Get upcoming tournaments (excluding active featured one)
  const upcomingTourneys = tournaments.filter(t => t.id !== '2x2_aim_cup').slice(0, 3);

  return (
    <div className="scroll-container" style={{ padding: '16px 20px' }}>
      
      {featuredTourney ? (
        <div 
          className="orange-glow"
          style={{
            background: `linear-gradient(180deg, rgba(10, 10, 14, 0.25) 0%, rgba(10, 10, 14, 0.9) 100%), url("${featuredTourney?.imageUrl || '/tactical_soldier.png'}") center/cover no-repeat`,
            border: '1px solid rgba(255, 92, 0, 0.15)',
            borderRadius: '24px',
            padding: '28px 24px',
            position: 'relative',
            overflow: 'hidden',
            marginBottom: '24px',
            boxShadow: '0 12px 36px rgba(255, 92, 0, 0.08)',
            minHeight: '230px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end'
          }}
        >
          <div style={{ position: 'relative', zIndex: 2 }}>
            <span style={{
              fontSize: '10px',
              color: 'var(--primary-orange)',
              fontWeight: '900',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              display: 'block',
              marginBottom: '6px',
              fontFamily: 'Outfit, sans-serif'
            }}>
              НАЙБЛИЖЧИЙ ТУРНІР
            </span>
            <h2 style={{
              fontSize: '28px',
              fontWeight: '900',
              color: 'white',
              letterSpacing: '0.5px',
              marginBottom: '4px',
              fontFamily: 'Outfit, sans-serif',
              textTransform: 'uppercase',
              textShadow: '0 2px 4px rgba(0,0,0,0.5)'
            }}>
              {featuredTourney.name}
            </h2>
            <p style={{
              fontSize: '12px',
              color: '#8F8F9B',
              fontWeight: '600',
              marginBottom: '20px',
              textShadow: '0 1px 2px rgba(0,0,0,0.5)'
            }}>
              {featuredTourney.date}
            </p>

            <div style={{ display: 'flex', gap: '24px', marginBottom: '22px' }}>
              <div>
                <span style={{ fontSize: '9px', color: '#8F8F9B', textTransform: 'uppercase', display: 'block', fontWeight: '700', letterSpacing: '0.5px' }}>
                  Призовий фонд
                </span>
                <span style={{ fontSize: '16px', fontWeight: '800', color: '#fff', fontFamily: 'Outfit, sans-serif' }}>
                  {featuredTourney.prizePool}
                </span>
              </div>
              <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '24px' }}>
                <span style={{ fontSize: '9px', color: '#8F8F9B', textTransform: 'uppercase', display: 'block', fontWeight: '700', letterSpacing: '0.5px' }}>
                  Формат
                </span>
                <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--primary-orange)', fontFamily: 'Outfit, sans-serif' }}>
                  {featuredTourney.type}
                </span>
              </div>
            </div>

            <button 
              className="btn-primary" 
              onClick={() => onOpenRegister(featuredTourney.id)}
              style={{ width: '100%', padding: '14px', fontSize: '13px', letterSpacing: '1px' }}
            >
              ЗАРЕЄСТРУВАТИСЬ
            </button>
          </div>
        </div>
      ) : (
        <div 
          className="orange-glow"
          style={{
            background: 'linear-gradient(180deg, rgba(10, 10, 14, 0.6) 0%, rgba(10, 10, 14, 0.9) 100%), url("/tactical_soldier.png") center/cover no-repeat',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '24px',
            padding: '40px 24px',
            textAlign: 'center',
            marginBottom: '24px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.2)',
            minHeight: '200px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <Trophy size={48} color="#51515E" style={{ marginBottom: '16px' }} />
          <h2 style={{
            fontSize: '20px',
            fontWeight: '900',
            color: 'white',
            marginBottom: '8px',
            fontFamily: 'Outfit, sans-serif',
            textTransform: 'uppercase'
          }}>
            Немає активних турнірів
          </h2>
          <p style={{
            fontSize: '12px',
            color: '#8F8F9B',
            fontWeight: '600',
            maxWidth: '280px',
            lineHeight: '1.5'
          }}>
            Очікуйте нових анонсів турнірів найближчим часом!
          </p>
        </div>
      )}

      {/* Quick Navigation Panel */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        marginBottom: '28px'
      }}>
        {[
          { label: 'Турніри', view: 'tournaments', icon: Trophy },
          { label: 'Матчі', view: 'matches', icon: Swords },
          { label: 'Ставки', view: 'bets', icon: TrendingUp },
          { label: 'Профіль', view: 'profile', icon: User }
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div 
              key={idx}
              onClick={() => onNavigate(item.view as any)}
              className="esports-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '14px 6px',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 92, 0, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '8px',
                border: '1px solid rgba(255, 92, 0, 0.1)'
              }}>
                <Icon size={20} color="var(--primary-orange)" />
              </div>
              <span style={{
                fontSize: '11px',
                fontWeight: '700',
                color: 'var(--text-secondary)'
              }}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* LIVE МАТЧІ Slider */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '14px'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'Outfit, sans-serif' }}>
            LIVE МАТЧІ
          </h3>
          <span 
            onClick={() => onNavigate('matches')}
            style={{ fontSize: '12px', color: 'var(--primary-orange)', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
          >
            Дивитись всі <ChevronRight size={14} />
          </span>
        </div>

        {liveMatch ? (
          <div 
            onClick={() => onSelectMatch(liveMatch.id)}
            className="esports-card"
            style={{
              padding: '18px 20px',
              cursor: 'pointer',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              background: 'linear-gradient(135deg, rgba(14,14,19,0.95) 0%, rgba(26,14,17,0.95) 100%)'
            }}
          >
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '10px', color: '#8F8F9B', fontWeight: '800', letterSpacing: '0.5px', textTransform: 'uppercase', fontFamily: 'Outfit, sans-serif' }}>
                {liveMatch.tournamentName} • {liveMatch.roundName.toUpperCase()}
              </span>
              <span className="badge-live">
                <span className="badge-live-pulse" /> LIVE
              </span>
            </div>

            {/* Score and teams */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
              marginBottom: '18px'
            }}>
              {/* Team A */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '33%' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  backgroundColor: liveMatch.teamA?.logoBg || '#581C87',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '900',
                  color: 'white',
                  fontSize: '16px',
                  fontFamily: 'Outfit, sans-serif',
                  border: '2px solid rgba(255,255,255,0.08)',
                  marginBottom: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                }}>
                  {liveMatch.teamA?.logoText}
                </div>
                <span style={{ fontSize: '12px', fontWeight: '800', color: 'white', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', fontFamily: 'Outfit, sans-serif' }}>
                  {liveMatch.teamA?.name}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--primary-orange)', fontWeight: '800', marginTop: '6px', backgroundColor: 'rgba(255,92,0,0.06)', padding: '2px 8px', borderRadius: '6px', fontFamily: 'Outfit, sans-serif', border: '1px solid rgba(255,92,0,0.1)' }}>
                  {liveMatch.oddsA.toFixed(2)}
                </span>
              </div>

              {/* Score ticker */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '32px', fontWeight: '900', fontFamily: 'Outfit, sans-serif', color: 'white' }}>
                    {liveMatch.scoreA}
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '800', fontFamily: 'Outfit, sans-serif' }}>
                    VS
                  </span>
                  <span style={{ fontSize: '32px', fontWeight: '900', fontFamily: 'Outfit, sans-serif', color: 'white' }}>
                    {liveMatch.scoreB}
                  </span>
                </div>
                <span style={{ fontSize: '10px', color: '#8F8F9B', backgroundColor: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: '4px', marginTop: '6px', fontWeight: '700', fontFamily: 'Outfit, sans-serif' }}>
                  BO3
                </span>
              </div>

              {/* Team B */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '33%' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  backgroundColor: liveMatch.teamB?.logoBg || '#1E293B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '900',
                  color: 'white',
                  fontSize: '16px',
                  fontFamily: 'Outfit, sans-serif',
                  border: '2px solid rgba(255,255,255,0.08)',
                  marginBottom: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                }}>
                  {liveMatch.teamB?.logoText}
                </div>
                <span style={{ fontSize: '12px', fontWeight: '800', color: 'white', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', fontFamily: 'Outfit, sans-serif' }}>
                  {liveMatch.teamB?.name}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--primary-orange)', fontWeight: '800', marginTop: '6px', backgroundColor: 'rgba(255,92,0,0.06)', padding: '2px 8px', borderRadius: '6px', fontFamily: 'Outfit, sans-serif', border: '1px solid rgba(255,92,0,0.1)' }}>
                  {liveMatch.oddsB.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Sub details */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
              paddingTop: '12px',
              fontSize: '11px',
              color: '#8F8F9B',
              fontWeight: '600'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={12} color="var(--primary-orange)" /> {liveMatch.map}
              </span>
              <span>
                Час: {liveMatch.time}
              </span>
            </div>
          </div>
        ) : (
          <div className="esports-card" style={{ padding: '24px', textAlign: 'center', color: '#8F8F9B', fontSize: '13px', fontWeight: '500' }}>
            Наразі немає активних LIVE матчів.
          </div>
        )}
      </div>

      {/* НАЙБЛИЖЧІ ТУРНІРИ */}
      <div>
        <h3 style={{
          fontSize: '14px',
          fontWeight: '800',
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          marginBottom: '14px',
          fontFamily: 'Outfit, sans-serif'
        }}>
          НАЙБЛИЖЧІ ТУРНІРИ
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {upcomingTourneys.map((tourney) => (
            <div 
              key={tourney.id}
              onClick={() => onSelectTournament(tourney.id)}
              className="esports-card"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: tourney.type === '4X4' ? 'rgba(255, 92, 0, 0.08)' : 'rgba(139, 92, 246, 0.08)',
                  border: `1px solid ${tourney.type === '4X4' ? 'rgba(255, 92, 0, 0.15)' : 'rgba(139, 92, 246, 0.15)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: '900',
                  color: tourney.type === '4X4' ? 'var(--primary-orange)' : 'var(--accent-purple)',
                  fontFamily: 'Outfit, sans-serif'
                }}>
                  {tourney.type}
                </div>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '800', color: 'white', fontFamily: 'Outfit, sans-serif' }}>
                    {tourney.name}
                  </h4>
                  <span style={{ fontSize: '11px', color: '#8F8F9B', fontWeight: '500' }}>
                    {tourney.date}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--primary-orange)', fontFamily: 'Outfit, sans-serif' }}>
                  {tourney.prizePool}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', fontFamily: 'Outfit, sans-serif' }}>
                  {tourney.participantsCount}/{tourney.maxParticipants} учасників
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
    </div>
  );
};
