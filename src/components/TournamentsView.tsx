import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Calendar, ShieldAlert } from 'lucide-react';

interface TournamentsViewProps {
  onSelectTournament: (id: string) => void;
}

export const TournamentsView: React.FC<TournamentsViewProps> = ({ onSelectTournament }) => {
  const { tournaments } = useApp();
  const [activeTab, setActiveTab] = useState<'BCI' | '2X2' | '4X4'>('BCI');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtering
  const filteredTourneys = tournaments.filter(t => {
    // Type tab filter
    const matchesTab = activeTab === 'BCI' || t.type === activeTab;
    
    // Search query filter
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.map.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  return (
    <div className="scroll-container" style={{ padding: '16px 20px' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '900', textTransform: 'uppercase', fontFamily: 'Outfit, sans-serif', color: 'white', letterSpacing: '0.5px' }}>
          ТУРНІРИ
        </h2>
        {/* Sleek search box */}
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            placeholder="Пошук карти, назви..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
            style={{
              padding: '10px 16px 10px 36px',
              fontSize: '12px'
            }}
          />
          <Search size={14} color="#8F8F9B" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-header" style={{ marginBottom: '22px' }}>
        {(['BCI', '2X2', '4X4'] as const).map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'tab-btn-active' : ''}`}
            onClick={() => setActiveTab(tab)}
            style={{ fontSize: '12px', fontWeight: '800' }}
          >
            {tab === 'BCI' ? 'ВСІ' : tab}
          </button>
        ))}
      </div>

      {/* Tournaments List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {filteredTourneys.length > 0 ? (
          filteredTourneys.map((tourney) => {
            const isFull = tourney.participantsCount >= tourney.maxParticipants;
            
            return (
              <div
                key={tourney.id}
                onClick={() => onSelectTournament(tourney.id)}
                className="esports-card"
                style={{
                  padding: '18px 20px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  background: 'var(--card-bg)'
                }}
              >
                {/* Top Row: Type and participants ratio */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '900',
                    color: tourney.type === '2X2' ? 'var(--accent-purple)' : 'var(--primary-orange)',
                    backgroundColor: tourney.type === '2X2' ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255, 92, 0, 0.08)',
                    border: `1px solid ${tourney.type === '2X2' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 92, 0, 0.15)'}`,
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontFamily: 'Outfit, sans-serif'
                  }}>
                    {tourney.type}
                  </span>
                  
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '800',
                    color: isFull ? 'var(--live-color)' : 'var(--text-secondary)',
                    fontFamily: 'Outfit, sans-serif'
                  }}>
                    {tourney.participantsCount}/{tourney.maxParticipants} УЧАСНИКІВ
                  </span>
                </div>

                {/* Middle details */}
                <div>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '800',
                    color: 'white',
                    marginBottom: '6px',
                    fontFamily: 'Outfit, sans-serif',
                    letterSpacing: '0.3px'
                  }}>
                    {tourney.name}
                  </h3>
                  <span style={{ fontSize: '11px', color: '#8F8F9B', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}>
                    <Calendar size={13} color="var(--primary-orange)" /> {tourney.date}
                  </span>
                </div>

                {/* Bottom Row: Prize pool and Map */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                  paddingTop: '12px',
                  fontSize: '12px'
                }}>
                  <div>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '2px' }}>
                      Призовий фонд
                    </span>
                    <span style={{ fontWeight: '800', color: '#fff', fontFamily: 'Outfit, sans-serif', fontSize: '13px' }}>
                      {tourney.prizePool}
                    </span>
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '2px' }}>
                      Карта
                    </span>
                    <span style={{ fontWeight: '800', color: '#fff', fontFamily: 'Outfit, sans-serif', fontSize: '13px' }}>
                      {tourney.map}
                    </span>
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
            color: 'var(--text-muted)',
            gap: '12px'
          }}>
            <ShieldAlert size={42} color="var(--text-muted)" />
            <span style={{ fontSize: '13px', fontWeight: '600' }}>Турнірів за даним запитом не знайдено</span>
          </div>
        )}
      </div>

    </div>
  );
};

