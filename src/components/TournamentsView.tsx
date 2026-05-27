import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Calendar, ShieldAlert, Trash2 } from 'lucide-react';

interface TournamentsViewProps {
  onSelectTournament: (id: string) => void;
}

export const getFormatBadgeStyle = (type: string) => {
  switch (type) {
    case '2X2':
      return {
        color: 'var(--accent-purple)',
        bg: 'rgba(139, 92, 246, 0.08)',
        border: 'rgba(139, 92, 246, 0.15)'
      };
    case '3X3':
      return {
        color: 'var(--accent-green)',
        bg: 'rgba(16, 185, 129, 0.08)',
        border: 'rgba(16, 185, 129, 0.15)'
      };
    case '4X4':
      return {
        color: 'var(--primary-orange)',
        bg: 'rgba(255, 92, 0, 0.08)',
        border: 'rgba(255, 92, 0, 0.15)'
      };
    case '5X5':
      return {
        color: '#06B6D4',
        bg: 'rgba(6, 182, 212, 0.08)',
        border: 'rgba(6, 182, 212, 0.15)'
      };
    default:
      return {
        color: 'var(--text-secondary)',
        bg: 'rgba(144, 144, 156, 0.08)',
        border: 'rgba(144, 144, 156, 0.15)'
      };
  }
};

export const TournamentsView: React.FC<TournamentsViewProps> = ({ onSelectTournament }) => {
  const { tournaments, deleteTournament, user, matches } = useApp();
  const isAdmin = user.role === 'admin';
  const [activeTab, setActiveTab] = useState<'ALL' | '2X2' | '3X3' | '4X4' | '5X5'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const parseTourneyDate = (dateStr: string): number => {
    if (!dateStr) return Infinity;
    const lower = dateStr.trim().toLowerCase();
    
    // Try standard JS Date parsing first
    const parsedTime = Date.parse(dateStr);
    if (!isNaN(parsedTime)) return parsedTime;

    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth();
    let day = now.getDate();
    let hours = 12;
    let minutes = 0;

    let dateParsed = false;

    // Time matching
    const timeMatch = lower.match(/(?:^|\s|,)(\d{1,2}):(\d{2})\b/);
    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10);
      minutes = parseInt(timeMatch[2], 10);
    }

    // Relative date matching
    if (lower.includes('сьогодні') || lower.includes('сегодня')) {
      dateParsed = true;
    } else if (lower.includes('завтра')) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      year = tomorrow.getFullYear();
      month = tomorrow.getMonth();
      day = tomorrow.getDate();
      dateParsed = true;
    }

    // Numerical date parsing
    if (!dateParsed) {
      const numericMatch = lower.match(/\b(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?\b/);
      if (numericMatch) {
        day = parseInt(numericMatch[1], 10);
        month = parseInt(numericMatch[2], 10) - 1;
        if (numericMatch[3]) {
          let yr = parseInt(numericMatch[3], 10);
          if (yr < 100) yr += 2000;
          year = yr;
        } else {
          year = now.getFullYear();
        }
        dateParsed = true;
      }
    }

    // Ukrainian/Russian month names
    if (!dateParsed) {
      const monthsMap: Record<string, number> = {
        'січ': 0, 'янв': 0, 'лют': 1, 'фев': 1, 'бер': 2, 'мар': 2,
        'кві': 3, 'апр': 3, 'тра': 4, 'мая': 4, 'май': 4, 'чер': 5, 'июн': 5,
        'лип': 6, 'июл': 6, 'сер': 7, 'авг': 7, 'вер': 8, 'сен': 8,
        'жов': 9, 'окт': 9, 'лис': 10, 'ноя': 10, 'гру': 11, 'дек': 11
      };

      const dayMatch = lower.match(/\b(\d{1,2})\b/);
      if (dayMatch) {
        day = parseInt(dayMatch[1], 10);
        let foundMonth = -1;
        for (const key of Object.keys(monthsMap)) {
          if (lower.includes(key)) {
            foundMonth = monthsMap[key];
            break;
          }
        }
        if (foundMonth !== -1) {
          month = foundMonth;
          const yearMatch = lower.match(/\b(20\d{2})\b/);
          if (yearMatch) {
            year = parseInt(yearMatch[1], 10);
          } else {
            year = now.getFullYear();
          }
          dateParsed = true;
        }
      }
    }

    const resultDate = new Date(year, month, day, hours, minutes, 0, 0);
    if (dateParsed && !lower.match(/\b\d{4}\b/) && !lower.includes('сьогодні') && !lower.includes('сегодня') && !lower.includes('завтра')) {
      const timeDiff = resultDate.getTime() - now.getTime();
      if (timeDiff < -24 * 60 * 60 * 1000) {
        resultDate.setFullYear(year + 1);
      }
    }

    return resultDate.getTime();
  };

  const isTournamentCompleted = (t: any): boolean => {
    if (t.status === 'completed') return true;
    const tourneyMatches = matches.filter(m => m.tournamentId === t.id);
    return tourneyMatches.length > 0 && tourneyMatches.every(m => m.status === 'finished');
  };

  const getSortScore = (t: any): number => {
    const timestamp = parseTourneyDate(t.date);
    if (t.status === 'active' && !isTournamentCompleted(t)) return -1000000000000 + timestamp;
    if (t.status === 'upcoming' && !isTournamentCompleted(t)) return timestamp;
    return 1000000000000 - timestamp;
  };

  // Filtering and sorting
  const filteredTourneys = tournaments
    .filter(t => {
      // Type tab filter
      const matchesTab = activeTab === 'ALL' || t.type === activeTab;
      
      // Search query filter
      const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            t.map.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesTab && matchesSearch;
    })
    .sort((a, b) => getSortScore(a) - getSortScore(b));

  return (
    <div className="scroll-container" style={{ padding: '16px 20px 120px 20px' }}>
      
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
        {(['ALL', '2X2', '3X3', '4X4', '5X5'] as const).map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'tab-btn-active' : ''}`}
            onClick={() => setActiveTab(tab)}
            style={{ fontSize: '12px', fontWeight: '800' }}
          >
            {tab === 'ALL' ? 'ВСІ' : tab}
          </button>
        ))}
      </div>

      {/* Tournaments List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {filteredTourneys.length > 0 ? (
          filteredTourneys.map((tourney) => {
            const isFull = tourney.participantsCount >= tourney.maxParticipants;
            const badgeStyle = getFormatBadgeStyle(tourney.type);
            
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
                    color: badgeStyle.color,
                    backgroundColor: badgeStyle.bg,
                    border: `1px solid ${badgeStyle.border}`,
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
                    {isAdmin && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Видалити турнір ${tourney.name}?`)) deleteTournament(tourney.id);
                        }}
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
                          borderRadius: '6px', padding: '6px', color: '#EF4444', cursor: 'pointer', zIndex: 10
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
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

