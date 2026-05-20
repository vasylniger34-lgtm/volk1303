import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ChevronLeft, Share2, Zap } from 'lucide-react';

interface MatchDetailViewProps {
  matchId: string;
  onBack: () => void;
}

export const MatchDetailView: React.FC<MatchDetailViewProps> = ({ matchId, onBack }) => {
  const { matches, placePrediction, user, showToast } = useApp();
  const match = matches.find(m => m.id === matchId);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'STATS' | 'BETS'>('OVERVIEW');

  // Betting states
  const [wager, setWager] = useState<number>(100);
  const [selectedBet, setSelectedBet] = useState<{
    type: 'winner' | 'total_rounds';
    value: string;
    odds: number;
  } | null>(null);

  if (!match) return <div style={{ padding: '20px', color: 'white' }}>Матч не знайдено</div>;

  const handlePlaceBet = () => {
    if (!selectedBet) {
      alert('Будь ласка, оберіть варіант прогнозу!');
      return;
    }
    if (wager <= 0) {
      alert('Сума ставки повинна бути більше 0!');
      return;
    }

    const success = placePrediction({
      matchId: match.id,
      tournamentName: match.tournamentName,
      teamA: match.teamA?.name || 'Team A',
      teamB: match.teamB?.name || 'Team B',
      predictionType: selectedBet.type,
      predictedValue: selectedBet.value,
      odds: selectedBet.odds,
      wager
    });

    if (success) {
      setSelectedBet(null);
    }
  };

  const isLive = match.status === 'live';
  const isFinished = match.status === 'finished';

  // Stats calculation
  const firstHalfA = Math.min(8, match.scoreA);
  const firstHalfB = Math.min(4, match.scoreB);
  const secondHalfA = Math.max(0, match.scoreA - 8);
  const secondHalfB = Math.max(0, match.scoreB - 4);

  return (
    <div className="scroll-container" style={{ paddingBottom: '120px' }}>
      
      {/* Header bar matching screenshot 6 */}
      <div className="glass-panel" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        position: 'sticky',
        top: 0,
        zIndex: 40
      }}>
        <button 
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: '#8F8F9B', cursor: 'pointer', padding: '4px' }}
        >
          <ChevronLeft size={22} />
        </button>
        
        <h3 style={{
          fontSize: '14px',
          fontWeight: '900',
          color: 'white',
          fontFamily: 'Outfit, sans-serif'
        }}>
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

      {/* Main Scorecard Arena Card */}
      <div style={{
        background: 'linear-gradient(180deg, #111116 0%, #070709 100%)',
        padding: '24px 16px',
        textAlign: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.03)'
      }}>
        <span style={{
          fontSize: '9px',
          color: '#8F8F9B',
          fontWeight: '700',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          display: 'block',
          marginBottom: '10px'
        }}>
          {match.tournamentName} • {match.roundName.toUpperCase()}
        </span>

        {/* Dynamic Teams vs row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          marginBottom: '16px'
        }}>
          {/* Team A */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '30%' }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              backgroundColor: match.teamA?.logoBg || '#4C1D95',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '900',
              color: 'white',
              fontSize: '18px',
              fontFamily: 'Outfit, sans-serif',
              border: '2px solid rgba(255,255,255,0.06)',
              boxShadow: '0 6px 16px rgba(0,0,0,0.4)',
              marginBottom: '8px'
            }}>
              {match.teamA?.logoText}
            </div>
            <span style={{ fontSize: '12px', fontWeight: '800', color: 'white', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
              {match.teamA?.name}
            </span>
          </div>

          {/* Scores */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{ fontSize: '36px', fontWeight: '900', fontFamily: 'Outfit, sans-serif', color: 'white' }}>
                {match.scoreA}
              </span>
              <span style={{ fontSize: '13px', color: '#51515E', fontWeight: '700' }}>VS</span>
              <span style={{ fontSize: '36px', fontWeight: '900', fontFamily: 'Outfit, sans-serif', color: 'white' }}>
                {match.scoreB}
              </span>
            </div>
            
            {isLive ? (
              <span className="badge-live" style={{ marginTop: '4px' }}>
                <span className="badge-live-pulse" /> LIVE
              </span>
            ) : isFinished ? (
              <span style={{
                fontSize: '8px',
                color: '#10B981',
                backgroundColor: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.15)',
                padding: '2px 8px',
                borderRadius: '4px',
                fontWeight: '900',
                marginTop: '4px'
              }}>
                МАТЧ ЗАВЕРШЕНО
              </span>
            ) : (
              <span style={{
                fontSize: '9px',
                color: '#8F8F9B',
                backgroundColor: 'rgba(255,255,255,0.02)',
                padding: '2px 8px',
                borderRadius: '4px',
                marginTop: '4px',
                fontWeight: '700'
              }}>
                ОЧІКУВАННЯ
              </span>
            )}
          </div>

          {/* Team B */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '30%' }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              backgroundColor: match.teamB?.logoBg || '#1E293B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '900',
              color: 'white',
              fontSize: '18px',
              fontFamily: 'Outfit, sans-serif',
              border: '2px solid rgba(255,255,255,0.06)',
              boxShadow: '0 6px 16px rgba(0,0,0,0.4)',
              marginBottom: '8px'
            }}>
              {match.teamB?.logoText}
            </div>
            <span style={{ fontSize: '12px', fontWeight: '800', color: 'white', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
              {match.teamB?.name}
            </span>
          </div>
        </div>

        {/* Map and BO stats */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '11px', color: '#8F8F9B', marginTop: '10px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Zap size={11} color="#FF5C00" /> {match.map}
          </span>
          <span>BO3 систем</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-header" style={{ padding: '0 16px', margin: '14px 0' }}>
        {[
          { id: 'OVERVIEW', label: 'Огляд' },
          { id: 'STATS', label: 'Статистика' },
          { id: 'BETS', label: 'Ставки' }
        ].map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'tab-btn-active' : ''}`}
            onClick={() => setActiveTab(tab.id as any)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'OVERVIEW' && (
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Map stats card matching image 6 */}
          <div className="esports-card" style={{ 
            padding: '20px 16px',
            background: 'linear-gradient(180deg, rgba(255, 92, 0, 0.06) 0%, rgba(16, 16, 22, 0.98) 100%)',
            border: '1px solid rgba(255, 92, 0, 0.25)',
            boxShadow: '0 8px 32px rgba(255, 92, 0, 0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '11px', color: 'white', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={12} color="#FF5C00" fill="#FF5C00" /> {match.map}
              </span>
              <span style={{ fontSize: '13px', fontWeight: '800', color: '#FF5C00', fontFamily: 'Outfit, sans-serif' }}>
                {match.scoreA} : {match.scoreB}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', fontSize: '11px' }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ color: '#51515E', display: 'block', marginBottom: '2px' }}>1st half</span>
                <span style={{ fontWeight: '700', color: 'white' }}>{firstHalfA} : {firstHalfB}</span>
              </div>
              <div style={{ height: '20px', width: '1px', backgroundColor: 'rgba(255,255,255,0.05)' }} />
              <div style={{ textAlign: 'center' }}>
                <span style={{ color: '#51515E', display: 'block', marginBottom: '2px' }}>2nd half</span>
                <span style={{ fontWeight: '700', color: 'white' }}>{secondHalfA} : {secondHalfB}</span>
              </div>
            </div>
          </div>

          {/* Quick Winner Bets Panel directly on Overview tab */}
          {!isFinished && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h4 style={{ fontSize: '11px', color: '#8F8F9B', textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'Outfit, sans-serif', fontWeight: '800' }}>
                ШВИДКИЙ ПРЕДИКТ ПЕРЕМОЖЦЯ
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button 
                  onClick={() => {
                    setActiveTab('BETS');
                    setSelectedBet({ type: 'winner', value: match.teamA?.name || '', odds: match.oddsA });
                  }}
                  className="esports-card"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    padding: '14px',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: '800' }}>{match.teamA?.name}</span>
                  <span style={{ fontSize: '13px', fontWeight: '900', color: '#FF5C00', fontFamily: 'Outfit, sans-serif' }}>
                    {match.oddsA}
                  </span>
                </button>
                <button 
                  onClick={() => {
                    setActiveTab('BETS');
                    setSelectedBet({ type: 'winner', value: match.teamB?.name || '', odds: match.oddsB });
                  }}
                  className="esports-card"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    padding: '14px',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: '800' }}>{match.teamB?.name}</span>
                  <span style={{ fontSize: '13px', fontWeight: '900', color: '#FF5C00', fontFamily: 'Outfit, sans-serif' }}>
                    {match.oddsB}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Live Simulator Logs */}
          <div className="esports-card" style={{ padding: '16px' }}>
            <h4 style={{ fontSize: '11px', color: '#8F8F9B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
              ХРОНОЛОГІЯ МАТЧУ
            </h4>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              maxHeight: '180px',
              overflowY: 'auto',
              fontSize: '11px',
              color: '#8F8F9B'
            }}>
              {match.liveLogs.length > 0 ? (
                [...match.liveLogs].reverse().map((log, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    borderBottom: '1px solid rgba(255,255,255,0.01)',
                    paddingBottom: '6px'
                  }}>
                    <span style={{ color: '#FF5C00' }}>•</span>
                    <span>{log}</span>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', color: '#51515E', padding: '20px 0' }}>
                  Очікування старту гри...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STATS TAB */}
      {activeTab === 'STATS' && (
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="esports-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 style={{ fontSize: '11px', color: '#8F8F9B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ПОРІВНЯЛЬНА СТАТИСТИКА
            </h4>

            {[
              { label: 'Середній K/D', valA: '1.24', valB: '1.02', pct: 60 },
              { label: 'Клатчі 1vX', valA: '4', valB: '2', pct: 68 },
              { label: 'Перші вбивства (First Blood)', valA: '11', valB: '8', pct: 58 },
              { label: 'Вінрейт на карті', valA: '78%', valB: '54%', pct: 62 }
            ].map((stat, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span style={{ fontWeight: '700', color: 'white' }}>{stat.valA}</span>
                  <span style={{ color: '#8F8F9B' }}>{stat.label}</span>
                  <span style={{ fontWeight: '700', color: 'white' }}>{stat.valB}</span>
                </div>
                {/* Stats Bar */}
                <div style={{
                  height: '6px',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  borderRadius: '3px',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: `${stat.pct}%`,
                    backgroundColor: '#FF5C00',
                    borderRadius: '3px'
                  }} />
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    height: '100%',
                    width: `${100 - stat.pct}%`,
                    backgroundColor: '#8B5CF6'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BETS TAB */}
      {activeTab === 'BETS' && (
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {isFinished ? (
            <div className="esports-card" style={{ padding: '20px', textAlign: 'center', color: '#51515E', fontSize: '12px' }}>
              Прийом ставок на цей матч закрито (матч завершено).
            </div>
          ) : (
            <>
              {/* Option 1: Match Winner */}
              <div>
                <h4 style={{ fontSize: '11px', color: '#8F8F9B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                  ПЕРЕМОЖЕЦЬ МАТЧУ
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {/* Bet Team A */}
                  <button 
                    onClick={() => setSelectedBet({ type: 'winner', value: match.teamA?.name || '', odds: match.oddsA })}
                    style={{
                      background: selectedBet?.type === 'winner' && selectedBet.value === match.teamA?.name ? 'rgba(255,92,0,0.1)' : 'rgba(255,255,255,0.02)',
                      border: selectedBet?.type === 'winner' && selectedBet.value === match.teamA?.name ? '1px solid #FF5C00' : '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '12px',
                      padding: '14px',
                      color: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: '700' }}>{match.teamA?.name}</span>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#FF5C00', fontFamily: 'Outfit, sans-serif' }}>
                      {match.oddsA}
                    </span>
                  </button>

                  {/* Bet Team B */}
                  <button 
                    onClick={() => setSelectedBet({ type: 'winner', value: match.teamB?.name || '', odds: match.oddsB })}
                    style={{
                      background: selectedBet?.type === 'winner' && selectedBet.value === match.teamB?.name ? 'rgba(255,92,0,0.1)' : 'rgba(255,255,255,0.02)',
                      border: selectedBet?.type === 'winner' && selectedBet.value === match.teamB?.name ? '1px solid #FF5C00' : '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '12px',
                      padding: '14px',
                      color: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: '700' }}>{match.teamB?.name}</span>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#FF5C00', fontFamily: 'Outfit, sans-serif' }}>
                      {match.oddsB}
                    </span>
                  </button>
                </div>
              </div>

              {/* Option 2: Total Rounds */}
              <div>
                <h4 style={{ fontSize: '11px', color: '#8F8F9B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                  ТОТАЛ РАУНДІВ
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {/* Over 26.5 */}
                  <button 
                    onClick={() => setSelectedBet({ type: 'total_rounds', value: 'over', odds: 1.75 })}
                    style={{
                      background: selectedBet?.type === 'total_rounds' && selectedBet.value === 'over' ? 'rgba(255,92,0,0.1)' : 'rgba(255,255,255,0.02)',
                      border: selectedBet?.type === 'total_rounds' && selectedBet.value === 'over' ? '1px solid #FF5C00' : '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '12px',
                      padding: '14px',
                      color: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: '700' }}>Більше 26.5</span>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#FF5C00', fontFamily: 'Outfit, sans-serif' }}>
                      1.75
                    </span>
                  </button>

                  {/* Under 26.5 */}
                  <button 
                    onClick={() => setSelectedBet({ type: 'total_rounds', value: 'under', odds: 2.05 })}
                    style={{
                      background: selectedBet?.type === 'total_rounds' && selectedBet.value === 'under' ? 'rgba(255,92,0,0.1)' : 'rgba(255,255,255,0.02)',
                      border: selectedBet?.type === 'total_rounds' && selectedBet.value === 'under' ? '1px solid #FF5C00' : '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '12px',
                      padding: '14px',
                      color: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: '700' }}>Менше 26.5</span>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#FF5C00', fontFamily: 'Outfit, sans-serif' }}>
                      2.05
                    </span>
                  </button>
                </div>
              </div>

              {/* Prediction details & wager input */}
              {selectedBet && (
                <div className="esports-card orange-glow" style={{
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  border: '1px solid rgba(255,92,0,0.2)'
                }}>
                  {/* Selected label */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '8px', color: '#8F8F9B', textTransform: 'uppercase' }}>Прогноз</span>
                      <span style={{ fontSize: '14px', fontWeight: '800', color: 'white', display: 'block' }}>
                        {selectedBet.type === 'winner' ? `Перемога ${selectedBet.value}` : `Тотал ${selectedBet.value === 'over' ? 'Більше' : 'Менше'} 26.5`}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '8px', color: '#8F8F9B', textTransform: 'uppercase', display: 'block', textAlign: 'right' }}>Коефіцієнт</span>
                      <span style={{ fontSize: '16px', fontWeight: '900', color: '#FF5C00', fontFamily: 'Outfit, sans-serif' }}>
                        {selectedBet.odds}
                      </span>
                    </div>
                  </div>

                  {/* Input wager */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#8F8F9B' }}>
                      <span>Сума ставки (монетки)</span>
                      <span>Доступно: {user.balance.toLocaleString('uk-UA')} 🪙</span>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="number"
                        className="form-input"
                        value={wager}
                        onChange={(e) => setWager(Math.max(0, parseInt(e.target.value) || 0))}
                        style={{ flex: 1, padding: '10px 14px' }}
                      />
                      
                      {/* Quick options */}
                      {['+100', '+500', 'Max'].map((opt) => (
                        <button
                          key={opt}
                          onClick={() => {
                            if (opt === 'Max') setWager(user.balance);
                            else setWager(prev => Math.min(user.balance, prev + parseInt(opt.replace('+', ''))));
                          }}
                          style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            borderRadius: '10px',
                            color: 'white',
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '0 12px',
                            cursor: 'pointer'
                          }}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Payout calculation */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid rgba(255,255,255,0.03)',
                    paddingTop: '12px',
                    fontSize: '13px'
                  }}>
                    <span style={{ color: '#8F8F9B', fontWeight: '500' }}>Можливий виграш</span>
                    <span style={{ fontWeight: '900', color: '#10B981', fontFamily: 'Outfit, sans-serif' }}>
                      {Math.round(wager * selectedBet.odds).toLocaleString('uk-UA')} 🪙
                    </span>
                  </div>

                  {/* Giant place bet button */}
                  <button 
                    className="btn-primary" 
                    onClick={handlePlaceBet}
                    style={{ width: '100%', padding: '14px' }}
                  >
                    ПОСТАВИТИ ПРЕДИКТ
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

    </div>
  );
};
