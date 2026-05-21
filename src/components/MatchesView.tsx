import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Swords, Trophy, Clock } from 'lucide-react';

interface MatchesViewProps {
  onSelectMatch: (id: string) => void;
  onSelectTournament: (id: string) => void;
}

export const MatchesView: React.FC<MatchesViewProps> = ({
  onSelectMatch,
  onSelectTournament
}) => {
  const { matches, tournaments } = useApp();
  const [selectedTournamentFilter, setSelectedTournamentFilter] = useState<string>('all');

  // Filter tournaments that actually have matches, to avoid empty filter options
  const tournamentsWithMatches = tournaments.filter(t => 
    matches.some(m => m.tournamentId === t.id)
  );

  // Filter matches based on selected tournament
  const filteredMatches = selectedTournamentFilter === 'all'
    ? matches
    : matches.filter(m => m.tournamentId === selectedTournamentFilter);

  const liveMatches = filteredMatches.filter(m => m.status === 'live');
  const upcomingMatches = filteredMatches.filter(m => m.status === 'scheduled');
  const completedMatches = filteredMatches.filter(m => m.status === 'finished');

  return (
    <div className="scroll-container" style={{ padding: '16px 16px 110px' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{
          fontSize: '18px',
          fontWeight: '800',
          textTransform: 'uppercase',
          fontFamily: 'Outfit, sans-serif',
          marginBottom: '4px'
        }}>
          Турнірні Матчі
        </h2>
        <p style={{ fontSize: '11px', color: '#8F8F9B' }}>
          Стежте за іграми в прямому ефірі, переглядайте майбутні розклади та історію зустрічей.
        </p>
      </div>

      {/* Tournament Selector (Horizontal Scroll) */}
      <div 
        style={{ 
          display: 'flex', 
          gap: '8px', 
          overflowX: 'auto', 
          paddingBottom: '12px',
          marginBottom: '20px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        <button
          onClick={() => setSelectedTournamentFilter('all')}
          style={{
            whiteSpace: 'nowrap',
            padding: '8px 16px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: '800',
            fontFamily: 'Outfit, sans-serif',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: selectedTournamentFilter === 'all' ? 'var(--primary-orange)' : 'var(--card-bg)',
            color: selectedTournamentFilter === 'all' ? 'black' : 'var(--text-secondary)',
            border: selectedTournamentFilter === 'all' 
              ? '1px solid var(--primary-orange)' 
              : '1px solid var(--card-border)',
            boxShadow: selectedTournamentFilter === 'all' ? '0 0 12px rgba(255, 92, 0, 0.25)' : 'none'
          }}
        >
          Всі матчі
        </button>

        {tournamentsWithMatches.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelectedTournamentFilter(t.id)}
            style={{
              whiteSpace: 'nowrap',
              padding: '8px 16px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: '800',
              fontFamily: 'Outfit, sans-serif',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: selectedTournamentFilter === t.id ? 'var(--primary-orange)' : 'var(--card-bg)',
              color: selectedTournamentFilter === t.id ? 'black' : 'var(--text-secondary)',
              border: selectedTournamentFilter === t.id 
                ? '1px solid var(--primary-orange)' 
                : '1px solid var(--card-border)',
              boxShadow: selectedTournamentFilter === t.id ? '0 0 12px rgba(255, 92, 0, 0.25)' : 'none'
            }}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        
        {/* 1. LIVE Matches Section */}
        {liveMatches.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <span className="badge-live-pulse" style={{ display: 'inline-block', position: 'static', transform: 'none', width: '8px', height: '8px' }} />
              <h3 style={{ fontSize: '12px', fontWeight: '900', color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'Outfit, sans-serif' }}>
                LIVE МАТЧІ
              </h3>
              <span style={{ fontSize: '10px', color: '#51515E', fontWeight: '600' }}>({liveMatches.length})</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {liveMatches.map((match) => (
                <div
                  key={match.id}
                  className="esports-card"
                  onClick={() => onSelectMatch(match.id)}
                  style={{
                    padding: '16px',
                    cursor: 'pointer',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    background: 'linear-gradient(135deg, #0e0e13 0%, rgba(16, 185, 129, 0.03) 100%)',
                    boxShadow: '0 8px 24px rgba(16, 185, 129, 0.05)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {/* Neon Glow Corner Bar */}
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', backgroundColor: '#10B981' }} />
                  
                  {/* Tournament Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTournament(match.tournamentId);
                      }}
                      style={{ fontSize: '9px', color: '#8F8F9B', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}
                    >
                      {match.tournamentName} • {match.roundName}
                    </span>
                    <span style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      color: '#10B981',
                      fontSize: '8px',
                      fontWeight: '900',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      letterSpacing: '1px',
                      fontFamily: 'Outfit, sans-serif'
                    }}>
                      MAP {match.currentMap}
                    </span>
                  </div>

                  {/* Versus Area */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0 12px 0' }}>
                    
                    {/* Team A */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: match.teamA?.logoBg || '#1E293B',
                        color: 'white',
                        fontSize: '11px',
                        fontWeight: '900',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid rgba(255,255,255,0.05)'
                      }}>
                        {match.teamA?.logoText || 'A'}
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: 'white', textAlign: 'center', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {match.teamA?.name || 'Т1'}
                      </span>
                    </div>

                    {/* Live Score Block */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '80px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '20px', fontWeight: '900', color: 'white', fontFamily: 'Outfit, sans-serif' }}>
                          {match.scoreA}
                        </span>
                        <span style={{ fontSize: '12px', color: '#51515E', fontWeight: '800' }}>:</span>
                        <span style={{ fontSize: '20px', fontWeight: '900', color: 'white', fontFamily: 'Outfit, sans-serif' }}>
                          {match.scoreB}
                        </span>
                      </div>
                      <span style={{
                        fontSize: '8px',
                        color: '#10B981',
                        fontWeight: '900',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        fontFamily: 'Outfit, sans-serif'
                      }}>
                        LIVE МАТЧ
                      </span>
                    </div>

                    {/* Team B */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: match.teamB?.logoBg || '#1E293B',
                        color: 'white',
                        fontSize: '11px',
                        fontWeight: '900',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid rgba(255,255,255,0.05)'
                      }}>
                        {match.teamB?.logoText || 'B'}
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: 'white', textAlign: 'center', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {match.teamB?.name || 'Т2'}
                      </span>
                    </div>

                  </div>

                  {/* Odds / Quick Bets links */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.03)',
                    paddingTop: '12px'
                  }}>
                    <div style={{
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid rgba(255,255,255,0.02)',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '10px'
                    }}>
                      <span style={{ color: '#8F8F9B', fontSize: '8px', textTransform: 'uppercase' }}>КФ {match.teamA?.name || 'T1'}</span>
                      <span style={{ fontWeight: '800', color: '#10B981' }}>{match.oddsA}</span>
                    </div>
                    <div style={{
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid rgba(255,255,255,0.02)',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '10px'
                    }}>
                      <span style={{ color: '#8F8F9B', fontSize: '8px', textTransform: 'uppercase' }}>КФ {match.teamB?.name || 'T2'}</span>
                      <span style={{ fontWeight: '800', color: '#10B981' }}>{match.oddsB}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. Upcoming Scheduled Matches Section */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Clock size={14} color="#FF5C00" />
            <h3 style={{ fontSize: '12px', fontWeight: '900', color: '#FF5C00', textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'Outfit, sans-serif' }}>
              МАЙБУТНІ МАТЧІ
            </h3>
            <span style={{ fontSize: '10px', color: '#51515E', fontWeight: '600' }}>({upcomingMatches.length})</span>
          </div>

          {upcomingMatches.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {upcomingMatches.map((match) => (
                <div
                  key={match.id}
                  className="esports-card"
                  onClick={() => onSelectMatch(match.id)}
                  style={{
                    padding: '16px',
                    cursor: 'pointer',
                    border: '1px solid rgba(255, 92, 0, 0.12)',
                    background: 'linear-gradient(135deg, #0e0e13 0%, rgba(255, 92, 0, 0.01) 100%)',
                    position: 'relative'
                  }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', backgroundColor: '#FF5C00' }} />
                  
                  {/* Tournament Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTournament(match.tournamentId);
                      }}
                      style={{ fontSize: '9px', color: '#8F8F9B', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}
                    >
                      {match.tournamentName} • {match.roundName}
                    </span>
                    <span style={{
                      backgroundColor: 'rgba(255, 92, 0, 0.08)',
                      color: '#FF5C00',
                      fontSize: '8px',
                      fontWeight: '800',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      letterSpacing: '0.5px',
                      fontFamily: 'Outfit, sans-serif',
                      textTransform: 'uppercase'
                    }}>
                      {match.time || '18:00'}
                    </span>
                  </div>

                  {/* Versus Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0 12px 0' }}>
                    
                    {/* Team A */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: match.teamA?.logoBg || '#1E293B',
                        color: 'white',
                        fontSize: '11px',
                        fontWeight: '900',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid rgba(255,255,255,0.05)'
                      }}>
                        {match.teamA?.logoText || 'A'}
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: 'white', textAlign: 'center', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {match.teamA?.name || 'Команда А'}
                      </span>
                    </div>

                    {/* VS Block */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '60px' }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 92, 0, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Swords size={12} color="#FF5C00" />
                      </div>
                      <span style={{ fontSize: '8px', color: '#51515E', fontWeight: '800', marginTop: '4px', textTransform: 'uppercase' }}>
                        {match.map || 'DE_DUST2'}
                      </span>
                    </div>

                    {/* Team B */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: match.teamB?.logoBg || '#1E293B',
                        color: 'white',
                        fontSize: '11px',
                        fontWeight: '900',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid rgba(255,255,255,0.05)'
                      }}>
                        {match.teamB?.logoText || 'B'}
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: 'white', textAlign: 'center', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {match.teamB?.name || 'Команда B'}
                      </span>
                    </div>

                  </div>

                  {/* Odds Row */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.03)',
                    paddingTop: '12px'
                  }}>
                    <div style={{
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid rgba(255,255,255,0.02)',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '10px'
                    }}>
                      <span style={{ color: '#8F8F9B', fontSize: '8px', textTransform: 'uppercase' }}>КФ A</span>
                      <span style={{ fontWeight: '800', color: '#FF5C00' }}>{match.oddsA}</span>
                    </div>
                    <div style={{
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid rgba(255,255,255,0.02)',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '10px'
                    }}>
                      <span style={{ color: '#8F8F9B', fontSize: '8px', textTransform: 'uppercase' }}>КФ B</span>
                      <span style={{ fontWeight: '800', color: '#FF5C00' }}>{match.oddsB}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              background: '#0a0a0e',
              border: '1px dashed rgba(255,255,255,0.03)',
              borderRadius: '16px',
              padding: '24px',
              textAlign: 'center',
              color: '#51515E',
              fontSize: '11px'
            }}>
              Немає запланованих матчів.
            </div>
          )}
        </div>

        {/* 3. Completed Matches Section */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Trophy size={14} color="#8B5CF6" />
            <h3 style={{ fontSize: '12px', fontWeight: '900', color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'Outfit, sans-serif' }}>
              ЗАВЕРШЕНІ МАТЧІ
            </h3>
            <span style={{ fontSize: '10px', color: '#51515E', fontWeight: '600' }}>({completedMatches.length})</span>
          </div>

          {completedMatches.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {completedMatches.map((match) => {
                const isWinnerA = match.winnerId === match.teamA?.id;
                const isWinnerB = match.winnerId === match.teamB?.id;

                return (
                  <div
                    key={match.id}
                    className="esports-card"
                    onClick={() => onSelectMatch(match.id)}
                    style={{
                      padding: '16px',
                      cursor: 'pointer',
                      border: '1px solid rgba(255, 255, 255, 0.02)',
                      background: '#0a0a0e',
                      position: 'relative'
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span 
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTournament(match.tournamentId);
                        }}
                        style={{ fontSize: '9px', color: '#51515E', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}
                      >
                        {match.tournamentName} • {match.roundName}
                      </span>
                      <span style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.04)',
                        color: '#8F8F9B',
                        fontSize: '8px',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontFamily: 'Outfit, sans-serif',
                        textTransform: 'uppercase'
                      }}>
                        Завершено
                      </span>
                    </div>

                    {/* Score / Winner display */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '6px 0' }}>
                      
                      {/* Team A */}
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '6px',
                          background: match.teamA?.logoBg || '#1E293B',
                          color: 'white',
                          fontSize: '9px',
                          fontWeight: '900',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {match.teamA?.logoText || 'A'}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ 
                            fontSize: '11px', 
                            fontWeight: isWinnerA ? '900' : '600', 
                            color: isWinnerA ? 'white' : '#8F8F9B',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {match.teamA?.name || 'Team A'}
                            {isWinnerA && <span style={{ color: '#FFBF00' }}>👑</span>}
                          </span>
                        </div>
                      </div>

                      {/* Final Score */}
                      <div style={{ 
                        background: 'rgba(255, 255, 255, 0.01)',
                        border: '1px solid rgba(255, 255, 255, 0.03)',
                        borderRadius: '8px',
                        padding: '4px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontFamily: 'Outfit, sans-serif',
                        fontWeight: '900',
                        fontSize: '13px'
                      }}>
                        <span style={{ color: isWinnerA ? '#10B981' : '#51515E' }}>{match.scoreA}</span>
                        <span style={{ color: '#51515E', fontSize: '10px' }}>:</span>
                        <span style={{ color: isWinnerB ? '#10B981' : '#51515E' }}>{match.scoreB}</span>
                      </div>

                      {/* Team B */}
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <span style={{ 
                            fontSize: '11px', 
                            fontWeight: isWinnerB ? '900' : '600', 
                            color: isWinnerB ? 'white' : '#8F8F9B',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {isWinnerB && <span style={{ color: '#FFBF00' }}>👑</span>}
                            {match.teamB?.name || 'Team B'}
                          </span>
                        </div>
                        <div style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '6px',
                          background: match.teamB?.logoBg || '#1E293B',
                          color: 'white',
                          fontSize: '9px',
                          fontWeight: '900',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {match.teamB?.logoText || 'B'}
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{
              background: '#0a0a0e',
              border: '1px dashed rgba(255,255,255,0.03)',
              borderRadius: '16px',
              padding: '24px',
              textAlign: 'center',
              color: '#51515E',
              fontSize: '11px'
            }}>
              Немає завершених матчів.
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
