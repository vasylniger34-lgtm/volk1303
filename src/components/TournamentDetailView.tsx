import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ChevronLeft, Star, Swords, Trophy, FileText, CheckCircle2, Coins, Lock, Tv2, ExternalLink, Maximize2, X } from 'lucide-react';
import { getFormatBadgeStyle } from './TournamentsView';

interface TournamentDetailViewProps {
  tournamentId: string;
  onBack: () => void;
  onSelectMatch: (id: string) => void;
  onOpenRegister: (id: string) => void;
}

// Converts any YouTube / Twitch URL to an embeddable iframe src
function getEmbedUrl(url: string): string | null {
  if (!url) return null;

  // YouTube: youtu.be/ID or youtube.com/watch?v=ID or youtube.com/live/ID
  const ytShort = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  const ytFull  = url.match(/youtube\.com\/(?:watch\?v=|live\/)([a-zA-Z0-9_-]{11})/);
  const ytId = (ytShort || ytFull)?.[1];
  if (ytId) return `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=0`;

  // Twitch channel: twitch.tv/CHANNEL
  const twCh = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)/);
  if (twCh) return `https://player.twitch.tv/?channel=${twCh[1]}&parent=${window.location.hostname}&autoplay=true`;

  return null; // unsupported platform – we'll show a fallback link
}

