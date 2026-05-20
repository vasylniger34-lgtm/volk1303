import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Match } from '../context/AppContext';
import { 
  Play, Plus, RefreshCw, CheckCircle, Trophy, LogOut, 
  ArrowLeft, ChevronRight, Lock, Eye, EyeOff, 
  Shield, Trash2, Edit3, Users, Swords, BarChart3, X, Save,
  Calendar, MapPin, Award, Hash, ChevronDown
} from 'lucide-react';

const ADMIN_PASSWORD = '11111111';

const MAPS = ['de_dust2', 'de_mirage', 'de_inferno', 'de_nuke', 'de_ancient', 'de_anubis', 'de_vertigo', 'de_overpass'];

interface AdminPanelProps {
  onExitAdmin?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onExitAdmin }) => {
  const { 
    tournaments, matches, teams,
    setMatchLive, setMatchScore, createTournament, 
    generateBracketForTournament, deleteTournament, updateTournament
  } = useApp();

  // Admin auth
  const [isAdminAuthed, setIsAdminAuthed] = useState(() => localStorage.getItem('volk_admin_auth') === 'true');
  const [adminPass, setAdminPass] = useState('');
  const [adminError, setAdminError] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Navigation
  const [activeSection, setActiveSection] = useState<'dashboard' | 'tournaments' | 'matches' | 'create'>('dashboard');
  const [selectedTourneyId, setSelectedTourneyId] = useState<string>('');

  // Create form
  const [form, setForm] = useState({
    name: '', type: '2X2' as '2X2' | '4X4', prize: '10 000',
    map: 'de_dust2', date: '', maxParticipants: 16,
    rules: ''
  });

  // Score editing
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [editScoreA, setEditScoreA] = useState(0);
  const [editScoreB, setEditScoreB] = useState(0);

  // ─── Auth handlers ───
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPass === ADMIN_PASSWORD) {
      localStorage.setItem('volk_admin_auth', 'true');
      setIsAdminAuthed(true);
    } else {
      setAdminError('Невірний пароль');
      setAdminPass('');
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('volk_admin_auth');
    setIsAdminAuthed(false);
    if (onExitAdmin) onExitAdmin();
  };

  // ─── Login Gate ───
  if (!isAdminAuthed) {
    return (
      <div className="admin-login-overlay">
        <div className="admin-login-card">
          <div className="auth-orb auth-orb-1" />
          <div className="auth-orb auth-orb-2" />
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              width: '64px', height: '64px', margin: '0 auto 12px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(255, 92, 0, 0.08))',
              border: '1px solid rgba(255, 92, 0, 0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(255, 92, 0, 0.1)'
            }}>
              <Shield size={32} color="#FF5C00" />
            </div>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '24px', fontWeight: '900', letterSpacing: '4px', color: 'white', margin: 0 }}>ADMIN PANEL</h1>
            <span style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '3px', color: '#FF5C00', textTransform: 'uppercase', marginTop: '4px', display: 'block' }}>VOLKI 13:03</span>
          </div>
          <form onSubmit={handleAdminLogin} style={{ position: 'relative', zIndex: 1 }}>
            <div className="auth-input-group" style={{ marginBottom: '14px' }}>
              <Lock size={16} color="#FF5C00" style={{ marginRight: '8px' }} />
              <input type={showPass ? 'text' : 'password'} className="auth-input" placeholder="Пароль адміністратора" value={adminPass}
                onChange={e => { setAdminPass(e.target.value); setAdminError(''); }} autoFocus />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}>
                {showPass ? <EyeOff size={16} color="#51515E" /> : <Eye size={16} color="#51515E" />}
              </button>
            </div>
            {adminError && <p style={{ color: '#EF4444', fontSize: '12px', fontWeight: '600', textAlign: 'center', marginBottom: '12px' }}>{adminError}</p>}
            <button type="submit" className="auth-btn-primary" disabled={!adminPass.trim()}>
              <Lock size={16} /> Увійти в панель
            </button>
          </form>
          {onExitAdmin && (
            <button onClick={onExitAdmin} className="auth-btn-back" style={{ position: 'relative', zIndex: 1 }}>← Назад до додатку</button>
          )}
          <div className="auth-version">Admin Access Only</div>
        </div>
      </div>
    );
  }

  // ─── Data ───
  const liveMatchesCount = matches.filter(m => m.status === 'live').length;
  const totalTeams = Object.values(teams).reduce((a, b) => a + b.length, 0);

  const handleCreateTourney = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const prizeNum = parseInt(form.prize.replace(/\D/g, '')) || 10000;
    createTournament({
      name: form.name.toUpperCase(),
      type: form.type,
      date: form.date || 'TBD',
      prizePool: `${prizeNum.toLocaleString('uk-UA')} 🪙`,
      prizePlaces: {
        first: `${Math.round(prizeNum * 0.5).toLocaleString('uk-UA')} 🪙`,
        second: `${Math.round(prizeNum * 0.3).toLocaleString('uk-UA')} 🪙`,
        third: `${Math.round(prizeNum * 0.2).toLocaleString('uk-UA')} 🪙`
      },
      maxParticipants: form.maxParticipants,
      map: form.map,
      system: 'Single Elimination',
      rules: form.rules.split('\n').filter(r => r.trim())
    });
    setForm({ name: '', type: '2X2', prize: '10 000', map: 'de_dust2', date: '', maxParticipants: 16, rules: '' });
    setActiveSection('tournaments');
  };

  const startEditMatch = (match: Match) => {
    setEditingMatch(match.id);
    setEditScoreA(match.scoreA);
    setEditScoreB(match.scoreB);
  };

  const saveMatchScore = (matchId: string, status: 'live' | 'finished') => {
    const match = matches.find(m => m.id === matchId);
    let winnerId: string | null = null;
    if (status === 'finished') {
      winnerId = editScoreA > editScoreB ? (match?.teamA?.id || null) : (match?.teamB?.id || null);
    }
    setMatchScore(matchId, editScoreA, editScoreB, status, winnerId);
    setEditingMatch(null);
  };

  // ─── Styles ───
  const s = {
    sidebar: { width: '260px', background: '#0D0D14', borderRight: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column' as const, flexShrink: 0, height: '100vh', position: 'sticky' as const, top: 0 },
    sideItem: (active: boolean) => ({
      display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 20px', cursor: 'pointer',
      background: active ? 'rgba(255, 92, 0, 0.06)' : 'transparent', borderLeft: active ? '3px solid #FF5C00' : '3px solid transparent',
      color: active ? '#FF5C00' : '#8F8F9B', fontSize: '13px', fontWeight: active ? '700' : '500', transition: 'all 0.15s',
      fontFamily: 'Outfit, sans-serif'
    }),
    main: { flex: 1, padding: '28px 36px', overflowY: 'auto' as const, height: '100vh', background: '#0A0A10' },
    card: { background: 'rgba(14,14,22,0.8)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '16px', padding: '20px' },
    statCard: (color: string) => ({
      background: `linear-gradient(135deg, ${color}08, transparent)`, border: `1px solid ${color}15`,
      borderRadius: '14px', padding: '18px', flex: 1, minWidth: '180px'
    }),
    input: {
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px',
      padding: '10px 14px', color: 'white', fontSize: '13px', fontWeight: '500', outline: 'none', width: '100%',
      fontFamily: 'Outfit, sans-serif', transition: 'border-color 0.2s'
    },
    label: { fontSize: '11px', color: '#8F8F9B', fontWeight: '700', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '6px', display: 'block' },
    btnPrimary: {
      background: 'linear-gradient(135deg, #FF5C00, #E64A00)', border: 'none', borderRadius: '10px',
      padding: '12px 24px', color: 'white', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
      fontFamily: 'Outfit, sans-serif', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
    },
    btnDanger: {
      background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px',
      padding: '8px 14px', color: '#EF4444', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s'
    },
    btnSmall: {
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px',
      padding: '6px 12px', color: '#ccc', fontSize: '11px', fontWeight: '600', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: '4px'
    },
    sectionTitle: { fontSize: '22px', fontWeight: '900', color: 'white', fontFamily: 'Outfit, sans-serif', letterSpacing: '1px', marginBottom: '24px' },
    badge: (color: string) => ({
      background: `${color}15`, color: color, padding: '3px 10px', borderRadius: '6px',
      fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' as const, letterSpacing: '0.5px'
    })
  };

  // ─── Render ───
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0A0A10', color: 'white', fontFamily: 'Inter, Outfit, sans-serif' }}>
      {/* ─── Sidebar ─── */}
      <div style={s.sidebar}>
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(255, 92, 0, 0.15), rgba(139, 92, 246, 0.1))',
              border: '1px solid rgba(255, 92, 0, 0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Shield size={18} color="#FF5C00" />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '900', letterSpacing: '2px', fontFamily: 'Outfit, sans-serif' }}>VOLKI</div>
              <div style={{ fontSize: '9px', color: '#FF5C00', fontWeight: '700', letterSpacing: '2px' }}>ADMIN PANEL</div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, paddingTop: '12px' }}>
          <div style={s.sideItem(activeSection === 'dashboard')} onClick={() => setActiveSection('dashboard')}>
            <BarChart3 size={16} /> Дашборд
          </div>
          <div style={s.sideItem(activeSection === 'tournaments')} onClick={() => setActiveSection('tournaments')}>
            <Trophy size={16} /> Турніри
          </div>
          <div style={s.sideItem(activeSection === 'matches')} onClick={() => setActiveSection('matches')}>
            <Swords size={16} /> Матчі
          </div>
          <div style={s.sideItem(activeSection === 'create')} onClick={() => setActiveSection('create')}>
            <Plus size={16} /> Створити турнір
          </div>
        </div>

        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          {onExitAdmin && (
            <div style={{ ...s.sideItem(false), padding: '10px 0' }} onClick={onExitAdmin}>
              <ArrowLeft size={14} /> До додатку
            </div>
          )}
          <div style={{ ...s.sideItem(false), padding: '10px 0', color: '#EF4444' }} onClick={handleAdminLogout}>
            <LogOut size={14} /> Вийти
          </div>
        </div>
      </div>

      {/* ─── Main Content ─── */}
      <div style={s.main}>

        {/* ══════ DASHBOARD ══════ */}
        {activeSection === 'dashboard' && (
          <>
            <h1 style={s.sectionTitle}>📊 Дашборд</h1>
            
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '28px' }}>
              <div style={s.statCard('#FF5C00')}>
                <div style={{ fontSize: '10px', color: '#8F8F9B', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>Турніри</div>
                <div style={{ fontSize: '28px', fontWeight: '900', fontFamily: 'Outfit', color: '#FF5C00' }}>{tournaments.length}</div>
              </div>
              <div style={s.statCard('#10B981')}>
                <div style={{ fontSize: '10px', color: '#8F8F9B', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>Команди</div>
                <div style={{ fontSize: '28px', fontWeight: '900', fontFamily: 'Outfit', color: '#10B981' }}>{totalTeams}</div>
              </div>
              <div style={s.statCard('#3B82F6')}>
                <div style={{ fontSize: '10px', color: '#8F8F9B', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>Матчі</div>
                <div style={{ fontSize: '28px', fontWeight: '900', fontFamily: 'Outfit', color: '#3B82F6' }}>{matches.length}</div>
              </div>
              <div style={s.statCard('#EF4444')}>
                <div style={{ fontSize: '10px', color: '#8F8F9B', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>LIVE</div>
                <div style={{ fontSize: '28px', fontWeight: '900', fontFamily: 'Outfit', color: '#EF4444' }}>{liveMatchesCount}</div>
              </div>
            </div>

            {/* Recent tournaments */}
            <h3 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '14px', fontFamily: 'Outfit', color: '#ccc' }}>Останні турніри</h3>
            {tournaments.length === 0 ? (
              <div style={{ ...s.card, textAlign: 'center', padding: '40px', color: '#51515E' }}>
                <Trophy size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p style={{ fontSize: '14px', fontWeight: '600' }}>Турнірів ще немає</p>
                <p style={{ fontSize: '12px', marginTop: '4px' }}>Створіть перший турнір через меню зліва</p>
                <button style={{ ...s.btnPrimary, margin: '16px auto 0', display: 'inline-flex' }} onClick={() => setActiveSection('create')}>
                  <Plus size={14} /> Створити
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
                {tournaments.slice(0, 6).map(t => (
                  <div key={t.id} style={{ ...s.card, cursor: 'pointer', transition: 'border-color 0.2s' }}
                    onClick={() => { setSelectedTourneyId(t.id); setActiveSection('tournaments'); }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '800', fontFamily: 'Outfit' }}>{t.name}</span>
                      <span style={s.badge(t.status === 'active' ? '#10B981' : t.status === 'completed' ? '#8B5CF6' : '#FF5C00')}>
                        {t.status === 'active' ? 'LIVE' : t.status === 'completed' ? 'DONE' : 'SOON'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#8F8F9B' }}>
                      <span>🎮 {t.type}</span>
                      <span>🗺️ {t.map}</span>
                      <span>👥 {t.participantsCount}/{t.maxParticipants}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#FF5C00', fontWeight: '700', marginTop: '8px' }}>{t.prizePool}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ══════ TOURNAMENTS ══════ */}
        {activeSection === 'tournaments' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h1 style={{ ...s.sectionTitle, marginBottom: 0 }}>🏆 Турніри</h1>
              <button style={s.btnPrimary} onClick={() => setActiveSection('create')}>
                <Plus size={14} /> Новий турнір
              </button>
            </div>

            {tournaments.length === 0 ? (
              <div style={{ ...s.card, textAlign: 'center', padding: '60px', color: '#51515E' }}>
                <Trophy size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
                <p style={{ fontSize: '16px', fontWeight: '700' }}>Немає турнірів</p>
                <p style={{ fontSize: '12px', marginTop: '6px' }}>Натисніть «Новий турнір» щоб створити перший</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tournaments.map(t => {
                  const tTeams = teams[t.id] || [];
                  const tMatches = matches.filter(m => m.tournamentId === t.id);
                  const isSelected = selectedTourneyId === t.id;

                  return (
                    <div key={t.id} style={{
                      ...s.card, border: isSelected ? '1px solid rgba(255, 92, 0, 0.3)' : '1px solid rgba(255,255,255,0.04)',
                      transition: 'all 0.2s'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '16px', fontWeight: '900', fontFamily: 'Outfit' }}>{t.name}</span>
                          <span style={s.badge(t.status === 'active' ? '#10B981' : t.status === 'completed' ? '#8B5CF6' : '#FF5C00')}>
                            {t.status === 'active' ? 'ACTIVE' : t.status === 'completed' ? 'COMPLETED' : 'UPCOMING'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {t.status === 'upcoming' && (
                            <button style={s.btnSmall} onClick={() => updateTournament(t.id, { status: 'active' })}>
                              <Play size={12} /> Запустити
                            </button>
                          )}
                          {t.status === 'active' && (
                            <button style={s.btnSmall} onClick={() => updateTournament(t.id, { status: 'completed' })}>
                              <CheckCircle size={12} /> Завершити
                            </button>
                          )}
                          <button style={s.btnSmall} onClick={() => { setSelectedTourneyId(t.id); generateBracketForTournament(t.id); }}>
                            <RefreshCw size={12} /> Сітка
                          </button>
                          <button style={s.btnDanger} onClick={() => { if (confirm(`Видалити "${t.name}"?`)) deleteTournament(t.id); }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '24px', fontSize: '12px', color: '#8F8F9B', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Hash size={12} /> {t.type}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={12} /> {t.date}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12} /> {t.map}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={12} /> {tTeams.length}/{t.maxParticipants} команд</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Swords size={12} /> {tMatches.length} матчів</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#FF5C00', fontWeight: '700' }}><Award size={12} /> {t.prizePool}</span>
                      </div>

                      {/* Matches section when selected */}
                      {isSelected && tMatches.length > 0 && (
                        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                          <h4 style={{ fontSize: '12px', color: '#8F8F9B', fontWeight: '700', textTransform: 'uppercase', marginBottom: '10px' }}>
                            Матчі сітки
                          </h4>
                          {tMatches.map(m => (
                            <div key={m.id} style={{
                              display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px',
                              background: 'rgba(255,255,255,0.015)', borderRadius: '10px', marginBottom: '6px',
                              border: m.status === 'live' ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(255,255,255,0.03)'
                            }}>
                              <span style={{ fontSize: '10px', color: '#51515E', fontWeight: '600', minWidth: '80px' }}>{m.roundName}</span>
                              
                              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
                                <span style={{ fontSize: '13px', fontWeight: '700', textAlign: 'right', minWidth: '90px' }}>{m.teamA?.name || 'TBD'}</span>
                                
                                {editingMatch === m.id ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <input type="number" value={editScoreA} onChange={e => setEditScoreA(Number(e.target.value))} min={0}
                                      style={{ ...s.input, width: '50px', textAlign: 'center', padding: '6px' }} />
                                    <span style={{ color: '#51515E', fontWeight: '800' }}>:</span>
                                    <input type="number" value={editScoreB} onChange={e => setEditScoreB(Number(e.target.value))} min={0}
                                      style={{ ...s.input, width: '50px', textAlign: 'center', padding: '6px' }} />
                                  </div>
                                ) : (
                                  <span style={{ fontSize: '16px', fontWeight: '900', fontFamily: 'Outfit', color: m.status === 'live' ? '#EF4444' : '#ccc', minWidth: '50px', textAlign: 'center' }}>
                                    {m.scoreA} : {m.scoreB}
                                  </span>
                                )}

                                <span style={{ fontSize: '13px', fontWeight: '700', textAlign: 'left', minWidth: '90px' }}>{m.teamB?.name || 'TBD'}</span>
                              </div>

                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <span style={s.badge(m.status === 'live' ? '#EF4444' : m.status === 'finished' ? '#10B981' : '#FF5C00')}>
                                  {m.status === 'live' ? '🔴 LIVE' : m.status === 'finished' ? '✅ DONE' : '⏳ WAIT'}
                                </span>

                                {editingMatch === m.id ? (
                                  <>
                                    <button style={{ ...s.btnSmall, color: '#10B981', borderColor: 'rgba(16,185,129,0.2)' }}
                                      onClick={() => saveMatchScore(m.id, 'live')}><Save size={12} /> Live</button>
                                    <button style={{ ...s.btnSmall, color: '#8B5CF6', borderColor: 'rgba(139,92,246,0.2)' }}
                                      onClick={() => saveMatchScore(m.id, 'finished')}><CheckCircle size={12} /> Finish</button>
                                    <button style={{ ...s.btnSmall, color: '#EF4444' }} onClick={() => setEditingMatch(null)}><X size={12} /></button>
                                  </>
                                ) : (
                                  <>
                                    {m.status === 'scheduled' && (
                                      <button style={{ ...s.btnSmall, color: '#10B981' }} onClick={() => setMatchLive(m.id)}>
                                        <Play size={12} /> Start
                                      </button>
                                    )}
                                    <button style={s.btnSmall} onClick={() => startEditMatch(m)}>
                                      <Edit3 size={12} /> Рахунок
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {isSelected && tTeams.length > 0 && (
                        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                          <h4 style={{ fontSize: '12px', color: '#8F8F9B', fontWeight: '700', textTransform: 'uppercase', marginBottom: '10px' }}>
                            Зареєстровані команди ({tTeams.length})
                          </h4>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {tTeams.map(team => (
                              <div key={team.id} style={{
                                background: team.logoBg || '#1E293B', borderRadius: '8px', padding: '6px 12px',
                                fontSize: '11px', fontWeight: '700', color: 'white', display: 'flex', alignItems: 'center', gap: '6px'
                              }}>
                                <span style={{ fontSize: '9px', opacity: 0.7 }}>{team.tag}</span>
                                {team.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {!isSelected && (
                        <button style={{ ...s.btnSmall, marginTop: '12px', color: '#FF5C00' }}
                          onClick={() => setSelectedTourneyId(t.id)}>
                          <ChevronRight size={12} /> Деталі
                        </button>
                      )}
                      {isSelected && (
                        <button style={{ ...s.btnSmall, marginTop: '12px', color: '#51515E' }}
                          onClick={() => setSelectedTourneyId('')}>
                          <ChevronDown size={12} /> Згорнути
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ══════ ALL MATCHES ══════ */}
        {activeSection === 'matches' && (
          <>
            <h1 style={s.sectionTitle}>⚔️ Всі матчі</h1>
            {matches.length === 0 ? (
              <div style={{ ...s.card, textAlign: 'center', padding: '60px', color: '#51515E' }}>
                <Swords size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
                <p style={{ fontSize: '16px', fontWeight: '700' }}>Немає матчів</p>
                <p style={{ fontSize: '12px', marginTop: '6px' }}>Створіть турнір і згенеруйте сітку</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {matches.map(m => (
                  <div key={m.id} style={{
                    ...s.card, display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 20px',
                    border: m.status === 'live' ? '1px solid rgba(239, 68, 68, 0.2)' : undefined
                  }}>
                    <span style={{ fontSize: '11px', color: '#51515E', fontWeight: '600', minWidth: '140px' }}>
                      {m.tournamentName} · {m.roundName}
                    </span>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '700', minWidth: '100px', textAlign: 'right' }}>{m.teamA?.name || 'TBD'}</span>
                      {editingMatch === m.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input type="number" value={editScoreA} onChange={e => setEditScoreA(Number(e.target.value))} min={0}
                            style={{ ...s.input, width: '50px', textAlign: 'center', padding: '6px' }} />
                          <span style={{ color: '#51515E', fontWeight: '800' }}>:</span>
                          <input type="number" value={editScoreB} onChange={e => setEditScoreB(Number(e.target.value))} min={0}
                            style={{ ...s.input, width: '50px', textAlign: 'center', padding: '6px' }} />
                        </div>
                      ) : (
                        <span style={{ fontSize: '18px', fontWeight: '900', fontFamily: 'Outfit', color: m.status === 'live' ? '#EF4444' : '#ccc', minWidth: '60px', textAlign: 'center' }}>
                          {m.scoreA} : {m.scoreB}
                        </span>
                      )}
                      <span style={{ fontSize: '14px', fontWeight: '700', minWidth: '100px' }}>{m.teamB?.name || 'TBD'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={s.badge(m.status === 'live' ? '#EF4444' : m.status === 'finished' ? '#10B981' : '#FF5C00')}>
                        {m.status === 'live' ? '🔴 LIVE' : m.status === 'finished' ? '✅' : '⏳'}
                      </span>
                      {editingMatch === m.id ? (
                        <>
                          <button style={{ ...s.btnSmall, color: '#10B981' }} onClick={() => saveMatchScore(m.id, 'live')}><Save size={12} /></button>
                          <button style={{ ...s.btnSmall, color: '#8B5CF6' }} onClick={() => saveMatchScore(m.id, 'finished')}><CheckCircle size={12} /></button>
                          <button style={{ ...s.btnSmall, color: '#EF4444' }} onClick={() => setEditingMatch(null)}><X size={12} /></button>
                        </>
                      ) : (
                        <>
                          {m.status === 'scheduled' && <button style={{ ...s.btnSmall, color: '#10B981' }} onClick={() => setMatchLive(m.id)}><Play size={12} /></button>}
                          <button style={s.btnSmall} onClick={() => startEditMatch(m)}><Edit3 size={12} /></button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ══════ CREATE TOURNAMENT ══════ */}
        {activeSection === 'create' && (
          <>
            <h1 style={s.sectionTitle}>➕ Створити турнір</h1>
            <div style={{ ...s.card, maxWidth: '640px' }}>
              <form onSubmit={handleCreateTourney}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={s.label}>Назва турніру</label>
                    <input style={s.input} placeholder="2X2 AIM CUP" value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div>
                    <label style={s.label}>Формат</label>
                    <select style={{ ...s.input, cursor: 'pointer' }} value={form.type}
                      onChange={e => setForm({ ...form, type: e.target.value as '2X2' | '4X4' })}>
                      <option value="2X2">2x2</option>
                      <option value="4X4">4x4</option>
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Карта</label>
                    <select style={{ ...s.input, cursor: 'pointer' }} value={form.map}
                      onChange={e => setForm({ ...form, map: e.target.value })}>
                      {MAPS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Призовий фонд (🪙)</label>
                    <input style={s.input} placeholder="10 000" value={form.prize}
                      onChange={e => setForm({ ...form, prize: e.target.value })} />
                  </div>
                  <div>
                    <label style={s.label}>Макс. учасників</label>
                    <select style={{ ...s.input, cursor: 'pointer' }} value={form.maxParticipants}
                      onChange={e => setForm({ ...form, maxParticipants: Number(e.target.value) })}>
                      {[4, 8, 16, 32].map(n => <option key={n} value={n}>{n} команд</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={s.label}>Дата та час</label>
                    <input style={s.input} placeholder="Сьогодні, 20:00" value={form.date}
                      onChange={e => setForm({ ...form, date: e.target.value })} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={s.label}>Правила (кожне з нового рядка)</label>
                    <textarea style={{ ...s.input, minHeight: '80px', resize: 'vertical' }} placeholder="Формат 2х2, BO1&#10;Single Elimination&#10;Заборонено використання читів"
                      value={form.rules} onChange={e => setForm({ ...form, rules: e.target.value })} />
                  </div>
                </div>
                <button type="submit" style={s.btnPrimary} disabled={!form.name.trim()}>
                  <Plus size={16} /> Створити турнір
                </button>
              </form>
            </div>
          </>
        )}

      </div>
    </div>
  );
};
