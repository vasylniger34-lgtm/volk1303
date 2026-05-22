import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Trophy, Swords, ArrowLeft, ChevronRight, Calendar } from 'lucide-react';
import { getFormatBadgeStyle } from './TournamentsView';

interface MatchesViewProps {
  onSelectMatch: (matchId: string) => void;
  onSelectTournament: (tournamentId: string) => void;
}

export const MatchesView: React.FC<MatchesViewProps> = ({ onSelectMatch, onSelectTournament }) => {
  const { tournaments, matches } = useApp();
  const [selectedTourneyId, setSelectedTourneyId] = useState<string | null>(null);

  // Group scheduled/live matches by tournament
  const activeOrUpcomingMatches = matches.filter(
    (m) => m.status === 'live' || m.status === 'scheduled'
  );

  // Filter tournaments that have active/upcoming matches, or are upcoming/active themselves
  const relevantTournaments = tournaments.filter((t) => {
    const hasMatches = activeOrUpcomingMatches.some((m) => m.tournamentId === t.id);
    return t.status !== 'completed' || hasMatches;
  });

  const handleBack = () => {
    setSelectedTourneyId(null);
  };

  const selectedTourney = tournaments.find((t) => t.id === selectedTourneyId);
  const selectedTourneyMatches = activeOrUpcomingMatches.filter(
    (m) => m.tournamentId === selectedTourneyId
  );

  // Separate live and scheduled matches
  const liveMatches = selectedTourneyMatches.filter((m) => m.status === 'live');
  const scheduledMatches = selectedTourneyMatches.filter((m) => m.status === 'scheduled');

  // Helper to map round names to Ukrainian
  const getRoundLabel = (roundName: string) => {
    switch (roundName) {
      case '1/8':
        return '1/8 ФІНАЛУ';
      case 'Quarterfinal':
        return 'ЧВЕРТЬФІНАЛ';
      case 'Semifinal':
        return 'ПІВФІНАЛ';
      case 'Final':
        return 'ФІНАЛ';
      default:
        return roundName.toUpperCase();
    }
  };

  // Rendering Level 2: Matches of Selected Tournament
  if (selectedTourneyId && selectedTourney) {
    return (
      <div className="scroll-container" style={{ padding: '16px 20px 120px 20px' }}>
        {/* Back navigation */}
        <button
          onClick={handleBack}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '700',
            marginBottom: '20px',
            padding: '4px 0',
            transition: 'color 0.2s',
            fontFamily: 'Outfit, sans-serif',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
        >
          <ArrowLeft size={16} color="var(--primary-orange)" />
          НАЗАД ДО ТУРНІРІВ
        </button>

        {/* Tournament Info Header Card */}
        <div
          className="esports-card orange-glow"
          style={{
            padding: '20px',
            marginBottom: '24px',
            background: 'linear-gradient(135deg, rgba(16, 16, 22, 0.9) 0%, rgba(28, 20, 24, 0.9) 100%)',
            border: '1px solid rgba(255, 92, 0, 0.15)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span
              style={{
                fontSize: '10px',
                fontWeight: '900',
                color: getFormatBadgeStyle(selectedTourney.type).color,
                backgroundColor: getFormatBadgeStyle(selectedTourney.type).bg,
                border: `1px solid ${getFormatBadgeStyle(selectedTourney.type).border}`,
                padding: '3px 10px',
                borderRadius: '6px',
                fontFamily: 'Outfit, sans-serif',
              }}
            >
              {selectedTourney.type}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', fontFamily: 'Outfit, sans-serif' }}>
              КАРТА: <span style={{ color: 'white' }}>{selectedTourney.map}</span>
            </span>
          </div>

          <h2
            style={{
              fontSize: '22px',
              fontWeight: '900',
              color: 'white',
              fontFamily: 'Outfit, sans-serif',
              marginBottom: '12px',
              textTransform: 'uppercase',
            }}
          >
            {selectedTourney.name}
          </h2>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
              paddingTop: '12px',
              fontSize: '12px',
            }}
          >
            <div>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: '700', letterSpacing: '0.5px' }}>
                Призовий Фонд
              </span>
              <span style={{ fontWeight: '800', color: '#fff', fontFamily: 'Outfit, sans-serif' }}>
                {selectedTourney.prizePool}
              </span>
            </div>
            <button
              onClick={() => onSelectTournament(selectedTourney.id)}
              style={{
                background: 'rgba(255, 92, 0, 0.08)',
                border: '1px solid rgba(255, 92, 0, 0.2)',
                color: 'var(--primary-orange)',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '11px',
                fontWeight: '800',
                cursor: 'pointer',
                fontFamily: 'Outfit, sans-serif',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--primary-orange)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 92, 0, 0.08)';
                e.currentTarget.style.color = 'var(--primary-orange)';
              }}
            >
              СІТКА ТУРНІРУ
            </button>
          </div>
        </div>

        {/* Live Matches Sub-Section */}
        {liveMatches.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3
              style={{
                fontSize: '12px',
                fontWeight: '900',
                color: 'var(--live-color)',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                fontFamily: 'Outfit, sans-serif',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span className="badge-live-pulse" style={{ display: 'inline-block', position: 'static', transform: 'none', width: '6px', height: '6px' }} />
              МАТЧІ В ЛАЙВІ ({liveMatches.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {liveMatches.map((match) => (
                <div
                  key={match.id}
                  onClick={() => onSelectMatch(match.id)}
                  className="esports-card"
                  style={{
                    padding: '16px 18px',
                    cursor: 'pointer',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    background: 'linear-gradient(135deg, rgba(16, 16, 22, 0.95) 0%, rgba(28, 16, 18, 0.95) 100%)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '9px', color: '#8F8F9B', fontWeight: '800', letterSpacing: '0.5px', fontFamily: 'Outfit, sans-serif' }}>
                      {getRoundLabel(match.roundName)}
                    </span>
                    <span className="badge-live" style={{ position: 'static', transform: 'none' }}>
                      <span className="badge-live-pulse" /> LIVE
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    {/* Team A */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '38%' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          backgroundColor: match.teamA?.logoBg || '#581C87',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '900',
                          color: 'white',
                          fontSize: '14px',
                          fontFamily: 'Outfit, sans-serif',
                          border: '2px solid rgba(255,255,255,0.06)',
                          marginBottom: '6px',
                          boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                        }}
                      >
                        {match.teamA?.logoText}
                      </div>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          color: 'white',
                          textAlign: 'center',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          width: '100%',
                          fontFamily: 'Outfit, sans-serif',
                        }}
                      >
                        {match.teamA?.name}
                      </span>
                    </div>

                    {/* Score */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '24px', fontWeight: '900', fontFamily: 'Outfit, sans-serif', color: 'white' }}>
                          {match.scoreA}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', fontFamily: 'Outfit, sans-serif' }}>
                          VS
                        </span>
                        <span style={{ fontSize: '24px', fontWeight: '900', fontFamily: 'Outfit, sans-serif', color: 'white' }}>
                          {match.scoreB}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '8px',
                          color: 'var(--primary-orange)',
                          backgroundColor: 'rgba(255,92,0,0.06)',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          marginTop: '4px',
                          fontWeight: '800',
                          fontFamily: 'Outfit, sans-serif',
                          border: '1px solid rgba(255,92,0,0.1)',
                        }}
                      >
                        {match.oddsA.toFixed(2)} X {match.oddsB.toFixed(2)}
                      </span>
                    </div>

                    {/* Team B */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '38%' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          backgroundColor: match.teamB?.logoBg || '#1E293B',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '900',
                          color: 'white',
                          fontSize: '14px',
                          fontFamily: 'Outfit, sans-serif',
                          border: '2px solid rgba(255,255,255,0.06)',
                          marginBottom: '6px',
                          boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                        }}
                      >
                        {match.teamB?.logoText}
                      </div>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          color: 'white',
                          textAlign: 'center',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          width: '100%',
                          fontFamily: 'Outfit, sans-serif',
                        }}
                      >
                        {match.teamB?.name}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scheduled Matches Sub-Section */}
        <div>
          <h3
            style={{
              fontSize: '12px',
              fontWeight: '900',
              color: 'var(--text-secondary)',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              fontFamily: 'Outfit, sans-serif',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Swords size={14} color="var(--primary-orange)" />
            ОЧІКУВАНІ МАТЧІ ({scheduledMatches.length})
          </h3>

          {scheduledMatches.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {scheduledMatches.map((match) => (
                <div
                  key={match.id}
                  onClick={() => onSelectMatch(match.id)}
                  className="esports-card"
                  style={{
                    padding: '16px 18px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '9px', color: '#8F8F9B', fontWeight: '800', letterSpacing: '0.5px', fontFamily: 'Outfit, sans-serif' }}>
                      {getRoundLabel(match.roundName)}
                    </span>
                    <span
                      style={{
                        fontSize: '9px',
                        color: 'var(--primary-orange)',
                        backgroundColor: 'rgba(255, 92, 0, 0.08)',
                        border: '1px solid rgba(255, 92, 0, 0.15)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: '800',
                        fontFamily: 'Outfit, sans-serif',
                      }}
                    >
                      ОЧІКУЄТЬСЯ
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    {/* Team A */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '40%' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: match.teamA?.logoBg || '#581C87',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '900',
                          color: 'white',
                          fontSize: '11px',
                          fontFamily: 'Outfit, sans-serif',
                          border: '1px solid rgba(255,255,255,0.06)',
                          flexShrink: 0,
                        }}
                      >
                        {match.teamA?.logoText}
                      </div>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: '800',
                          color: 'white',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontFamily: 'Outfit, sans-serif',
                        }}
                      >
                        {match.teamA?.name || 'Бот команда'}
                      </span>
                    </div>

                    {/* VS / Odds info */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', fontFamily: 'Outfit, sans-serif' }}>
                        VS
                      </span>
                      <span style={{ fontSize: '9px', color: '#8F8F9B', fontWeight: '700', marginTop: '2px', fontFamily: 'Outfit, sans-serif' }}>
                        {match.oddsA.toFixed(2)} : {match.oddsB.toFixed(2)}
                      </span>
                    </div>

                    {/* Team B */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '40%', flexDirection: 'row-reverse' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: match.teamB?.logoBg || '#1E293B',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '900',
                          color: 'white',
                          fontSize: '11px',
                          fontFamily: 'Outfit, sans-serif',
                          border: '1px solid rgba(255,255,255,0.06)',
                          flexShrink: 0,
                        }}
                      >
                        {match.teamB?.logoText}
                      </div>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: '800',
                          color: 'white',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontFamily: 'Outfit, sans-serif',
                          textAlign: 'right',
                        }}
                      >
                        {match.teamB?.name || 'Бот команда'}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      borderTop: '1px solid rgba(255, 255, 255, 0.04)',
                      paddingTop: '8px',
                      fontSize: '10px',
                      color: 'var(--text-muted)',
                      fontWeight: '600',
                    }}
                  >
                    <span>Час: {match.time || 'Сьогодні'}</span>
                    <span>Карта: {match.map || 'CS2'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="esports-card"
              style={{
                padding: '24px',
                textAlign: 'center',
                color: '#8F8F9B',
                fontSize: '12px',
                fontWeight: '600',
                background: 'rgba(255,255,255,0.01)',
              }}
            >
              Немає запланованих матчів.
            </div>
          )}
        </div>

        {selectedTourneyMatches.length === 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 20px',
              color: 'var(--text-muted)',
              gap: '12px',
              textAlign: 'center',
            }}
          >
            <Swords size={36} color="var(--text-muted)" />
            <span style={{ fontSize: '13px', fontWeight: '700' }}>
              Всі матчі цього турніру вже зіграні або ще не згенеровані.
            </span>
          </div>
        )}
      </div>
    );
  }

  // Rendering Level 1: List of Tournaments having active/upcoming matches
  return (
    <div className="scroll-container" style={{ padding: '16px 20px 120px 20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2
          style={{
            fontSize: '20px',
            fontWeight: '900',
            textTransform: 'uppercase',
            fontFamily: 'Outfit, sans-serif',
            color: 'white',
            letterSpacing: '0.5px',
            marginBottom: '6px',
          }}
        >
          МАТЧІ ТУРНІРІВ
        </h2>
        <p style={{ fontSize: '11px', color: '#8F8F9B', fontWeight: '500' }}>
          Оберіть турнір нижче, щоб переглянути його поточні LIVE трансляції та майбутні ігри.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {relevantTournaments.length > 0 ? (
          relevantTournaments.map((tourney) => {
            const tourneyMatches = activeOrUpcomingMatches.filter((m) => m.tournamentId === tourney.id);
            const liveCount = tourneyMatches.filter((m) => m.status === 'live').length;
            const scheduledCount = tourneyMatches.filter((m) => m.status === 'scheduled').length;

            return (
              <div
                key={tourney.id}
                onClick={() => setSelectedTourneyId(tourney.id)}
                className="esports-card"
                style={{
                  padding: '18px 20px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  background: 'var(--card-bg)',
                }}
              >
                {/* Header status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: '900',
                      color: getFormatBadgeStyle(tourney.type).color,
                      backgroundColor: getFormatBadgeStyle(tourney.type).bg,
                      border: `1px solid ${getFormatBadgeStyle(tourney.type).border}`,
                      padding: '3px 10px',
                      borderRadius: '6px',
                      fontFamily: 'Outfit, sans-serif',
                    }}
                  >
                    {tourney.type}
                  </span>

                  {liveCount > 0 ? (
                    <span className="badge-live" style={{ position: 'static', transform: 'none', fontSize: '9px' }}>
                      <span className="badge-live-pulse" /> LIVE ГРА
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: '9px',
                        color: tourney.status === 'active' ? '#10B981' : '#8F8F9B',
                        fontWeight: '800',
                        fontFamily: 'Outfit, sans-serif',
                        textTransform: 'uppercase',
                      }}
                    >
                      {tourney.status === 'active' ? 'АКТИВНИЙ' : 'МАЙБУТНІЙ'}
                    </span>
                  )}
                </div>

                {/* Tournament title */}
                <div>
                  <h3
                    style={{
                      fontSize: '16px',
                      fontWeight: '800',
                      color: 'white',
                      fontFamily: 'Outfit, sans-serif',
                      marginBottom: '4px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {tourney.name}
                  </h3>
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#8F8F9B',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: '500',
                    }}
                  >
                    <Calendar size={13} color="var(--primary-orange)" /> {tourney.date}
                  </span>
                </div>

                {/* Count summary */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    paddingTop: '12px',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div>
                      <span style={{ fontSize: '8px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: '700' }}>
                        В ефірі (LIVE)
                      </span>
                      <span
                        style={{
                          fontWeight: '800',
                          color: liveCount > 0 ? 'var(--live-color)' : '#fff',
                          fontFamily: 'Outfit, sans-serif',
                        }}
                      >
                        {liveCount}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '8px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: '700' }}>
                        Заплановано
                      </span>
                      <span style={{ fontWeight: '800', color: '#fff', fontFamily: 'Outfit, sans-serif' }}>
                        {scheduledCount}
                      </span>
                    </div>
                  </div>

                  <ChevronRight size={16} color="var(--primary-orange)" />
                </div>
              </div>
            );
          })
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 20px',
              color: 'var(--text-muted)',
              gap: '12px',
              textAlign: 'center',
            }}
          >
            <Trophy size={42} color="var(--text-muted)" />
            <span style={{ fontSize: '13px', fontWeight: '700' }}>
              Немає активних або запланованих турнірів з матчами.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
