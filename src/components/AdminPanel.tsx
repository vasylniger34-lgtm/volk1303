import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Match } from '../context/AppContext';
import { 
  Play, 
  Settings, 
  Plus, 
  RefreshCw, 
  CheckCircle, 
  Trophy, 
  LogOut, 
  ShieldAlert,
  ArrowLeft,
  ChevronRight,
  Flame
} from 'lucide-react';

interface AdminPanelProps {
  onExitAdmin?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onExitAdmin }) => {
  const { 
    user, 
    tournaments, 
    matches, 
    setMatchLive, 
    setMatchScore, 
    createTournament, 
    generateBracketForTournament 
  } = useApp();

  // Selected tournament to manage brackets
  const [selectedTourneyId, setSelectedTourneyId] = useState<string>(
    tournaments[0]?.id || ''
  );

  // Active Tab on Mobile (to easily fit sidebar vs visual grid on phone sizes)
  const [activeMobileTab, setActiveMobileTab] = useState<'settings' | 'bracket'>('bracket');

  // Create Tournament form state
  const [tourneyName, setTourneyName] = useState('');
  const [tourneyType, setTourneyType] = useState<'2X2' | '4X4'>('2X2');
  const [tourneyPrize, setTourneyPrize] = useState('15 000 🪙');
  const [tourneyMap, setTourneyMap] = useState('de_dust2');
  const [tourneyDate, setTourneyDate] = useState('Сьогодні, 21:00');

  // Active tournament object
  const activeTourney = tournaments.find(t => t.id === selectedTourneyId);

  // Filter matches for the selected tournament
  const tourneyMatches = matches.filter(m => m.tournamentId === selectedTourneyId);

  // Group matches by round for bracket representation
  const quarterfinals = tourneyMatches.filter(m => m.roundName === 'Quarterfinal');
  const semifinals = tourneyMatches.filter(m => m.roundName === 'Semifinal');
  const finals = tourneyMatches.filter(m => m.roundName === 'Final');

  // Roster registration counts
  const totalRegisteredTeams = tournaments.reduce((acc, t) => acc + (t.participantsCount || 0), 0);
  const activeLiveMatchesCount = matches.filter(m => m.status === 'live').length;

  const handleCreateTourney = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tourneyName.trim()) return;

    createTournament({
      name: tourneyName.toUpperCase(),
      type: tourneyType,
      date: tourneyDate,
      prizePool: tourneyPrize,
      prizePlaces: {
        first: `${Math.round(parseInt(tourneyPrize.replace(/\D/g, '')) * 0.5 || 7500).toLocaleString('uk-UA')} 🪙`,
        second: `${Math.round(parseInt(tourneyPrize.replace(/\D/g, '')) * 0.3 || 4500).toLocaleString('uk-UA')} 🪙`,
        third: `${Math.round(parseInt(tourneyPrize.replace(/\D/g, '')) * 0.2 || 3000).toLocaleString('uk-UA')} 🪙`
      },
      maxParticipants: 16,
      map: tourneyMap,
      system: 'Single Elimination',
      rules: [
        `Матч грається за правилами ${tourneyType}.`,
        'Турнірна сітка будується за системою Single Elimination.',
        'Використання читів або стороннього ПЗ суворо заборонено.'
      ]
    });

    setTourneyName('');
    // Switch to newly created tournament
    setTimeout(() => {
      if (tournaments[0]) {
        setSelectedTourneyId(tournaments[0].id);
      }
    }, 100);
  };

  const handleScoreChange = (matchId: string, team: 'A' | 'B', delta: number) => {
    const targetMatch = matches.find(m => m.id === matchId);
    if (!targetMatch) return;

    const currentScoreA = targetMatch.scoreA;
    const currentScoreB = targetMatch.scoreB;

    const nextScoreA = team === 'A' ? Math.max(0, currentScoreA + delta) : currentScoreA;
    const nextScoreB = team === 'B' ? Math.max(0, currentScoreB + delta) : currentScoreB;

    // Update live score in context
    setMatchScore(matchId, nextScoreA, nextScoreB, 'live');
  };

  const handleFinishMatch = (matchId: string) => {
    const targetMatch = matches.find(m => m.id === matchId);
    if (!targetMatch) return;

    if (targetMatch.scoreA === targetMatch.scoreB) {
      alert('У CS2 не може бути нічиєї! Визначте переможця перед завершенням.');
      return;
    }

    const winnerId = targetMatch.scoreA > targetMatch.scoreB 
      ? targetMatch.teamA?.id 
      : targetMatch.teamB?.id;

    if (!winnerId) {
      alert('Неможливо визначити команду переможця.');
      return;
    }

    setMatchScore(matchId, targetMatch.scoreA, targetMatch.scoreB, 'finished', winnerId);
  };

  return (
    <div className="admin-grid-layout">
      {/* 1. LEFT PANEL: Sidebar Controls */}
      <aside className={`admin-sidebar ${activeMobileTab === 'bracket' ? 'admin-sidebar-hidden' : ''}`} style={{
        display: activeMobileTab === 'bracket' ? undefined : 'flex'
      }}>
        {/* Header Branding */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'rgba(255, 92, 0, 0.1)',
              border: '1px solid rgba(255, 92, 0, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Settings size={18} color="#FF5C00" />
            </div>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: '900', fontFamily: 'Outfit, sans-serif', color: 'white', lineHeight: 1.1 }}>
                VOLKI ADMIN
              </h2>
              <span style={{ fontSize: '9px', fontWeight: '800', color: '#FF5C00', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Панель Керування
              </span>
            </div>
          </div>

          {onExitAdmin && (
            <button 
              onClick={onExitAdmin}
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                color: '#8F8F9B',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              title="Вийти до інтерфейсу гравця"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>

        {/* Quick Bento Stats (For sidebar layout on desktop) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px'
        }}>
          <div className="esports-card" style={{ padding: '12px', background: 'rgba(255,255,255,0.01)' }}>
            <span style={{ fontSize: '8px', color: '#51515E', textTransform: 'uppercase', display: 'block' }}>Турніри</span>
            <span style={{ fontSize: '15px', fontWeight: '900', color: 'white', fontFamily: 'Outfit, sans-serif' }}>
              {tournaments.length}
            </span>
          </div>
          <div className="esports-card" style={{ padding: '12px', background: 'rgba(255,255,255,0.01)' }}>
            <span style={{ fontSize: '8px', color: '#51515E', textTransform: 'uppercase', display: 'block' }}>LIVE Ігри</span>
            <span style={{ fontSize: '15px', fontWeight: '900', color: '#EF4444', fontFamily: 'Outfit, sans-serif', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="badge-live-pulse" style={{ width: '5px', height: '5px', backgroundColor: '#EF4444' }}></span>
              {activeLiveMatchesCount}
            </span>
          </div>
          <div className="esports-card" style={{ padding: '12px', background: 'rgba(255,255,255,0.01)' }}>
            <span style={{ fontSize: '8px', color: '#51515E', textTransform: 'uppercase', display: 'block' }}>Команди</span>
            <span style={{ fontSize: '15px', fontWeight: '900', color: '#8B5CF6', fontFamily: 'Outfit, sans-serif' }}>
              {totalRegisteredTeams}
            </span>
          </div>
          <div className="esports-card" style={{ padding: '12px', background: 'rgba(255,255,255,0.01)' }}>
            <span style={{ fontSize: '8px', color: '#51515E', textTransform: 'uppercase', display: 'block' }}>Казна</span>
            <span style={{ fontSize: '13px', fontWeight: '900', color: '#FF5C00', fontFamily: 'Outfit, sans-serif' }}>
              {user.balance.toLocaleString()} 🪙
            </span>
          </div>
        </div>

        {/* Form: Create Tournament */}
        <div className="esports-card orange-glow" style={{ 
          padding: '16px',
          border: '1px solid rgba(255, 92, 0, 0.15)',
          background: 'rgba(16, 16, 24, 0.4)'
        }}>
          <h3 style={{ 
            fontSize: '11px', 
            fontWeight: '900', 
            fontFamily: 'Outfit, sans-serif', 
            color: 'white', 
            textTransform: 'uppercase', 
            letterSpacing: '0.5px',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Plus size={14} color="#FF5C00" /> Створити Турнір
          </h3>

          <form onSubmit={handleCreateTourney} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '9px', color: '#8F8F9B', textTransform: 'uppercase' }}>Назва турніру</label>
              <input 
                type="text" 
                className="form-input" 
                style={{ padding: '8px 12px', fontSize: '12px' }} 
                placeholder="2X2 SUMMER CUP" 
                value={tourneyName} 
                onChange={e => setTourneyName(e.target.value)} 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '9px', color: '#8F8F9B', textTransform: 'uppercase' }}>Формат</label>
                <select 
                  className="form-input" 
                  style={{ padding: '8px 10px', fontSize: '12px', background: '#101016' }}
                  value={tourneyType} 
                  onChange={e => setTourneyType(e.target.value as any)}
                >
                  <option value="2X2">2X2 AIM</option>
                  <option value="4X4">4X4 BATTLE</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '9px', color: '#8F8F9B', textTransform: 'uppercase' }}>Карта</label>
                <select 
                  className="form-input" 
                  style={{ padding: '8px 10px', fontSize: '12px', background: '#101016' }}
                  value={tourneyMap} 
                  onChange={e => setTourneyMap(e.target.value)}
                >
                  <option value="de_dust2">de_dust2</option>
                  <option value="de_mirage">de_mirage</option>
                  <option value="de_inferno">de_inferno</option>
                  <option value="de_nuke">de_nuke</option>
                  <option value="de_ancient">de_ancient</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '9px', color: '#8F8F9B', textTransform: 'uppercase' }}>Приз</label>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ padding: '8px 12px', fontSize: '12px' }} 
                  value={tourneyPrize} 
                  onChange={e => setTourneyPrize(e.target.value)} 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '9px', color: '#8F8F9B', textTransform: 'uppercase' }}>Дата / Час</label>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ padding: '8px 12px', fontSize: '12px' }} 
                  value={tourneyDate} 
                  onChange={e => setTourneyDate(e.target.value)} 
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '10px', fontSize: '11px', marginTop: '6px' }}>
              <Plus size={12} style={{ marginRight: '4px' }} /> СТВОРЮТИ
            </button>
          </form>
        </div>

        {/* Section: Bracket Generator node controller */}
        <div>
          <h3 style={{ 
            fontSize: '9px', 
            fontWeight: '900', 
            color: '#51515E', 
            textTransform: 'uppercase', 
            letterSpacing: '1px', 
            marginBottom: '10px' 
          }}>
            Бракет Генератор
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {tournaments.slice(0, 4).map((t) => (
              <div key={t.id} style={{
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid rgba(255,255,255,0.03)',
                borderRadius: '10px',
                padding: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'white', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {t.name}
                  </span>
                  <span style={{ fontSize: '8px', color: '#8F8F9B' }}>
                    Слоти: {t.participantsCount}/{t.maxParticipants} • {t.map}
                  </span>
                </div>
                <button
                  onClick={() => generateBracketForTournament(t.id)}
                  style={{
                    backgroundColor: 'rgba(255, 92, 0, 0.06)',
                    border: '1px solid rgba(255, 92, 0, 0.15)',
                    color: '#FF5C00',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '9px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    flexShrink: 0
                  }}
                  title="Згенерувати сітку Single Elimination"
                >
                  <RefreshCw size={8} /> СІТКА
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Back Link block for mobile switch back */}
        <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.02)' }}>
          <button
            onClick={onExitAdmin}
            style={{
              width: '100%',
              background: 'none',
              border: '1px solid rgba(255,255,255,0.05)',
              color: '#8F8F9B',
              padding: '10px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#FF5C00'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}
          >
            <ArrowLeft size={12} /> Повернутися до гри
          </button>
        </div>
      </aside>

      {/* 2. RIGHT PANEL: Visual Bracket Workspace */}
      <main className="admin-main">
        
        {/* Top Header Workspace Info Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          paddingBottom: '16px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <span style={{ fontSize: '10px', color: '#FF5C00', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Інтерактивний Робочий Простір
            </span>
            <h1 style={{ fontSize: '24px', fontWeight: '900', fontFamily: 'Outfit, sans-serif', color: 'white' }}>
              Керування Турнірними Сітками
            </h1>
          </div>

          {/* Tournament selector workspace tabs */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {tournaments.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTourneyId(t.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  backgroundColor: selectedTourneyId === t.id ? 'rgba(255, 92, 0, 0.1)' : 'rgba(255,255,255,0.02)',
                  border: selectedTourneyId === t.id ? '1px solid #FF5C00' : '1px solid rgba(255,255,255,0.05)',
                  color: selectedTourneyId === t.id ? 'white' : '#8F8F9B',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s'
                }}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* MOBILE SECTION TABS (Only shown on small screens to switch sidebar controls/visual grids) */}
        <div className="admin-mobile-tabs" style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid rgba(255,255,255,0.03)',
          paddingBottom: '10px',
          marginBottom: '10px'
        }}>
          <button
            onClick={() => setActiveMobileTab('settings')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              backgroundColor: activeMobileTab === 'settings' ? 'rgba(255,92,0,0.1)' : 'transparent',
              border: activeMobileTab === 'settings' ? '1px solid #FF5C00' : '1px solid transparent',
              color: activeMobileTab === 'settings' ? 'white' : '#8F8F9B',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            ⚙️ Керування та форми
          </button>
          <button
            onClick={() => setActiveMobileTab('bracket')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              backgroundColor: activeMobileTab === 'bracket' ? 'rgba(255,92,0,0.1)' : 'transparent',
              border: activeMobileTab === 'bracket' ? '1px solid #FF5C00' : '1px solid transparent',
              color: activeMobileTab === 'bracket' ? 'white' : '#8F8F9B',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            🏆 Турнірна сітка
          </button>
        </div>

        {/* WORKSPACE CONTENT: Renders the active bracket tree graph */}
        <div className="esports-card" style={{ 
          flex: 1, 
          padding: '24px', 
          background: 'rgba(10, 10, 15, 0.4)',
          border: '1px solid rgba(255,255,255,0.02)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '400px',
          overflowY: 'auto'
        }}>
          {activeTourney && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: '800', fontFamily: 'Outfit, sans-serif', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {activeTourney.name} 
                  <span style={{ 
                    fontSize: '9px', 
                    padding: '2px 6px', 
                    borderRadius: '4px', 
                    backgroundColor: activeTourney.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 92, 0, 0.1)',
                    color: activeTourney.status === 'active' ? '#10B981' : '#FF5C00',
                    border: activeTourney.status === 'active' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(255, 92, 0, 0.2)'
                  }}>
                    {activeTourney.status.toUpperCase()}
                  </span>
                </h2>
                <span style={{ fontSize: '11px', color: '#8F8F9B' }}>
                  Карта: <strong style={{ color: 'white' }}>{activeTourney.map}</strong> • Приз: <strong style={{ color: '#FF5C00' }}>{activeTourney.prizePool}</strong> • Учасники: <strong style={{ color: 'white' }}>{activeTourney.participantsCount}/16</strong>
                </span>
              </div>

              {tourneyMatches.length === 0 && (
                <button
                  onClick={() => generateBracketForTournament(selectedTourneyId)}
                  className="btn-primary"
                  style={{ padding: '8px 16px', fontSize: '11px' }}
                >
                  <RefreshCw size={10} style={{ marginRight: '6px' }} /> ЗГЕНЕРУВАТИ СІТКУ
                </button>
              )}
            </div>
          )}

          {/* Active Tournament Match Nodes */}
          {tourneyMatches.length > 0 ? (
            <div className="visual-bracket-tree">
              
              {/* Column 1: Quarterfinals (if any exist) */}
              {quarterfinals.length > 0 && (
                <div className="visual-round-column">
                  <div style={{ textTransform: 'uppercase', fontSize: '9px', fontWeight: '900', color: '#51515E', letterSpacing: '1px', textAlign: 'center', marginBottom: '8px' }}>
                    Чвертьфінали
                  </div>
                  {quarterfinals.map((match) => (
                    <MatchNodeCard key={match.id} match={match} onScoreChange={handleScoreChange} onSetLive={setMatchLive} onFinishMatch={handleFinishMatch} />
                  ))}
                </div>
              )}

              {/* Column 2: Semifinals */}
              <div className="visual-round-column">
                <div style={{ textTransform: 'uppercase', fontSize: '9px', fontWeight: '900', color: '#51515E', letterSpacing: '1px', textAlign: 'center', marginBottom: '8px' }}>
                  Півфінали
                </div>
                {semifinals.length > 0 ? (
                  semifinals.map((match) => (
                    <MatchNodeCard key={match.id} match={match} onScoreChange={handleScoreChange} onSetLive={setMatchLive} onFinishMatch={handleFinishMatch} />
                  ))
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center', fontSize: '11px', color: '#51515E', border: '1px dashed rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                    Очікування сітки півфіналів
                  </div>
                )}
              </div>

              {/* Round Connection indicator / Chevron */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', color: 'rgba(255, 92, 0, 0.2)' }} className="admin-sidebar-hidden">
                <ChevronRight size={24} />
              </div>

              {/* Column 3: Finals */}
              <div className="visual-round-column" style={{ justifyContent: 'center' }}>
                <div style={{ textTransform: 'uppercase', fontSize: '9px', fontWeight: '900', color: '#FF5C00', letterSpacing: '1.5px', textAlign: 'center', marginBottom: '8px' }}>
                  Гранд Фінал
                </div>
                {finals.length > 0 ? (
                  finals.map((match) => (
                    <MatchNodeCard key={match.id} match={match} onScoreChange={handleScoreChange} onSetLive={setMatchLive} onFinishMatch={handleFinishMatch} isFinal />
                  ))
                ) : (
                  <div style={{ 
                    padding: '24px', 
                    textAlign: 'center', 
                    fontSize: '11px', 
                    color: '#51515E', 
                    border: '1px dashed rgba(255,255,255,0.03)', 
                    borderRadius: '16px',
                    background: 'rgba(255,255,255,0.005)'
                  }}>
                    <Trophy size={20} style={{ display: 'block', margin: '0 auto 8px', color: '#51515E' }} />
                    Очікування переможців півфіналу
                  </div>
                )}
              </div>

            </div>
          ) : (
            /* Empty State visual */
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
              textAlign: 'center',
              border: '1px dashed rgba(255,255,255,0.05)',
              borderRadius: '16px',
              background: 'rgba(255,255,255,0.005)',
              margin: '20px 0'
            }}>
              <ShieldAlert size={48} color="#FF5C00" style={{ marginBottom: '16px', opacity: 0.8 }} />
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'white', marginBottom: '8px', fontFamily: 'Outfit, sans-serif' }}>
                Турнірна Сітка не сформована
              </h3>
              <p style={{ fontSize: '12px', color: '#8F8F9B', maxWidth: '380px', lineHeight: 1.5, marginBottom: '20px' }}>
                Для генерації сітки потрібні учасники. Перевірте, щоб у турнірі були зареєстровані команди, або натисніть кнопку нижче для генерації сітки Single Elimination.
              </p>
              
              {activeTourney && (
                <button
                  onClick={() => generateBracketForTournament(selectedTourneyId)}
                  className="btn-primary"
                  style={{ padding: '10px 20px', fontSize: '12px' }}
                >
                  <RefreshCw size={12} style={{ marginRight: '6px' }} /> Згенерувати сітку для {activeTourney.name}
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

/* INNER COMPONENT: Individual Matchup Card Node */
interface MatchNodeCardProps {
  match: Match;
  onScoreChange: (matchId: string, team: 'A' | 'B', delta: number) => void;
  onSetLive: (matchId: string) => void;
  onFinishMatch: (matchId: string) => void;
  isFinal?: boolean;
}

const MatchNodeCard: React.FC<MatchNodeCardProps> = ({ 
  match, 
  onScoreChange, 
  onSetLive, 
  onFinishMatch,
  isFinal = false
}) => {
  const isLive = match.status === 'live';
  const isFinished = match.status === 'finished';
  const isScheduled = match.status === 'scheduled';

  return (
    <div className={`visual-matchup-node ${isLive ? 'visual-matchup-node-live' : isFinished ? 'visual-matchup-node-finished' : ''}`} style={{
      border: isFinal ? '1px solid rgba(255, 92, 0, 0.2)' : undefined,
      boxShadow: isFinal ? '0 8px 32px rgba(255, 92, 0, 0.05)' : undefined
    }}>
      {/* Node Top Header */}
      <div className="visual-matchup-header">
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {isFinal ? <Trophy size={10} color="#FF5C00" /> : <Flame size={10} color="#8F8F9B" />}
          {match.roundName}
        </span>
        <span style={{
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '8px',
          fontWeight: '900',
          backgroundColor: isLive ? '#EF4444' : isFinished ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.03)',
          color: isLive ? 'white' : isFinished ? '#10B981' : '#8F8F9B'
        }}>
          {isLive ? 'LIVE' : isFinished ? 'ЗАВЕРШЕНО' : 'ЗАПЛАНОВАНО'}
        </span>
      </div>

      {/* Roster Match Layout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        
        {/* Team A Row */}
        <div className={`visual-team-row ${isFinished && match.winnerId === match.teamA?.id ? 'visual-team-row-winner' : ''}`}>
          <div className="visual-team-info">
            <div className="visual-team-tag" style={{ 
              backgroundColor: match.teamA?.logoBg || 'rgba(255,255,255,0.02)',
              borderColor: isFinished && match.winnerId === match.teamA?.id ? '#FF5C00' : 'rgba(255,255,255,0.05)'
            }}>
              {match.teamA?.logoText || '?'}
            </div>
            <span className="visual-team-name" style={{
              color: isFinished && match.winnerId === match.teamA?.id ? 'white' : isFinished ? '#51515E' : 'white'
            }}>
              {match.teamA?.name || 'Очікування'}
            </span>
          </div>

          <div className="visual-team-score-input">
            {isLive && match.teamA && (
              <div style={{ display: 'flex', gap: '2px' }}>
                <button onClick={() => onScoreChange(match.id, 'A', -1)} className="score-btn">-</button>
                <button onClick={() => onScoreChange(match.id, 'A', 1)} className="score-btn" style={{ background: 'rgba(255,92,0,0.1)' }}>+</button>
              </div>
            )}
            <span className="visual-score-display" style={{
              color: isFinished && match.winnerId === match.teamA?.id ? '#FF5C00' : 'white'
            }}>
              {match.teamA ? match.scoreA : '-'}
            </span>
          </div>
        </div>

        {/* Team B Row */}
        <div className={`visual-team-row ${isFinished && match.winnerId === match.teamB?.id ? 'visual-team-row-winner' : ''}`}>
          <div className="visual-team-info">
            <div className="visual-team-tag" style={{ 
              backgroundColor: match.teamB?.logoBg || 'rgba(255,255,255,0.02)',
              borderColor: isFinished && match.winnerId === match.teamB?.id ? '#FF5C00' : 'rgba(255,255,255,0.05)'
            }}>
              {match.teamB?.logoText || '?'}
            </div>
            <span className="visual-team-name" style={{
              color: isFinished && match.winnerId === match.teamB?.id ? 'white' : isFinished ? '#51515E' : 'white'
            }}>
              {match.teamB?.name || 'Очікування'}
            </span>
          </div>

          <div className="visual-team-score-input">
            {isLive && match.teamB && (
              <div style={{ display: 'flex', gap: '2px' }}>
                <button onClick={() => onScoreChange(match.id, 'B', -1)} className="score-btn">-</button>
                <button onClick={() => onScoreChange(match.id, 'B', 1)} className="score-btn" style={{ background: 'rgba(255,92,0,0.1)' }}>+</button>
              </div>
            )}
            <span className="visual-score-display" style={{
              color: isFinished && match.winnerId === match.teamB?.id ? '#FF5C00' : 'white'
            }}>
              {match.teamB ? match.scoreB : '-'}
            </span>
          </div>
        </div>

      </div>

      {/* Node Interactive CTA Actions Footer */}
      {(isScheduled || isLive) && match.teamA && match.teamB && (
        <div style={{
          marginTop: '12px',
          borderTop: '1px solid rgba(255,255,255,0.03)',
          paddingTop: '10px',
          display: 'flex'
        }}>
          {isScheduled && (
            <button
              onClick={() => onSetLive(match.id)}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '6px',
                fontSize: '9px',
                fontWeight: '900',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              <Play size={8} fill="white" /> ЗАПУСТИТИ LIVE
            </button>
          )}

          {isLive && (
            <button
              onClick={() => onFinishMatch(match.id)}
              style={{
                width: '100%',
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                color: '#10B981',
                padding: '6px',
                borderRadius: '8px',
                fontSize: '9px',
                fontWeight: '900',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.15)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.08)'}
            >
              <CheckCircle size={8} /> ЗАВЕРШИТИ МАТЧ & РОЗРАХУВАТИ
            </button>
          )}
        </div>
      )}

      {/* Visual Subtitle Details */}
      <div style={{
        marginTop: '8px',
        fontSize: '8px',
        color: '#51515E',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <span>MAP: {match.map.toUpperCase()}</span>
        <span>TIME: {match.time}</span>
      </div>

    </div>
  );
};
