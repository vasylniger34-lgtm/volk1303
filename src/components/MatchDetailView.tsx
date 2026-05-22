import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ChevronLeft, Share2, Zap, Tv2, ExternalLink, TrendingUp, Coins, CheckCircle, XCircle, Clock, X, Maximize2 } from 'lucide-react';

interface MatchDetailViewProps {
  matchId: string;
  onBack: () => void;
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

export const MatchDetailView: React.FC<MatchDetailViewProps> = ({ matchId, onBack }) => {
  const { matches, tournaments, placePrediction, predictions, user, showToast } = useApp();
  const match  = matches.find(m => m.id === matchId);
  const tourney = tournaments.find(t => t.id === match?.tournamentId);

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'STREAM' | 'BETS'>('OVERVIEW');
  const [fullscreenUrl, setFullscreenUrl] = useState<string | null>(null);

  // ─── Betting State ───
  const [betOpen, setBetOpen] = useState(false);
  const [selectedBet, setSelectedBet] = useState<{
    type: 'winner' | 'total_rounds';
    value: string;
    odds: number;
  } | null>(null);
  const [wager, setWager] = useState<number>(100);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-open bet keyboard on mobile
  useEffect(() => {
    if (betOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [betOpen]);

  if (!match) return <div style={{ padding: '20px', color: 'white' }}>Матч не знайдено</div>;

  const isLive     = match.status === 'live';
  const isFinished = match.status === 'finished';

  // ─── My bets on this match ───
  const myBets = predictions.filter(p => p.matchId === matchId);

  // ─── Stream embed ───
  const rawStream = tourney?.streamUrl || '';
  const streamUrls = rawStream ? rawStream.split(/[\s,]+/).map(url => url.trim()).filter(Boolean) : [];
  const embedUrls = streamUrls.map(url => ({ url, embed: getEmbedUrl(url) }));

  // ─── Bet Handlers ───
  const openBet = (type: 'winner' | 'total_rounds', value: string, odds: number) => {
    if (isFinished) { showToast('Прийом ставок закрито', 'error'); return; }
    if (isLive && type === 'winner' && myBets.some(b => b.predictionType === 'winner')) {
      showToast('Ви вже зробили ставку на переможця!', 'error'); return;
    }
    setSelectedBet({ type, value, odds });
    setWager(100);
    setBetOpen(true);
  };

  const confirmBet = () => {
    if (!selectedBet) return;
    if (wager <= 0) { showToast('Введіть суму ставки!', 'error'); return; }
    if (wager > user.balance) { showToast('Недостатньо монет!', 'error'); return; }

    const ok = placePrediction({
      matchId: match.id,
      tournamentName: match.tournamentName,
      teamA: match.teamA?.name || 'Team A',
      teamB: match.teamB?.name || 'Team B',
      predictionType: selectedBet.type,
      predictedValue: selectedBet.value,
      odds: selectedBet.odds,
      wager,
    });

    if (ok) { setBetOpen(false); setSelectedBet(null); }
  };

  // Pick button style helper
  const pickStyle = (active: boolean) => ({
    background: active ? 'rgba(255, 92, 0, 0.12)' : 'rgba(255,255,255,0.02)',
    border: `1px solid ${active ? '#FF5C00' : 'rgba(255,255,255,0.06)'}`,
    borderRadius: '14px',
    padding: '14px 16px',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'all 0.18s',
    textAlign: 'left' as const,
    width: '100%',
  });

  return (
    <div className="scroll-container" style={{ paddingBottom: '160px' }}>

      {/* ─── Sticky Header ─── */}
      <div className="glass-panel" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#8F8F9B', cursor: 'pointer', padding: '4px' }}>
          <ChevronLeft size={22} />
        </button>
        <h3 style={{ fontSize: '14px', fontWeight: '900', color: 'white', fontFamily: 'Outfit, sans-serif' }}>
          {match.teamA?.logoText} VS {match.teamB?.logoText}
        </h3>
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: `Матч ${match.teamA?.name} vs ${match.teamB?.name}`, url: window.location.href });
            } else {
              showToast('Посилання скопійовано!', 'info');
            }
          }}
          style={{ background: 'none', border: 'none', color: '#8F8F9B', cursor: 'pointer', padding: '4px' }}
        >
          <Share2 size={18} />
        </button>
      </div>

      {/* ─── Scoreboard ─── */}
      <div style={{
        background: 'linear-gradient(180deg, #111116 0%, #070709 100%)',
        padding: '24px 16px 20px',
        textAlign: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.03)',
      }}>
        <span style={{ fontSize: '9px', color: '#8F8F9B', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>
          {match.tournamentName} • {match.roundName.toUpperCase()}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', marginBottom: '14px' }}>
          {/* Team A */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '32%' }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%',
              backgroundColor: match.teamA?.logoBg || '#4C1D95',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: '900', color: 'white', fontSize: '18px', fontFamily: 'Outfit, sans-serif',
              border: '2px solid rgba(255,255,255,0.08)',
              boxShadow: isLive ? '0 0 20px rgba(255,92,0,0.3)' : '0 6px 16px rgba(0,0,0,0.4)',
              marginBottom: '8px',
            }}>
              {match.teamA?.logoText}
            </div>
            <span style={{ fontSize: '12px', fontWeight: '800', color: 'white', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
              {match.teamA?.name}
            </span>
          </div>

          {/* Score */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '40px', fontWeight: '900', fontFamily: 'Outfit, sans-serif', color: 'white' }}>{match.scoreA}</span>
              <span style={{ fontSize: '13px', color: '#51515E', fontWeight: '700' }}>:</span>
              <span style={{ fontSize: '40px', fontWeight: '900', fontFamily: 'Outfit, sans-serif', color: 'white' }}>{match.scoreB}</span>
            </div>
            {isLive ? (
              <span className="badge-live" style={{ marginTop: '4px' }}>
                <span className="badge-live-pulse" /> LIVE
              </span>
            ) : isFinished ? (
              <span style={{ fontSize: '8px', color: '#10B981', backgroundColor: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', padding: '2px 8px', borderRadius: '4px', fontWeight: '900', marginTop: '4px' }}>
                ЗАВЕРШЕНО
              </span>
            ) : (
              <span style={{ fontSize: '9px', color: '#8F8F9B', backgroundColor: 'rgba(255,255,255,0.02)', padding: '2px 8px', borderRadius: '4px', marginTop: '4px', fontWeight: '700' }}>
                ОЧІКУВАННЯ
              </span>
            )}
          </div>

          {/* Team B */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '32%' }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%',
              backgroundColor: match.teamB?.logoBg || '#1E293B',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: '900', color: 'white', fontSize: '18px', fontFamily: 'Outfit, sans-serif',
              border: '2px solid rgba(255,255,255,0.08)',
              boxShadow: isLive ? '0 0 20px rgba(139,92,246,0.3)' : '0 6px 16px rgba(0,0,0,0.4)',
              marginBottom: '8px',
            }}>
              {match.teamB?.logoText}
            </div>
            <span style={{ fontSize: '12px', fontWeight: '800', color: 'white', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
              {match.teamB?.name}
            </span>
          </div>
        </div>

        {/* Map row + stream indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '11px', color: '#8F8F9B', marginTop: '4px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Zap size={11} color="#FF5C00" /> {match.map}
          </span>
          <span>BO3 систем</span>
          {rawStream && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#EF4444', fontWeight: '700' }}>
              <Tv2 size={11} /> ЕФІР
            </span>
          )}
        </div>
      </div>

      {/* ─── Tabs ─── */}
      <div className="tabs-header" style={{ padding: '0 16px', margin: '12px 0' }}>
        {[
          { id: 'OVERVIEW', label: 'Огляд' },
          ...(rawStream ? [{ id: 'STREAM', label: '📡 Ефір' }] : []),
          { id: 'BETS',     label: 'Ставки' },
        ].map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'tab-btn-active' : ''}`}
            onClick={() => setActiveTab(tab.id as any)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════
          TAB: OVERVIEW
         ══════════════════════════════════════ */}
      {activeTab === 'OVERVIEW' && (
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Half-time card */}
          <div className="esports-card" style={{
            padding: '18px 16px',
            background: 'linear-gradient(180deg, rgba(255,92,0,0.06) 0%, rgba(16,16,22,0.98) 100%)',
            border: '1px solid rgba(255,92,0,0.22)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'white', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={12} color="#FF5C00" fill="#FF5C00" /> {match.map}
              </span>
              <span style={{ fontSize: '13px', fontWeight: '800', color: '#FF5C00', fontFamily: 'Outfit, sans-serif' }}>
                {match.scoreA} : {match.scoreB}
              </span>
            </div>
            {match.mapScores && match.mapScores.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', marginTop: '12px' }}>
                {match.mapScores.map((score, index) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                    <span style={{ color: '#8F8F9B' }}>Карта {index + 1}</span>
                    <span style={{ fontWeight: '700', color: 'white' }}>{score.scoreA} : {score.scoreB}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick bet picks - only when not finished */}
          {!isFinished && match.teamA && match.teamB && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h4 style={{ fontSize: '11px', color: '#8F8F9B', textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'Outfit, sans-serif', fontWeight: '800' }}>
                ЗРОБИТИ СТАВКУ
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  onClick={() => openBet('winner', match.teamA!.name, match.oddsA)}
                  style={{
                    ...pickStyle(selectedBet?.value === match.teamA.name),
                    flexDirection: 'column', alignItems: 'flex-start', gap: '4px',
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: match.teamA.logoBg, display: 'inline-block' }} />
                    {match.teamA.name}
                  </span>
                  <span style={{ fontSize: '17px', fontWeight: '900', color: '#FF5C00', fontFamily: 'Outfit, sans-serif' }}>
                    ×{match.oddsA}
                  </span>
                </button>
                <button
                  onClick={() => openBet('winner', match.teamB!.name, match.oddsB)}
                  style={{
                    ...pickStyle(selectedBet?.value === match.teamB.name),
                    flexDirection: 'column', alignItems: 'flex-start', gap: '4px',
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: match.teamB.logoBg, display: 'inline-block' }} />
                    {match.teamB.name}
                  </span>
                  <span style={{ fontSize: '17px', fontWeight: '900', color: '#FF5C00', fontFamily: 'Outfit, sans-serif' }}>
                    ×{match.oddsB}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Live logs */}
          <div className="esports-card" style={{ padding: '16px' }}>
            <h4 style={{ fontSize: '11px', color: '#8F8F9B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
              ХРОНОЛОГІЯ МАТЧУ
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto', fontSize: '11px', color: '#8F8F9B' }}>
              {match.liveLogs.length > 0 ? (
                [...match.liveLogs].reverse().map((log, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.01)', paddingBottom: '6px' }}>
                    <span style={{ color: '#FF5C00' }}>•</span>
                    <span>{log}</span>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', color: '#51515E', padding: '20px 0' }}>Очікування старту гри...</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          TAB: LIVE STREAM
         ══════════════════════════════════════ */}
      {activeTab === 'STREAM' && (
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {embedUrls.length > 0 ? (
            <>
              {embedUrls.map(({ url, embed }, index) => (
                <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {embed ? (
                    <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,92,0,0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', position: 'relative' }}>
                      <iframe
                        src={embed}
                        width="100%"
                        height="220"
                        frameBorder="0"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                        title={`Live Stream ${index + 1}`}
                        style={{ display: 'block' }}
                      />
                      {/* Webview-safe Fullscreen overlay trigger */}
                      <button
                        onClick={() => setFullscreenUrl(embed)}
                        style={{
                          position: 'absolute',
                          bottom: '12px',
                          right: '12px',
                          backgroundColor: 'rgba(10, 10, 14, 0.85)',
                          border: '1px solid rgba(255, 92, 0, 0.4)',
                          borderRadius: '8px',
                          color: '#fff',
                          padding: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 10
                        }}
                      >
                        <Maximize2 size={14} color="#FF5C00" />
                      </button>
                    </div>
                  ) : (
                    <div className="esports-card" style={{ padding: '20px', textAlign: 'center' }}>
                      <Tv2 size={32} color="#FF5C00" style={{ margin: '0 auto 12px' }} />
                      <p style={{ fontSize: '13px', fontWeight: '700', color: 'white', marginBottom: '6px' }}>Ефір {embedUrls.length > 1 ? `#${index + 1}` : ''} доступний за посиланням</p>
                      <p style={{ fontSize: '11px', color: '#8F8F9B', marginBottom: '16px' }}>Вбудований плеєр недоступний для цієї платформи</p>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          backgroundColor: '#FF5C00', borderRadius: '10px', padding: '10px 20px',
                          color: 'white', fontWeight: '800', fontSize: '12px', textDecoration: 'none',
                        }}
                      >
                        <ExternalLink size={14} /> Відкрити ефір {embedUrls.length > 1 ? `#${index + 1}` : ''}
                      </a>
                    </div>
                  )}

                  {/* Stream info card */}
                  <div className="esports-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '10px',
                      background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))',
                      border: '1px solid rgba(239,68,68,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Tv2 size={20} color="#EF4444" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>
                        {match.teamA?.name} vs {match.teamB?.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#8F8F9B', marginTop: '2px' }}>
                        {match.tournamentName} • Офіційна трансляція {embedUrls.length > 1 ? `#${index + 1}` : ''}
                      </div>
                    </div>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#FF5C00', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontSize: '11px', fontWeight: '700' }}
                    >
                      Дивитись <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="esports-card" style={{ padding: '40px 20px', textAlign: 'center' }}>
              <Tv2 size={40} color="#51515E" style={{ margin: '0 auto 14px', opacity: 0.4 }} />
              <p style={{ fontSize: '14px', fontWeight: '700', color: '#8F8F9B' }}>Ефір ще не підключено</p>
              <p style={{ fontSize: '11px', color: '#51515E', marginTop: '6px' }}>
                Адміністратор платформи налаштує посилання на трансляцію до початку матчу
              </p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════
          TAB: BETS
         ══════════════════════════════════════ */}
      {activeTab === 'BETS' && (
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {isFinished ? (
            <div className="esports-card" style={{ padding: '20px', textAlign: 'center', color: '#51515E', fontSize: '12px' }}>
              Прийом ставок закрито — матч завершено.
            </div>
          ) : (
            <>
              {/* Winner picks */}
              <div>
                <h4 style={{ fontSize: '11px', color: '#8F8F9B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', fontFamily: 'Outfit' }}>
                  ПЕРЕМОЖЕЦЬ МАТЧУ
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {[
                    { team: match.teamA, odds: match.oddsA },
                    { team: match.teamB, odds: match.oddsB },
                  ].map(({ team, odds }) => team ? (
                    <button
                      key={team.id}
                      onClick={() => openBet('winner', team.name, odds)}
                      style={{ ...pickStyle(selectedBet?.type === 'winner' && selectedBet.value === team.name), flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: team.logoBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '900' }}>
                          {team.logoText}
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: '800' }}>{team.name}</span>
                      </div>
                      <span style={{ fontSize: '20px', fontWeight: '950', color: '#FF5C00', fontFamily: 'Outfit, sans-serif' }}>×{odds}</span>
                    </button>
                  ) : null)}
                </div>
              </div>

              {/* Total rounds */}
              <div>
                <h4 style={{ fontSize: '11px', color: '#8F8F9B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', fontFamily: 'Outfit' }}>
                  ТОТАЛ РАУНДІВ (26.5)
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button onClick={() => openBet('total_rounds', 'over', 1.75)}
                    style={{ ...pickStyle(selectedBet?.type === 'total_rounds' && selectedBet.value === 'over'), flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700' }}>Більше 26.5</span>
                    <span style={{ fontSize: '20px', fontWeight: '950', color: '#FF5C00', fontFamily: 'Outfit, sans-serif' }}>×1.75</span>
                  </button>
                  <button onClick={() => openBet('total_rounds', 'under', 2.05)}
                    style={{ ...pickStyle(selectedBet?.type === 'total_rounds' && selectedBet.value === 'under'), flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700' }}>Менше 26.5</span>
                    <span style={{ fontSize: '20px', fontWeight: '950', color: '#FF5C00', fontFamily: 'Outfit, sans-serif' }}>×2.05</span>
                  </button>
                </div>
              </div>

              {/* My bets on this match */}
              {myBets.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '11px', color: '#8F8F9B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', fontFamily: 'Outfit' }}>
                    МОЇ СТАВКИ НА ЦЕЙ МАТЧ
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {myBets.map(b => (
                      <div key={b.id} className="esports-card" style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '11px', color: '#8F8F9B', display: 'block' }}>
                            {b.predictionType === 'winner' ? `Перемога ${b.predictedValue}` : `Тотал ${b.predictedValue === 'over' ? 'більше' : 'менше'} 26.5`}
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: '800', color: 'white' }}>
                            {b.wager.toLocaleString('uk-UA')} 🪙 × {b.odds}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          {b.status === 'pending' && <span style={{ fontSize: '10px', color: '#FF5C00', display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={10} /> У грі</span>}
                          {b.status === 'won'     && <span style={{ fontSize: '10px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle size={10} /> +{b.payout.toLocaleString('uk-UA')} 🪙</span>}
                          {b.status === 'lost'    && <span style={{ fontSize: '10px', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '4px' }}><XCircle size={10} /> Програш</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════
          FLOATING BET BOTTOM SHEET
         ══════════════════════════════════════ */}
      {betOpen && selectedBet && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setBetOpen(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
              zIndex: 100,
            }}
          />

          {/* Sheet */}
          <div style={{
            position: 'fixed', left: 0, right: 0, bottom: 0,
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '10px', color: '#8F8F9B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ваш прогноз</span>
                <p style={{ fontSize: '18px', fontWeight: '900', color: 'white', fontFamily: 'Outfit, sans-serif', marginTop: '2px' }}>
                  {selectedBet.type === 'winner'
                    ? `Перемога ${selectedBet.value}`
                    : `Тотал ${selectedBet.value === 'over' ? 'Більше' : 'Менше'} 26.5`
                  }
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '10px', color: '#8F8F9B', textTransform: 'uppercase' }}>Коефіцієнт</span>
                <p style={{ fontSize: '24px', fontWeight: '950', color: '#FF5C00', fontFamily: 'Outfit, sans-serif', marginTop: '2px' }}>
                  ×{selectedBet.odds}
                </p>
              </div>
              <button onClick={() => setBetOpen(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#8F8F9B' }}>
                <X size={20} />
              </button>
            </div>

            {/* Balance indicator */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#8F8F9B', marginBottom: '8px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Coins size={11} /> Ваш баланс</span>
              <span style={{ fontWeight: '700', color: 'white' }}>{user.balance.toLocaleString('uk-UA')} 🪙</span>
            </div>

            {/* Wager input */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input
                ref={inputRef}
                type="number"
                className="form-input"
                value={wager}
                min={1}
                max={user.balance}
                onChange={e => setWager(Math.max(0, parseInt(e.target.value) || 0))}
                style={{ flex: 1, padding: '12px 14px', fontSize: '16px', fontWeight: '800', fontFamily: 'Outfit, sans-serif' }}
              />
              {[100, 500, 1000].map(amt => (
                <button key={amt} onClick={() => setWager(Math.min(user.balance, amt))}
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', color: 'white', fontSize: '11px', fontWeight: '700', padding: '0 12px', cursor: 'pointer' }}>
                  {amt >= 1000 ? `${amt/1000}K` : amt}
                </button>
              ))}
              <button onClick={() => setWager(user.balance)}
                style={{ background: 'rgba(255,92,0,0.08)', border: '1px solid rgba(255,92,0,0.2)', borderRadius: '10px', color: '#FF5C00', fontSize: '11px', fontWeight: '800', padding: '0 12px', cursor: 'pointer' }}>
                MAX
              </button>
            </div>

            {/* Potential payout */}
            <div style={{
              background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.12)',
              borderRadius: '12px', padding: '12px 16px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: '16px',
            }}>
              <span style={{ fontSize: '12px', color: '#8F8F9B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TrendingUp size={13} color="#10B981" /> Можливий виграш
              </span>
              <span style={{ fontSize: '18px', fontWeight: '900', color: '#10B981', fontFamily: 'Outfit, sans-serif' }}>
                {wager > 0 ? Math.round(wager * selectedBet.odds).toLocaleString('uk-UA') : '–'} 🪙
              </span>
            </div>

            {/* Confirm button */}
            <button
              className="btn-primary"
              onClick={confirmBet}
              disabled={wager <= 0 || wager > user.balance}
              style={{ width: '100%', padding: '16px', fontSize: '14px', fontWeight: '900', letterSpacing: '1px' }}
            >
              ПІДТВЕРДИТИ СТАВКУ
            </button>
          </div>
        </>
      )}

      {/* ─── Webview-safe Fullscreen Overlay Render ─── */}
      {fullscreenUrl && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#000',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          {/* Close button */}
          <button
            onClick={() => setFullscreenUrl(null)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              backgroundColor: 'rgba(10, 10, 14, 0.75)',
              border: '1px solid rgba(255, 92, 0, 0.4)',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              cursor: 'pointer',
              zIndex: 100000
            }}
          >
            <X size={20} color="#FF5C00" />
          </button>

          {/* Iframe */}
          <iframe
            src={fullscreenUrl}
            width="100%"
            height="100%"
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title="Fullscreen Live Stream"
            style={{ border: 'none' }}
          />
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
