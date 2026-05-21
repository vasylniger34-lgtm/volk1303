import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Tv, ExternalLink, Zap, Clock, Maximize2, X } from 'lucide-react';

interface StreamsViewProps {
  onSelectMatch?: (id: string) => void;
}

// Converts any YouTube / Twitch URL to an embeddable iframe src
function getEmbedUrl(url: string): string | null {
  if (!url) return null;
  const cleanUrl = url.trim();

  // YouTube: youtu.be/ID or youtube.com/watch?v=ID or youtube.com/live/ID
  const ytShort = cleanUrl.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  const ytFull  = cleanUrl.match(/youtube\.com\/(?:watch\?v=|live\/)([a-zA-Z0-9_-]{11})/);
  const ytId = (ytShort || ytFull)?.[1];
  if (ytId) return `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=0`;

  // Twitch channel: twitch.tv/CHANNEL
  const twCh = cleanUrl.match(/twitch\.tv\/([a-zA-Z0-9_]+)/);
  if (twCh) return `https://player.twitch.tv/?channel=${twCh[1]}&parent=${window.location.hostname}&autoplay=true`;

  return null;
}

export const StreamsView: React.FC<StreamsViewProps> = ({ onSelectMatch }) => {
  const { matches, tournaments } = useApp();
  const [fullscreenUrl, setFullscreenUrl] = useState<string | null>(null);

  // Parse list of streams from all tournaments
  const getStreamUrls = (streamStr: string): string[] => {
    if (!streamStr) return [];
    return streamStr.split(/[\s,]+/).map(url => url.trim()).filter(Boolean);
  };

  // Find all active matches with stream URLs
  const activeStreamMatches = matches
    .filter(m => m.status === 'live')
    .map(match => {
      const tourney = tournaments.find(t => t.id === match.tournamentId);
      const urls = getStreamUrls(tourney?.streamUrl || '');
      return {
        match,
        tourney,
        urls
      };
    })
    .filter(item => item.urls.length > 0);

  // Find upcoming matches with stream URLs
  const upcomingStreamMatches = matches
    .filter(m => m.status === 'scheduled')
    .map(match => {
      const tourney = tournaments.find(t => t.id === match.tournamentId);
      const urls = getStreamUrls(tourney?.streamUrl || '');
      return {
        match,
        tourney,
        urls
      };
    })
    .filter(item => item.urls.length > 0);

  return (
    <div className="scroll-container" style={{ padding: '16px 20px 120px 20px' }}>
      
      {/* View Title */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(255, 92, 0, 0.15), rgba(255, 92, 0, 0.05))',
          border: '1px solid rgba(255, 92, 0, 0.25)',
          display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center'
        }}>
          <Tv size={18} color="#FF5C00" />
        </div>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '900', fontFamily: 'Outfit, sans-serif', color: 'white', letterSpacing: '0.5px' }}>
            СТРІМИ ТА ТРАНСЛЯЦІЇ
          </h2>
          <p style={{ fontSize: '11px', color: '#8F8F9B', marginTop: '2px' }}>
            Дивись матчі наживо та підтримуй улюблені команди
          </p>
        </div>
      </div>

      {/* ─── LIVE STREAMS SECTION ─── */}
      <h3 style={{
        fontSize: '11px', fontWeight: '900', color: '#FF5C00',
        letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '14px',
        display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'Outfit'
      }}>
        <span className="badge-live-pulse" style={{ display: 'inline-block', position: 'static', transform: 'none', width: '6px', height: '6px' }} />
        АКТИВНІ ЕФІРИ
      </h3>

      {activeStreamMatches.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {activeStreamMatches.map(({ match, urls }) => (
            <div 
              key={match.id}
              className="esports-card orange-glow"
              style={{
                border: '1px solid rgba(255, 92, 0, 0.2)',
                background: 'linear-gradient(180deg, rgba(20, 10, 5, 0.4) 0%, rgba(10, 10, 14, 0.98) 100%)',
                padding: '16px',
                borderRadius: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              {/* Scoreboard Info inside card */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#8F8F9B' }}>
                <span style={{ fontWeight: '800', color: 'white' }}>{match.tournamentName}</span>
                <span style={{
                  fontSize: '9px', fontWeight: '900', color: '#FF5C00',
                  backgroundColor: 'rgba(255, 92, 0, 0.1)', border: '1px solid rgba(255, 92, 0, 0.2)',
                  padding: '2px 8px', borderRadius: '4px'
                }}>
                  {match.roundName.toUpperCase()}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '40%' }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    backgroundColor: match.teamA?.logoBg || '#4C1D95',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: '900', color: 'white', fontSize: '11px', fontFamily: 'Outfit'
                  }}>
                    {match.teamA?.logoText}
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {match.teamA?.name}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px', fontWeight: '900', color: 'white', fontFamily: 'Outfit' }}>{match.scoreA}</span>
                  <span style={{ fontSize: '12px', color: '#51515E', fontWeight: '700' }}>:</span>
                  <span style={{ fontSize: '18px', fontWeight: '900', color: 'white', fontFamily: 'Outfit' }}>{match.scoreB}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '40%', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {match.teamB?.name}
                  </span>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    backgroundColor: match.teamB?.logoBg || '#1E293B',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: '900', color: 'white', fontSize: '11px', fontFamily: 'Outfit'
                  }}>
                    {match.teamB?.logoText}
                  </div>
                </div>
              </div>

              {/* Stream Players */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {urls.slice(0, 2).map((url, index) => {
                  const embedUrl = getEmbedUrl(url);
                  return (
                    <div key={index} style={{ position: 'relative' }}>
                      {embedUrl ? (
                        <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)', position: 'relative' }}>
                          <iframe
                            src={embedUrl}
                            width="100%"
                            height="180"
                            frameBorder="0"
                            allow="autoplay; fullscreen; picture-in-picture"
                            allowFullScreen
                            title={`Stream ${index + 1}`}
                            style={{ display: 'block' }}
                          />
                          {/* Fullscreen Overlay Button */}
                          <button
                            onClick={() => setFullscreenUrl(embedUrl)}
                            style={{
                              position: 'absolute',
                              bottom: '10px',
                              right: '10px',
                              backgroundColor: 'rgba(10, 10, 14, 0.85)',
                              border: '1px solid rgba(255, 92, 0, 0.4)',
                              borderRadius: '8px',
                              color: '#fff',
                              padding: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              zIndex: 10
                            }}
                            title="Fullscreen Overlay"
                          >
                            <Maximize2 size={14} color="#FF5C00" />
                          </button>
                        </div>
                      ) : (
                        <div className="esports-card" style={{ padding: '16px', textAlign: 'center', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)' }}>
                          <p style={{ fontSize: '11px', color: '#8F8F9B', marginBottom: '8px' }}>Вбудований плеєр недоступний для цього посилання</p>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '6px',
                              backgroundColor: 'rgba(255, 92, 0, 0.1)', border: '1px solid rgba(255, 92, 0, 0.3)',
                              borderRadius: '8px', padding: '6px 12px',
                              color: '#FF5C00', fontWeight: '800', fontSize: '10px', textDecoration: 'none',
                            }}
                          >
                            <ExternalLink size={12} /> Посилання {urls.length > 1 ? `#${index + 1}` : ''}
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                {onSelectMatch && (
                  <button
                    onClick={() => onSelectMatch(match.id)}
                    style={{
                      flex: 1,
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      color: 'white',
                      padding: '10px',
                      fontSize: '11px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Zap size={12} color="#FF5C00" fill="#FF5C00" /> ДЕТАЛІ ТА СТАВКИ
                  </button>
                )}
                <a
                  href={urls[0]}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #FF5C00 0%, #B83C00 100%)',
                    borderRadius: '12px',
                    color: 'white',
                    padding: '10px',
                    fontSize: '11px',
                    fontWeight: '800',
                    textAlign: 'center',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <ExternalLink size={12} /> ВІДКРИТИ НА TWITCH/YT
                </a>
              </div>

            </div>
          ))}
        </div>
      ) : (
        <div 
          className="esports-card" 
          style={{
            padding: '36px 20px',
            textAlign: 'center',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.01) 0%, rgba(10,10,14,0.3) 100%)',
            border: '1px solid rgba(255,255,255,0.03)',
            borderRadius: '20px',
            marginBottom: '24px'
          }}
        >
          <Tv size={32} color="#51515E" style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#8F8F9B', marginBottom: '4px' }}>НЕМАЄ АКТИВНИХ ЕФІРІВ</h4>
          <p style={{ fontSize: '10px', color: '#51515E', maxWidth: '240px', margin: '0 auto' }}>
            Наразі немає матчів, що проходять у прямому ефірі. Завітайте сюди під час початку ігор!
          </p>
        </div>
      )}

      {/* ─── UPCOMING STREAMS SECTION ─── */}
      <h3 style={{
        fontSize: '11px', fontWeight: '900', color: '#8F8F9B',
        letterSpacing: '1px', textTransform: 'uppercase', marginTop: '24px', marginBottom: '14px',
        display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'Outfit'
      }}>
        <Clock size={12} color="#8F8F9B" />
        АНОНСИ ТРАНСЛЯЦІЙ
      </h3>

      {upcomingStreamMatches.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {upcomingStreamMatches.map(({ match }) => (
            <div 
              key={match.id}
              className="esports-card"
              style={{
                padding: '14px 16px',
                borderRadius: '16px',
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid rgba(255,255,255,0.04)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ width: '60%' }}>
                <span style={{ fontSize: '8px', color: '#8F8F9B', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                  {match.tournamentName} • {match.roundName}
                </span>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'white', display: 'block' }}>
                  {match.teamA?.name || 'Очікування'} vs {match.teamB?.name || 'Очікування'}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{
                  fontSize: '9px', fontWeight: '800', color: '#FF5C00',
                  backgroundColor: 'rgba(255, 92, 0, 0.08)', padding: '4px 8px', borderRadius: '6px',
                  border: '1px solid rgba(255, 92, 0, 0.15)', display: 'inline-block'
                }}>
                  {match.time || 'Сьогодні'}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', color: '#51515E', fontSize: '11px', padding: '16px 0' }}>
          Немає запланованих трансляцій на найближчий час.
        </div>
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

    </div>
  );
};
