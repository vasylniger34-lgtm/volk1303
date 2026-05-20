import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Landmark, Clock } from 'lucide-react';

export const BetsView: React.FC = () => {
  const { predictions } = useApp();
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');

  const activePredictions = predictions.filter(p => p.status === 'pending');
  const pastPredictions = predictions.filter(p => p.status !== 'pending');

  const currentList = activeTab === 'ACTIVE' ? activePredictions : pastPredictions;

  return (
    <div className="scroll-container" style={{ padding: '16px' }}>
      
      {/* Header */}
      <h2 style={{
        fontSize: '18px',
        fontWeight: '800',
        textTransform: 'uppercase',
        fontFamily: 'Outfit, sans-serif',
        marginBottom: '16px'
      }}>
        Мої предикти
      </h2>

      {/* Tabs */}
      <div className="tabs-header" style={{ marginBottom: '20px' }}>
        <button
          className={`tab-btn ${activeTab === 'ACTIVE' ? 'tab-btn-active' : ''}`}
          onClick={() => setActiveTab('ACTIVE')}
        >
          Активні ({activePredictions.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'HISTORY' ? 'tab-btn-active' : ''}`}
          onClick={() => setActiveTab('HISTORY')}
        >
          Історія ({pastPredictions.length})
        </button>
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {currentList.length > 0 ? (
          currentList.map((pred) => {
            const isWon = pred.status === 'won';
            const isLost = pred.status === 'lost';
            const isPending = pred.status === 'pending';

            return (
              <div 
                key={pred.id} 
                className="esports-card" 
                style={{
                  padding: '16px',
                  border: isWon ? '1px solid rgba(16, 185, 129, 0.2)' : isLost ? '1px solid rgba(255, 255, 255, 0.02)' : '1px solid rgba(255, 92, 0, 0.15)',
                  background: isWon 
                    ? 'linear-gradient(135deg, #0e0e13 0%, rgba(16, 185, 129, 0.02) 100%)' 
                    : isLost 
                      ? '#0e0e13'
                      : 'linear-gradient(135deg, #0e0e13 0%, rgba(255, 92, 0, 0.02) 100%)'
                }}
              >
                {/* Match title and date */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '9px', color: '#8F8F9B', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    {pred.tournamentName}
                  </span>
                  <span style={{ fontSize: '9px', color: '#51515E' }}>
                    {pred.date}
                  </span>
                </div>

                {/* Teams VS row */}
                <h4 style={{ fontSize: '13px', fontWeight: '800', color: 'white', marginBottom: '8px' }}>
                  {pred.teamA} VS {pred.teamB}
                </h4>

                {/* Bet selection details */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255,255,255,0.01)',
                  border: '1px solid rgba(255,255,255,0.02)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '11px',
                  marginBottom: '12px'
                }}>
                  <div>
                    <span style={{ color: '#8F8F9B', display: 'block', fontSize: '8px', textTransform: 'uppercase' }}>Прогноз</span>
                    <span style={{ fontWeight: '700', color: 'white' }}>
                      {pred.predictionType === 'winner' ? `Перемога: ${pred.predictedValue}` : `Тотал: ${pred.predictedValue === 'over' ? 'Більше' : 'Менше'} 26.5`}
                    </span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: '#8F8F9B', display: 'block', fontSize: '8px', textTransform: 'uppercase' }}>Коеф</span>
                    <span style={{ fontWeight: '800', color: '#FF5C00', fontFamily: 'Outfit, sans-serif' }}>
                      {pred.odds}
                    </span>
                  </div>
                </div>

                {/* Bottom Row: Payout and Status */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '1px solid rgba(255, 255, 255, 0.03)',
                  paddingTop: '10px'
                }}>
                  <div>
                    <span style={{ fontSize: '9px', color: '#51515E', textTransform: 'uppercase', display: 'block' }}>
                      Сума предикту
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'white', fontFamily: 'Outfit, sans-serif' }}>
                      {pred.wager.toLocaleString('uk-UA')} 🪙
                    </span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    {isPending ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#FF5C00', fontSize: '11px', fontWeight: '800' }}>
                        <Clock size={12} /> ОЧІКУВАННЯ
                      </div>
                    ) : isWon ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ fontSize: '9px', color: '#10B981', fontWeight: '800' }}>ВИГРАШ 🎉</span>
                        <span style={{ fontSize: '13px', fontWeight: '900', color: '#10B981', fontFamily: 'Outfit, sans-serif' }}>
                          +{pred.payout.toLocaleString('uk-UA')} 🪙
                        </span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ fontSize: '9px', color: '#EF4444', fontWeight: '800' }}>ПРОГРАШ 💀</span>
                        <span style={{ fontSize: '11px', fontWeight: '600', color: '#51515E', fontFamily: 'Outfit, sans-serif' }}>
                          -{pred.wager.toLocaleString('uk-UA')} 🪙
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 20px',
            color: '#51515E',
            gap: '8px',
            textAlign: 'center'
          }}>
            <Landmark size={36} />
            <span style={{ fontSize: '12px' }}>
              {activeTab === 'ACTIVE' 
                ? 'У вас немає активних предиктів. Поставте на LIVE матч!' 
                : 'Історія предиктів порожня.'}
            </span>
          </div>
        )}
      </div>

    </div>
  );
};
