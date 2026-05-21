import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, ChevronLeft, Plus, Check } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface RegisterModalProps {
  tournamentId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({ tournamentId, onClose, onSuccess }) => {
  const { registerTeam, tournaments, user } = useApp();
  const tourney = tournaments.find(t => t.id === tournamentId);

  const userHandle = user?.username ? (user.username.startsWith('@') ? user.username : `@${user.username}`) : '@volki_player';

  // Wizard steps
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form states
  const [teamName, setTeamName] = useState(user?.username ? `${user.username.replace('@', '').toUpperCase()} Team` : 'VOLK Team');
  const [teamTag, setTeamTag] = useState(user?.username ? user.username.replace('@', '').substring(0, 3).toUpperCase() : 'VLK');
  const captain = userHandle;
  const [players, setPlayers] = useState<string[]>([userHandle]);
  const [newPlayerInput, setNewPlayerInput] = useState('');

  if (!tourney) return null;

  const checkAndAddPlayer = async (rawInput: string) => {
    if (!rawInput.startsWith('@')) {
      alert('Нікнейм гравця має починатися з @');
      return;
    }
    if (players.includes(rawInput)) {
      alert('Цей гравець вже є у складі!');
      return;
    }
    if (players.length >= 2) {
      alert('Для формату 2х2 максимум 2 гравці!');
      return;
    }

    const cleanUsername = rawInput.replace('@', '').trim();
    const useSupabase = isSupabaseConfigured();

    if (useSupabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, telegram_username')
          .or(`username.ieq.${cleanUsername},telegram_username.ieq.${cleanUsername}`);

        if (error) {
          console.error('[VOLKI] Supabase query error checking user:', error);
        }

        if (!data || data.length === 0) {
          // If it's the recommended demo partner, bypass as a fallback so local testing works fine
          if (cleanUsername === 'volki_partner') {
            setPlayers([...players, '@volki_partner']);
            setNewPlayerInput('');
            return;
          }
          alert(`Гравця з нікнеймом ${rawInput} не знайдено на сайті або в боті! Перевірте правильність написання нікнейму.`);
          return;
        }
        
        const dbUser = data[0];
        const matchedName = dbUser.username || dbUser.telegram_username || cleanUsername;
        const formattedName = matchedName.startsWith('@') ? matchedName : `@${matchedName}`;
        
        setPlayers([...players, formattedName]);
        setNewPlayerInput('');
      } catch (err) {
        console.error('[VOLKI] Error checking user:', err);
        setPlayers([...players, rawInput]);
        setNewPlayerInput('');
      }
    } else {
      setPlayers([...players, rawInput]);
      setNewPlayerInput('');
    }
  };

  const handleAddPlayer = () => {
    checkAndAddPlayer(newPlayerInput);
  };

  const handleRemovePlayer = (idx: number) => {
    if (players[idx] === captain) {
      alert('Капітан не може бути вилучений зі складу!');
      return;
    }
    setPlayers(players.filter((_, i) => i !== idx));
  };

  const handleNext = () => {
    if (step === 1) {
      if (!teamName.trim()) {
        alert('Введіть назву команди!');
        return;
      }
      if (teamTag.trim().length < 2 || teamTag.trim().length > 4) {
        alert('Тег команди повинен містити від 2 до 4 символів!');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (players.length < 2) {
        alert('Команда повинна містити мінімум 2 гравців!');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      const success = registerTeam(tournamentId, {
        name: teamName,
        tag: teamTag.toUpperCase(),
        captain,
        players: players.map(p => ({ username: p }))
      });
      if (success) {
        onSuccess();
      }
    }
  };

  const handleBack = () => {
    if (step === 1) {
      onClose();
    } else {
      setStep((step - 1) as any);
    }
  };

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#070709',
      zIndex: 200,
      display: 'flex',
      flexDirection: 'column',
      animation: 'slide-up 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
    }}>
      {/* CSS Slide-Up animation keyframe locally injected */}
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>

      {/* Header bar matching Register Screen */}
      <div className="glass-panel" style={{
        display: 'flex',
        alignItems: 'center',
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <button 
          onClick={handleBack}
          style={{ background: 'none', border: 'none', color: '#8F8F9B', cursor: 'pointer', padding: '4px' }}
        >
          <ChevronLeft size={22} />
        </button>
        <h3 style={{
          flex: 1,
          textAlign: 'center',
          fontSize: '15px',
          fontWeight: '800',
          color: 'white',
          fontFamily: 'Outfit, sans-serif'
        }}>
          Реєстрація на {tourney.name}
        </h3>
        <button 
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#8F8F9B', cursor: 'pointer', padding: '4px' }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Roster step wrapper scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
        
        {/* Step progress bar */}
        <div className="step-indicator">
          {[
            { num: 1, label: 'Команда' },
            { num: 2, label: 'Гравці' },
            { num: 3, label: 'Підтвердження' }
          ].map((s) => (
            <div key={s.num} style={{ display: 'flex', alignItems: 'center', position: 'relative', zIndex: 2 }}>
              <div className={`step-node ${step === s.num ? 'step-node-active' : step > s.num ? 'step-node-complete' : ''}`}>
                {step > s.num ? <Check size={12} strokeWidth={3} /> : s.num}
              </div>
              <span className={`step-label ${step === s.num ? 'step-label-active' : ''}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* STEP 1: Team details */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h4 style={{ fontSize: '11px', color: '#8F8F9B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ІНФОРМАЦІЯ ПРО КОМАНДУ
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '11px', color: '#51515E', fontWeight: '600' }}>
                Назва команди
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Введіть назву команди"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '11px', color: '#51515E', fontWeight: '600' }}>
                Тег команди (3 символи)
              </label>
              <input
                type="text"
                className="form-input"
                maxLength={4}
                placeholder="Тег"
                value={teamTag}
                onChange={(e) => setTeamTag(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '11px', color: '#51515E', fontWeight: '600' }}>
                Капітан
              </label>
              <input
                type="text"
                className="form-input"
                style={{ opacity: 0.8 }}
                readOnly
                value={captain}
              />
            </div>
          </div>
        )}

        {/* STEP 2: Player roster */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: '11px', color: '#8F8F9B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                СКЛАД КОМАНДИ ({players.length}/2)
              </h4>
            </div>

            {/* List of players */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {players.map((player, idx) => (
                <div 
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '12px'
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'white' }}>
                    {idx + 1}. {player} {player === captain ? '(Капітан)' : ''}
                  </span>
                  {player !== captain && (
                    <button
                      onClick={() => handleRemovePlayer(idx)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#EF4444',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add player form */}
            {players.length < 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Введіть @username гравця"
                    value={newPlayerInput}
                    onChange={(e) => setNewPlayerInput(e.target.value)}
                  />
                  <button
                    onClick={handleAddPlayer}
                    style={{
                      backgroundColor: 'rgba(255, 92, 0, 0.05)',
                      border: '1px solid rgba(255, 92, 0, 0.15)',
                      borderRadius: '12px',
                      color: '#FF5C00',
                      width: '46px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={20} />
                  </button>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#51515E' }}>
                  <span>Рекомендовано:</span>
                  <button 
                    onClick={() => checkAndAddPlayer('@volki_partner')}
                    style={{
                      background: 'rgba(255, 92, 0, 0.05)',
                      border: '1px solid rgba(255, 92, 0, 0.15)',
                      borderRadius: '6px',
                      color: '#FF5C00',
                      padding: '2px 8px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: '700'
                    }}
                  >
                    @volki_partner
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Confirmation */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h4 style={{ fontSize: '11px', color: '#8F8F9B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ПЕРЕВІРКА ДАНИХ КОМАНДИ
            </h4>

            {/* Recap Card */}
            <div className="esports-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <span style={{ fontSize: '9px', color: '#51515E', textTransform: 'uppercase', display: 'block' }}>
                  Команда
                </span>
                <span style={{ fontSize: '16px', fontWeight: '800', color: 'white', fontFamily: 'Outfit, sans-serif' }}>
                  {teamName} ({teamTag.toUpperCase()})
                </span>
              </div>

              <div>
                <span style={{ fontSize: '9px', color: '#51515E', textTransform: 'uppercase', display: 'block' }}>
                  Склад
                </span>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                  {players.map((p, idx) => (
                    <li key={idx} style={{ fontSize: '13px', fontWeight: '600', color: '#8F8F9B' }}>
                      {idx + 1}. {p} {p === captain ? '👑' : ''}
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '10px' }}>
                <span style={{ fontSize: '9px', color: '#51515E', textTransform: 'uppercase', display: 'block' }}>
                  Турнір
                </span>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#FF5C00' }}>
                  {tourney.name}
                </span>
              </div>
            </div>

            <p style={{ fontSize: '11px', color: '#51515E', lineHeight: '1.4', textAlign: 'center' }}>
              Натискаючи кнопку "Зареєструватись", ви підтверджуєте свою участь на турнірі {tourney.name} та зобов'язуєтесь дотримуватись усіх правил змагань.
            </p>
          </div>
        )}

      </div>

      {/* Button footer */}
      <div className="glass-panel" style={{
        padding: '16px 20px',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <button 
          className="btn-primary"
          onClick={handleNext}
          style={{ width: '100%', padding: '14px' }}
        >
          {step === 3 ? 'ЗАРЕЄСТРУВАТИСЬ' : 'ДАЛІ'}
        </button>
      </div>
      
    </div>
  );
};
