import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ChevronLeft, Star, Swords, Trophy, FileText, CheckCircle2 } from 'lucide-react';

interface TournamentDetailViewProps {
  tournamentId: string;
  onBack: () => void;
  onSelectMatch: (id: string) => void;
  onOpenRegister: (id: string) => void;
}

export const TournamentDetailView: React.FC<TournamentDetailViewProps> = ({
  tournamentId,
  onBack,
  onSelectMatch,
  onOpenRegister
}) => {
  const { tournaments, teams, matches, user } = useApp();
  const tourney = tournaments.find(t => t.id === tournamentId);
  const [activeTab, setActiveTab] = useState<'INFO' | 'BRACKET' | 'PARTICIPANTS' | 'RULES'>('INFO');
  const [isFavorited, setIsFavorited] = useState(false);

  if (!tourney) return <div style={{ padding: '20px', color: 'white' }}>Турнір не знайдено</div>;

  const tourneyTeams = teams[tournamentId] || [];
  const tourneyMatches = matches.filter(m => m.tournamentId === tournamentId);

  // Check if user is registered by inspecting captain names in the team list
  const userHandle = user?.username ? (user.username.startsWith('@') ? user.username : `@${user.username}`) : '@volki_player';
  const isUserRegistered = tourneyTeams.some(t => t.captain === userHandle || t.players?.some(p => p.username === userHandle));

  return (
    <div className="scroll-container" style={{ position: 'relative' }}>
      
      {/* Cover / Hero header block */}
      <div style={{
        background: tourney.imageUrl 
          ? `linear-gradient(180deg, rgba(10, 10, 14, 0.25) 0%, rgba(10, 10, 14, 0.95) 100%), url("${tourney.imageUrl}") center/cover no-repeat`
          : 'linear-gradient(180deg, rgba(255, 92, 0, 0.04) 0%, rgba(10, 10, 14, 0) 100%)',
        position: 'relative',
        padding: '20px 20px 24px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.01)',
        minHeight: tourney.imageUrl ? '200px' : 'auto',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}>
        {/* Navigation row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <button 
            onClick={onBack}
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--card-border)',
              borderRadius: '10px',
              color: 'white',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
          >
            <ChevronLeft size={20} />
          </button>
          
          <span style={{ fontSize: '15px', fontWeight: '900', color: 'white', fontFamily: 'Outfit, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            ДЕТАЛІ ТУРНІРУ
          </span>

          <button 
            onClick={() => setIsFavorited(!isFavorited)}
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--card-border)',
              borderRadius: '10px',
              color: isFavorited ? 'var(--primary-orange)' : 'white',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Star size={18} fill={isFavorited ? 'var(--primary-orange)' : 'none'} />
          </button>
        </div>

        {/* Hero Title */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
          <span style={{
            fontSize: '10px',
            color: tourney.type === '2X2' ? 'var(--accent-purple)' : 'var(--primary-orange)',
            backgroundColor: tourney.type === '2X2' ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255, 92, 0, 0.08)',
            border: `1px solid ${tourney.type === '2X2' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 92, 0, 0.15)'}`,
            padding: '3px 10px',
            borderRadius: '6px',
            fontFamily: 'Outfit, sans-serif',
            width: 'fit-content',
            fontWeight: '900'
          }}>
            {tourney.type}
          </span>
          <h2 style={{ fontSize: '26px', fontWeight: '900', color: 'white', fontFamily: 'Outfit, sans-serif', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
            {tourney.name}
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>
            {tourney.date}
          </span>
        </div>
      </div>

      {/* Main summary bento grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '10px',
        padding: '0 20px',
        marginBottom: '24px'
      }}>
        {[
          { label: 'Формат', val: tourney.type },
          { label: 'Карта', val: tourney.map },
          { label: 'Система', val: 'S. Elimination', size: '11px' },
          { label: 'Учасники', val: `${tourneyTeams.length}/${tourney.maxParticipants}` }
        ].map((item, idx) => (
          <div 
            key={idx} 
            className="esports-card"
            style={{
              padding: '12px 6px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '6px',
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)'
            }}
          >
            <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px' }}>
              {item.label}
            </span>
            <span style={{
              fontSize: item.size || '13px',
              fontWeight: '900',
              color: 'white',
              fontFamily: 'Outfit, sans-serif',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textTransform: 'uppercase'
            }}>
              {item.val}
            </span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs-header" style={{ padding: '0 20px', marginBottom: '20px' }}>
        {[
          { id: 'INFO', label: 'Інформація' },
          { id: 'BRACKET', label: 'Сітка' },
          { id: 'PARTICIPANTS', label: 'Учасники' },
          { id: 'RULES', label: 'Правила' }
        ].map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'tab-btn-active' : ''}`}
            onClick={() => setActiveTab(tab.id as any)}
            style={{ fontSize: '11px', fontWeight: '800' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT: Information */}
      {activeTab === 'INFO' && (
        <div style={{ padding: '0 20px 24px 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Details list card */}
          <div className="esports-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', background: 'var(--card-bg)' }}>
            {[
              { label: 'Початок турніру', val: tourney.date },
              { label: 'Реєстрація до', val: 'Сьогодні, 19:30' },
              { label: 'Призовий фонд', val: tourney.prizePool, highlight: true },
              { label: 'Регіон проведення', val: 'EU / UA' }
            ].map((d, idx) => (
              <div key={idx} style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '13px',
                borderBottom: idx < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                paddingBottom: idx < 3 ? '12px' : '0'
              }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>{d.label}</span>
                <span style={{ fontWeight: '800', color: d.highlight ? 'var(--primary-orange)' : 'white', fontFamily: d.highlight ? 'Outfit, sans-serif' : 'inherit' }}>{d.val}</span>
              </div>
            ))}
          </div>

          {/* Prize places podium card */}
          <div>
            <h4 style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '16px', fontFamily: 'Outfit, sans-serif', fontWeight: '800' }}>
              ПРИЗОВІ МІСЦЯ
            </h4>
            
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '12px',
              justifyContent: 'center'
            }}>
              {/* 2nd Place */}
              <div 
                className="esports-card"
                style={{
                  flex: 1,
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '16px',
                  padding: '20px 8px',
                  textAlign: 'center',
                  height: '120px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span style={{ fontSize: '24px', fontWeight: '900', color: '#94A3B8', fontFamily: 'Outfit, sans-serif' }}>2</span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>МІСЦЕ</span>
                <span style={{ fontSize: '13px', fontWeight: '850', color: 'white', fontFamily: 'Outfit, sans-serif' }}>
                  {tourney.prizePlaces.second.replace(' 🪙', '')}
                </span>
              </div>

              {/* 1st Place - Center highlighted */}
              <div 
                className="esports-card orange-glow"
                style={{
                  flex: 1.2,
                  background: 'linear-gradient(180deg, rgba(255, 92, 0, 0.08) 0%, rgba(16, 16, 22, 0.95) 100%)',
                  border: '1px solid rgba(255, 92, 0, 0.35)',
                  borderRadius: '20px',
                  padding: '26px 8px 22px 8px',
                  textAlign: 'center',
                  height: '145px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 8px 24px rgba(255, 92, 0, 0.12)'
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 92, 0, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(255, 92, 0, 0.35)'
                }}>
                  <Trophy size={18} color="var(--primary-orange)" />
                </div>
                <span style={{ fontSize: '11px', color: 'var(--primary-orange)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>1 МІСЦЕ</span>
                <span style={{ fontSize: '16px', fontWeight: '900', color: 'white', fontFamily: 'Outfit, sans-serif' }}>
                  {tourney.prizePlaces.first.replace(' 🪙', '')}
                </span>
              </div>

              {/* 3rd Place */}
              <div 
                className="esports-card"
                style={{
                  flex: 1,
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '16px',
                  padding: '20px 8px',
                  textAlign: 'center',
                  height: '120px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span style={{ fontSize: '24px', fontWeight: '900', color: '#B45309', fontFamily: 'Outfit, sans-serif' }}>3</span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>МІСЦЕ</span>
                <span style={{ fontSize: '13px', fontWeight: '850', color: 'white', fontFamily: 'Outfit, sans-serif' }}>
                  {tourney.prizePlaces.third.replace(' 🪙', '')}
                </span>
              </div>
            </div>
          </div>

          {/* Registration status / button */}
          <div style={{ marginTop: '10px' }}>
            {isUserRegistered ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                backgroundColor: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '14px',
                padding: '16px',
                color: 'var(--accent-green)',
                fontSize: '13px',
                fontWeight: '800',
                letterSpacing: '0.5px',
                fontFamily: 'Outfit, sans-serif',
                textTransform: 'uppercase'
              }}>
                <CheckCircle2 size={20} /> ВИ ЗАРЕЄСТРОВАНІ НА ТУРНІР
              </div>
            ) : tourneyTeams.length >= tourney.maxParticipants ? (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.06)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '14px',
                padding: '16px',
                color: 'var(--live-color)',
                fontSize: '13px',
                fontWeight: '800',
                textAlign: 'center',
                letterSpacing: '0.5px',
                fontFamily: 'Outfit, sans-serif',
                textTransform: 'uppercase'
              }}>
                РЕЄСТРАЦІЯ ЗАКРИТА (ТУРНІР ЗАПОВНЕНИЙ)
              </div>
            ) : (
              <button 
                className="btn-primary" 
                onClick={() => onOpenRegister(tourney.id)}
                style={{ width: '100%', padding: '16px', fontSize: '14px', letterSpacing: '0.8px' }}
              >
                ЗАРЕЄСТРУВАТИСЬ
              </button>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Tournament Grid / Bracket */}
      {activeTab === 'BRACKET' && (
        <div style={{ padding: '0 20px 24px 20px' }}>
          {tourneyMatches.length > 0 ? (
            <div className="bracket-container">
              {/* Round 1: Semifinals */}
              <div className="bracket-round">
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '900', textTransform: 'uppercase', marginBottom: '14px', textAlign: 'center', fontFamily: 'Outfit, sans-serif', letterSpacing: '0.5px' }}>
                  Півфінали
                </span>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', justifyContent: 'center', height: '100%' }}>
                  {tourneyMatches.filter(m => m.roundName === 'Semifinal').map((match) => {
                    const isLive = match.status === 'live';
                    const isFinished = match.status === 'finished';

                    return (
                      <div 
                        key={match.id} 
                        className={`bracket-matchup ${isLive ? 'bracket-matchup-live' : ''}`}
                        onClick={() => onSelectMatch(match.id)}
                        style={{
                          background: 'var(--card-bg)',
                          border: '1px solid var(--card-border)',
                          borderRadius: '12px',
                          padding: '10px'
                        }}
                      >
                        {/* Team A row */}
                        <div 
                          className={`bracket-team-row ${match.winnerId === match.teamA?.id && isFinished ? 'bracket-team-row-winner' : isFinished ? 'bracket-team-row-loser' : ''}`}
                          style={{ marginBottom: '4px' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="bracket-team-logo" style={{ backgroundColor: match.teamA?.logoBg, border: '1px solid rgba(255,255,255,0.06)' }}>
                              {match.teamA?.logoText}
                            </div>
                            <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12px', fontWeight: '700' }}>
                              {match.teamA?.name || 'Очікування'}
                            </span>
                          </div>
                          <span className="bracket-team-score" style={{ fontSize: '12px', color: match.winnerId === match.teamA?.id && isFinished ? 'var(--primary-orange)' : 'inherit' }}>{match.scoreA}</span>
                        </div>

                        {/* Team B row */}
                        <div className={`bracket-team-row ${match.winnerId === match.teamB?.id && isFinished ? 'bracket-team-row-winner' : isFinished ? 'bracket-team-row-loser' : ''}`}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="bracket-team-logo" style={{ backgroundColor: match.teamB?.logoBg, border: '1px solid rgba(255,255,255,0.06)' }}>
                              {match.teamB?.logoText}
                            </div>
                            <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12px', fontWeight: '700' }}>
                              {match.teamB?.name || 'Очікування'}
                            </span>
                          </div>
                          <span className="bracket-team-score" style={{ fontSize: '12px', color: match.winnerId === match.teamB?.id && isFinished ? 'var(--primary-orange)' : 'inherit' }}>{match.scoreB}</span>
                        </div>

                        {isLive && (
                          <div style={{
                            position: 'absolute',
                            top: '-8px',
                            right: '8px',
                            backgroundColor: 'var(--live-color)',
                            color: 'white',
                            fontSize: '8px',
                            fontWeight: '900',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            boxShadow: '0 0 6px rgba(239, 68, 68, 0.4)',
                            fontFamily: 'Outfit, sans-serif'
                          }}>
                            LIVE
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Connector Lines representation */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '50px', color: 'var(--text-muted)', fontSize: '11px' }}>
                <ChevronLeft size={18} style={{ transform: 'rotate(180deg)', opacity: 0.2 }} />
                <ChevronLeft size={18} style={{ transform: 'rotate(180deg)', opacity: 0.2 }} />
              </div>

              {/* Round 2: Final */}
              <div className="bracket-round">
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '900', textTransform: 'uppercase', marginBottom: '14px', textAlign: 'center', fontFamily: 'Outfit, sans-serif', letterSpacing: '0.5px' }}>
                  Фінал
                </span>

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
                  {tourneyMatches.filter(m => m.roundName === 'Final').map((match) => {
                    const isLive = match.status === 'live';
                    const isFinished = match.status === 'finished';

                    return (
                      <div 
                        key={match.id} 
                        className={`bracket-matchup ${isLive ? 'bracket-matchup-live' : ''}`}
                        onClick={() => match.teamA && match.teamB ? onSelectMatch(match.id) : undefined}
                        style={{
                          background: 'var(--card-bg)',
                          border: '1px solid var(--card-border)',
                          borderRadius: '12px',
                          padding: '10px'
                        }}
                      >
                        {/* Team A row */}
                        <div 
                          className={`bracket-team-row ${match.winnerId === match.teamA?.id && isFinished ? 'bracket-team-row-winner' : isFinished ? 'bracket-team-row-loser' : ''}`}
                          style={{ marginBottom: '4px' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="bracket-team-logo" style={{ backgroundColor: match.teamA?.logoBg || '#14141a', border: '1px solid rgba(255,255,255,0.06)' }}>
                              {match.teamA?.logoText || '?'}
                            </div>
                            <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12px', fontWeight: '700' }}>
                              {match.teamA?.name || 'Півфінал 1'}
                            </span>
                          </div>
                          <span className="bracket-team-score" style={{ fontSize: '12px', color: match.winnerId === match.teamA?.id && isFinished ? 'var(--primary-orange)' : 'inherit' }}>{match.scoreA}</span>
                        </div>

                        {/* Team B row */}
                        <div className={`bracket-team-row ${match.winnerId === match.teamB?.id && isFinished ? 'bracket-team-row-winner' : isFinished ? 'bracket-team-row-loser' : ''}`}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="bracket-team-logo" style={{ backgroundColor: match.teamB?.logoBg || '#14141a', border: '1px solid rgba(255,255,255,0.06)' }}>
                              {match.teamB?.logoText || '?'}
                            </div>
                            <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12px', fontWeight: '700' }}>
                              {match.teamB?.name || 'Півфінал 2'}
                            </span>
                          </div>
                          <span className="bracket-team-score" style={{ fontSize: '12px', color: match.winnerId === match.teamB?.id && isFinished ? 'var(--primary-orange)' : 'inherit' }}>{match.scoreB}</span>
                        </div>

                        {isLive && (
                          <div style={{
                            position: 'absolute',
                            top: '-8px',
                            right: '8px',
                            backgroundColor: 'var(--live-color)',
                            color: 'white',
                            fontSize: '8px',
                            fontWeight: '900',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            boxShadow: '0 0 6px rgba(239, 68, 68, 0.4)',
                            fontFamily: 'Outfit, sans-serif'
                          }}>
                            LIVE
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 20px',
              color: 'var(--text-muted)',
              gap: '12px',
              textAlign: 'center'
            }}>
              <Swords size={42} color="var(--text-muted)" />
              <span style={{ fontSize: '13px', fontWeight: '600' }}>
                Сітка змагань буде сформована після заповнення всіх {tourney.maxParticipants} слотів учасників.
              </span>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Participants */}
      {activeTab === 'PARTICIPANTS' && (
        <div style={{ padding: '0 20px 24px 20px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h4 style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'Outfit, sans-serif', fontWeight: '800' }}>
              УЧАСНИКИ ({tourneyTeams.length}/{tourney.maxParticipants})
            </h4>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px'
          }}>
            {tourneyTeams.map((team) => {
              const isMyTeam = team.captain === userHandle || team.players?.some(p => p.username === userHandle);
              return (
                <div 
                  key={team.id}
                  className="esports-card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'var(--card-bg)',
                    border: isMyTeam ? '1px solid rgba(255,92,0,0.3)' : '1px solid var(--card-border)',
                    borderRadius: '16px',
                    padding: '14px 6px',
                    textAlign: 'center',
                    position: 'relative'
                  }}
                >
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: team.logoBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: '900',
                    color: 'white',
                    fontFamily: 'Outfit, sans-serif',
                    border: '2px solid rgba(255,255,255,0.08)',
                    marginBottom: '8px',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
                  }}>
                    {team.logoText}
                  </div>
                  
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '800',
                    color: 'white',
                    width: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontFamily: 'Outfit, sans-serif'
                  }}>
                    {team.name}
                  </span>

                  {isMyTeam && (
                    <span style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-4px',
                      fontSize: '8px',
                      backgroundColor: 'var(--primary-orange)',
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: '6px',
                      fontWeight: '900',
                      fontFamily: 'Outfit, sans-serif',
                      border: '1px solid rgba(0,0,0,0.3)'
                    }}>
                      MY
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Rules */}
      {activeTab === 'RULES' && (
        <div style={{ padding: '0 20px 24px 20px' }}>
          <div className="esports-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '850', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Outfit, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <FileText size={18} color="var(--primary-orange)" /> РЕГЛАМЕНТ ТУРНІРУ
            </h4>
            
            <ol style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              paddingLeft: '16px',
              fontSize: '13px',
              color: 'var(--text-secondary)',
              lineHeight: '1.6',
              fontWeight: '500'
            }}>
              {tourney.rules.map((rule, idx) => (
                <li key={idx} style={{ paddingLeft: '4px' }}>{rule}</li>
              ))}
            </ol>
          </div>
        </div>
      )}

    </div>
  );
};