export const TournamentDetailView: React.FC<TournamentDetailViewProps> = ({
  tournamentId,
  onBack,
  onSelectMatch,
  onOpenRegister
}) => {
  const { tournaments, teams, matches, user, predictions, placePrediction, joinTeam } = useApp();
  const tourney = tournaments.find(t => t.id === tournamentId);
  const [activeTab, setActiveTab] = useState<'INFO' | 'BRACKET' | 'PARTICIPANTS' | 'BETS' | 'RULES' | 'STREAM'>('INFO');
  const [fullscreenUrl, setFullscreenUrl] = useState<string | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [selectedTeamForBet, setSelectedTeamForBet] = useState<any | null>(null);
  const [selectedTeamOdds, setSelectedTeamOdds] = useState<number>(0);
  const [wagerAmount, setWagerAmount] = useState<number>(100);

  if (!tourney) return <div style={{ padding: '20px', color: 'white' }}>Турнір не знайдено</div>;

  const rawStream = tourney.streamUrl || '';
  const streamUrls = rawStream ? rawStream.split(/[\s,]+/).map(url => url.trim()).filter(Boolean) : [];
  const embedUrls = streamUrls.map(url => ({ url, embed: getEmbedUrl(url) }));

  const tourneyTeams = teams[tournamentId] || [];
  const tourneyMatches = matches.filter(m => m.tournamentId === tournamentId);

  const myOutrightBets = predictions.filter(
    p => p.predictionType === 'tournament_winner' && 
         (p.tournamentName === tourney.name || p.tournamentId === tournamentId)
  );

  const getTeamOdds = (teamId: string) => {
    let hash = 0;
    for (let i = 0; i < teamId.length; i++) {
      hash = teamId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const minOdds = 2.0;
    const maxOdds = 5.5;
    const normalized = Math.abs(hash % 100) / 100;
    return parseFloat((minOdds + normalized * (maxOdds - minOdds)).toFixed(2));
  };

  // Check if user is registered by inspecting captain names in the team list
  const userHandle = user?.username ? (user.username.startsWith('@') ? user.username : `@${user.username}`) : '@volki_player';
  const isUserRegistered = tourneyTeams.some(t => t.captain === userHandle || t.players?.some(p => p.username === userHandle));

  const handleJoinClick = async (team: any) => {
    if (team.joinType === 'closed') {
      const pwd = window.prompt('Ця команда закрита. Введіть пароль:');
      if (!pwd) return;
      await joinTeam(team.id, pwd);
    } else if (team.joinType === 'open') {
      if (window.confirm(`Приєднатися до команди ${team.name}?`)) {
        await joinTeam(team.id);
      }
    }
  };

  return (
    <div className="scroll-container" style={{ position: 'relative', paddingBottom: '120px' }}>
      
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
            color: getFormatBadgeStyle(tourney.type).color,
            backgroundColor: getFormatBadgeStyle(tourney.type).bg,
            border: `1px solid ${getFormatBadgeStyle(tourney.type).border}`,
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
          { id: 'BETS', label: 'Ставки 🏆' },
          { id: 'RULES', label: 'Правила' },
          ...(rawStream ? [{ id: 'STREAM', label: '📡 Ефір' }] : [])
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
              {/* 2nd Place - only if prize exists */}
              {tourney.prizePlaces.second && (
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
              )}

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

              {/* 3rd Place - only if prize exists */}
              {tourney.prizePlaces.third && (
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
              )}
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
                  {!isMyTeam && !isUserRegistered && (team.joinType === 'open' || team.joinType === 'closed') && (team.players?.length < 2) && (
                    <button
                      onClick={() => handleJoinClick(team)}
                      style={{
                        marginTop: '8px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '6px',
                        color: 'var(--accent-green)',
                        fontSize: '10px',
                        fontWeight: '700',
                        padding: '4px 8px',
                        cursor: 'pointer'
                      }}
                    >
                      {team.joinType === 'closed' ? 'ВСТУПИТИ 🔒' : 'ВСТУПИТИ'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Bets */}
      {activeTab === 'BETS' && (
        <div style={{ padding: '0 20px 24px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Header section with User Balance */}
          <div className="esports-card" style={{
            padding: '16px',
            background: 'linear-gradient(135deg, rgba(255, 92, 0, 0.05) 0%, rgba(10, 10, 14, 0.95) 100%)',
            border: '1px solid rgba(255, 92, 0, 0.15)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Coins size={18} color="var(--primary-orange)" />
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>Ваш баланс:</span>
            </div>
            <span style={{ fontSize: '16px', fontWeight: '900', color: 'white', fontFamily: 'Outfit, sans-serif' }}>
              {(user?.balance || 0).toLocaleString('uk-UA')} 🪙
            </span>
          </div>

          {/* Active bets by the user on this tournament */}
          {myOutrightBets.length > 0 && (
            <div>
              <h4 style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'Outfit, sans-serif', fontWeight: '800', marginBottom: '10px' }}>
                МОЇ СТАВКИ НА ПЕРЕМОЖЦЯ
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {myOutrightBets.map(b => (
                  <div key={b.id} className="esports-card" style={{
                    padding: '12px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: b.status === 'won' 
                      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, #0e0e13 100%)' 
                      : b.status === 'lost' 
                        ? '#0e0e13'
                        : 'linear-gradient(135deg, rgba(255, 92, 0, 0.03) 0%, #0e0e13 100%)',
                    border: b.status === 'won' 
                      ? '1px solid rgba(16, 185, 129, 0.2)' 
                      : b.status === 'lost' 
                        ? '1px solid rgba(255, 255, 255, 0.02)' 
                        : '1px solid rgba(255, 92, 0, 0.15)'
                  }}>
                    <div>
                      <span style={{ fontSize: '10px', color: '#8F8F9B', display: 'block' }}>
                        Переможець: <strong style={{ color: 'white' }}>{b.predictedValue}</strong>
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: 'white', fontFamily: 'Outfit, sans-serif' }}>
                        {b.wager.toLocaleString('uk-UA')} 🪙 × {b.odds}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {b.status === 'pending' && (
                        <span style={{ fontSize: '10px', color: '#FF5C00', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '750' }}>
                          <CheckCircle2 size={10} color="#FF5C00" /> У грі
                        </span>
                      )}
                      {b.status === 'won' && (
                        <span style={{ fontSize: '10px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '800' }}>
                          ВИГРАШ +{b.payout.toLocaleString('uk-UA')} 🪙
                        </span>
                      )}
                      {b.status === 'lost' && (
                        <span style={{ fontSize: '10px', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '750' }}>
                          Програш
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* List of Teams and Outright Winner Betting Odds */}
          <div>
            <h4 style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'Outfit, sans-serif', fontWeight: '800', marginBottom: '12px' }}>
              КОЕФІЦІЄНТИ НА ПЕРЕМОГУ В ТУРНІРІ
            </h4>

            {tourney.status === 'completed' || (tourneyMatches.find(m => m.roundName === 'Final')?.status === 'finished') ? (
              <div className="esports-card" style={{
                padding: '16px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid rgba(255,255,255,0.03)'
              }}>
                <Lock size={14} /> Прийом ставок на переможця турніру закрито
              </div>
            ) : tourneyTeams.length === 0 ? (
              <div className="esports-card" style={{
                padding: '30px 20px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '12px'
              }}>
                Учасники ще не зареєструвались. Коефіцієнти з'являться після реєстрації команд.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {tourneyTeams.map((team) => {
                  const odds = getTeamOdds(team.id);
                  const hasBetOnThisTeam = myOutrightBets.some(b => b.predictedValue === team.name);

                  return (
                    <div 
                      key={team.id}
                      className="esports-card"
                      style={{
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'var(--card-bg)',
                        border: hasBetOnThisTeam ? '1px solid rgba(255,92,0,0.25)' : '1px solid var(--card-border)',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: team.logoBg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: '900',
                          color: 'white',
                          fontFamily: 'Outfit, sans-serif'
                        }}>
                          {team.logoText}
                        </div>
                        <div>
                          <span style={{ fontSize: '13px', fontWeight: '800', color: 'white', fontFamily: 'Outfit, sans-serif', display: 'block' }}>
                            {team.name}
                          </span>
                          <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                            Капітан: {team.captain}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedTeamForBet(team);
                          setSelectedTeamOdds(odds);
                          setWagerAmount(100);
                        }}
                        style={{
                          background: hasBetOnThisTeam ? 'rgba(255,92,0,0.1)' : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${hasBetOnThisTeam ? 'var(--primary-orange)' : 'rgba(255,255,255,0.06)'}`,
                          borderRadius: '10px',
                          color: 'white',
                          padding: '8px 16px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s'
                        }}
                      >
                        {hasBetOnThisTeam && <CheckCircle2 size={12} color="var(--primary-orange)" />}
                        <span style={{ fontSize: '14px', fontWeight: '900', color: 'var(--primary-orange)', fontFamily: 'Outfit, sans-serif' }}>
                          ×{odds}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FLOATING BET BOTTOM SHEET / MODAL */}
      {selectedTeamForBet && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setSelectedTeamForBet(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              zIndex: 100,
            }}
          />

          {/* Sheet */}
          <div style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            background: '#0D0D14',
            border: '1px solid rgba(255,92,0,0.2)',
            borderRadius: '28px 28px 0 0',
            padding: '24px 20px 40px',
            zIndex: 101,
            animation: 'slideUp 0.25s ease',
          }}>
            {/* Handle bar */}
            <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.1)', margin: '0 auto 20px' }} />

            {/* Bet summary header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', position: 'relative' }}>
              <div>
                <span style={{ fontSize: '10px', color: '#8F8F9B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ставка на переможця</span>
                <p style={{ fontSize: '18px', fontWeight: '900', color: 'white', fontFamily: 'Outfit, sans-serif', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: selectedTeamForBet.logoBg }} />
                  {selectedTeamForBet.name}
                </p>
              </div>
              <div style={{ textAlign: 'right', paddingRight: '30px' }}>
                <span style={{ fontSize: '10px', color: '#8F8F9B', textTransform: 'uppercase' }}>Коефіцієнт</span>
                <p style={{ fontSize: '24px', fontWeight: '950', color: '#FF5C00', fontFamily: 'Outfit, sans-serif', marginTop: '2px' }}>
                  ×{selectedTeamOdds}
                </p>
              </div>
              <button 
                onClick={() => setSelectedTeamForBet(null)} 
                style={{ 
                  position: 'absolute', 
                  top: '0', 
                  right: '0', 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  color: '#8F8F9B',
                  padding: '4px'
                }}
              >
                <span style={{ fontSize: '20px', fontWeight: '300' }}>✕</span>
              </button>
            </div>

            {/* Balance indicator */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#8F8F9B', marginBottom: '8px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Coins size={11} /> Ваш баланс</span>
              <span style={{ fontWeight: '700', color: 'white' }}>{(user?.balance || 0).toLocaleString('uk-UA')} 🪙</span>
            </div>

            {/* Wager input */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input
                type="number"
                className="form-input"
                value={wagerAmount}
                min={50}
                max={user?.balance || 0}
                onChange={e => setWagerAmount(Math.max(0, parseInt(e.target.value) || 0))}
                style={{ 
                  flex: 1, 
                  padding: '12px 14px', 
                  fontSize: '16px', 
                  fontWeight: '800', 
                  fontFamily: 'Outfit, sans-serif',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  color: 'white'
                }}
              />
              {[100, 500, 1000].map(amt => (
                <button 
                  key={amt} 
                  onClick={() => setWagerAmount(Math.min(user?.balance || 0, amt))}
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', color: 'white', fontSize: '11px', fontWeight: '700', padding: '0 12px', cursor: 'pointer' }}
                >
                  {amt >= 1000 ? `${amt/1000}K` : amt}
                </button>
              ))}
              <button 
                onClick={() => setWagerAmount(user?.balance || 0)}
                style={{ background: 'rgba(255,92,0,0.08)', border: '1px solid rgba(255,92,0,0.2)', borderRadius: '10px', color: '#FF5C00', fontSize: '11px', fontWeight: '800', padding: '0 12px', cursor: 'pointer' }}
              >
                MAX
              </button>
            </div>

            {/* Potential payout */}
            <div style={{
              background: 'rgba(16, 185, 129, 0.05)', 
              border: '1px solid rgba(16, 185, 129, 0.12)',
              borderRadius: '12px', 
              padding: '12px 16px',
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '16px',
            }}>
              <span style={{ fontSize: '12px', color: '#8F8F9B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={13} color="#10B981" /> Можливий виграш
              </span>
              <span style={{ fontSize: '18px', fontWeight: '900', color: '#10B981', fontFamily: 'Outfit, sans-serif' }}>
                {wagerAmount > 0 ? Math.round(wagerAmount * selectedTeamOdds).toLocaleString('uk-UA') : '–'} 🪙
              </span>
            </div>

            {/* Confirm button */}
            <button
              className="btn-primary"
              onClick={() => {
                if (wagerAmount <= 0) return;
                if (wagerAmount > (user?.balance || 0)) return;

                const ok = placePrediction({
                  matchId: null,
                  tournamentId: tourney.id,
                  tournamentName: tourney.name,
                  teamA: selectedTeamForBet.name,
                  teamB: 'Winner Prediction',
                  predictionType: 'tournament_winner',
                  predictedValue: selectedTeamForBet.name,
                  odds: selectedTeamOdds,
                  wager: wagerAmount,
                });

                if (ok) {
                  setSelectedTeamForBet(null);
                }
              }}
              disabled={wagerAmount < 50 || wagerAmount > (user?.balance || 0)}
              style={{ width: '100%', padding: '16px', fontSize: '14px', fontWeight: '900', letterSpacing: '1px' }}
            >
              ПІДТВЕРДИТИ СТАВКУ
            </button>
          </div>
        </>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>

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

      {/* TAB CONTENT: Stream */}
      {activeTab === 'STREAM' && (
        <div style={{ padding: '0 20px 24px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {embedUrls.map(({ url, embed }, idx) => (
            <div key={idx} className="esports-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: '800', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Tv2 size={14} color="#FF5C00" /> Трансляція #{idx + 1}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {embed && (
                    <button
                      onClick={() => setFullscreenUrl(embed)}
                      style={{ background: 'none', border: 'none', color: '#8F8F9B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '800' }}
                    >
                      На весь екран <Maximize2 size={12} />
                    </button>
                  )}
                  <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#FF5C00', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontWeight: '800' }}>
                    Відкрити <ExternalLink size={12} />
                  </a>
                </div>
              </div>
              {embed ? (
                <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <iframe
                    src={embed}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                    allowFullScreen
                    allow="autoplay; encrypted-media"
                  />
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#8F8F9B', fontSize: '12px', border: '1px dotted rgba(255,255,255,0.1)', borderRadius: '10px' }}>
                  Плеєр не підтримується для цього посилання. Будь ласка, використовуйте посилання вище.
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Fullscreen stream overlay */}
      {fullscreenUrl && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'black',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', background: '#0D0D14', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: 'white' }}>Повноекранний режим</span>
            <button 
              onClick={() => setFullscreenUrl(null)}
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <iframe
              src={fullscreenUrl}
              style={{ width: '100%', height: '100%', border: 'none' }}
              allowFullScreen
              allow="autoplay; encrypted-media"
            />
          </div>
        </div>
      )}

    </div>
  );
};

