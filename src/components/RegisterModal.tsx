import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, ChevronLeft, Check } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface RegisterModalProps {
  tournamentId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({ tournamentId, onClose, onSuccess }) => {
  const { registerTeam, tournaments, user } = useApp();
  const tourney = tournaments.find(t => t.id === tournamentId);
  const maxPlayers = tourney ? (
    tourney.type === '2X2' ? 2 :
    tourney.type === '3X3' ? 3 :
    tourney.type === '4X4' ? 4 :
    tourney.type === '5X5' ? 5 :
    tourney.type === 'BCI' ? 5 : 2
  ) : 2;

  const userHandle = user?.username ? (user.username.startsWith('@') ? user.username : `@${user.username}`) : '@volki_player';

  // Wizard steps
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [createdTeamId, setCreatedTeamId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(180);

  // Form states
  const [teamName, setTeamName] = useState(user?.username ? `${user.username.replace('@', '').toUpperCase()} Team` : 'VOLK Team');
  const [teamTag, setTeamTag] = useState(user?.username ? user.username.replace('@', '').substring(0, 3).toUpperCase() : 'VLK');
  const [joinType, setJoinType] = useState<'open' | 'closed' | 'invite_only'>('invite_only');
  const [password, setPassword] = useState('');
  
  const captain = userHandle;
  const [players, setPlayers] = useState<{ id: string; username: string }[]>([{ id: user?.id || 'local', username: userHandle }]);
  const [newPlayerInput, setNewPlayerInput] = useState('');

  // Custom confirmation modals states (to avoid native blocking confirm/prompt)
  const [showTeamTypeConfirm, setShowTeamTypeConfirm] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [customPasswordInput, setCustomPasswordInput] = useState('');

  // Step 4 Polling Logic
  useEffect(() => {
    if (step !== 4 || !createdTeamId) return;

    const timerInterval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const checkInterval = setInterval(async () => {
      if (!isSupabaseConfigured()) return;
      const { data, error } = await supabase
        .from('team_invites')
        .select('status')
        .eq('team_id', createdTeamId);
      
      if (!error && data) {
        const hasFailed = data.some(inv => inv.status === 'declined' || inv.status === 'expired');
        const allAccepted = data.every(inv => inv.status === 'accepted');
        
        if (allAccepted && data.length > 0) {
          clearInterval(checkInterval);
          clearInterval(timerInterval);
          onSuccess();
        } else if (hasFailed) {
          clearInterval(checkInterval);
          clearInterval(timerInterval);
          const declinedInv = data.find(inv => inv.status === 'declined');
          alert(declinedInv ? 'Один з гравців відхилив запрошення.' : 'Час очікування вичерпано.');
          await supabase.from('teams').delete().eq('id', createdTeamId);
          setStep(2);
          setCreatedTeamId(null);
          setTimeLeft(180);
        }
      }
    }, 3000);

    return () => {
      clearInterval(timerInterval);
      clearInterval(checkInterval);
    };
  }, [step, createdTeamId, onSuccess]);

  useEffect(() => {
    if (step === 4 && timeLeft === 0 && createdTeamId) {
      alert('Час на прийняття запрошення вичерпано.');
      supabase.from('teams').delete().eq('id', createdTeamId).then(() => {
        setStep(2);
        setCreatedTeamId(null);
        setTimeLeft(180);
      });
    }
  }, [timeLeft, step, createdTeamId]);

  if (!tourney) return null;

  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const searchId = parseInt(newPlayerInput.replace(/\D/g, ''), 10);
    
    if (!searchId || isNaN(searchId)) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }
    
    setIsSearching(true);
    setSearchError(null);
    
    const timeoutId = setTimeout(async () => {
      try {
        const useSupabase = isSupabaseConfigured();
        if (useSupabase) {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, username, telegram_username, reg_num')
            .eq('reg_num', searchId);
          
          if (error) {
            console.error('[VOLKI] Search error:', error);
            if (isMounted) setSearchError('Помилка бази даних. Спробуйте пізніше.');
          } else {
            if (isMounted) setSearchResults(data || []);
          }
        } else {
          if (isMounted) setSearchResults([{ id: String(searchId), username: `@player_${searchId}`, reg_num: searchId }]);
        }
      } catch (err: any) {
        console.error('[VOLKI] Search exception:', err);
        if (isMounted) {
          setSearchError('Помилка з\'єднання.');
          setSearchResults([]);
        }
      } finally {
        if (isMounted) setIsSearching(false);
      }
    }, 500);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [newPlayerInput]);

  const handleAddPlayer = (dbUser: any) => {
    if (dbUser.id === user?.id) {
      alert('Ви не можете запросити самі себе!');
      return;
    }
    const matchedName = dbUser.username || dbUser.telegram_username || String(dbUser.reg_num);
    const formattedName = matchedName.startsWith('@') ? matchedName : `@${matchedName}`;
    
    setPlayers([...players, { id: dbUser.id, username: formattedName }]);
    setNewPlayerInput('');
    setSearchResults([]);
  };

  const handleRemovePlayer = (idx: number) => {
    if (players[idx].username === captain) {
      alert('Капітан не може бути вилучений зі складу!');
      return;
    }
    setPlayers(players.filter((_, i) => i !== idx));
  };

  const handleSelectPublic = () => {
    setJoinType('open');
    setPassword('');
    setShowTeamTypeConfirm(false);
    setStep(3);
  };

  const handleSelectPrivate = () => {
    setShowTeamTypeConfirm(false);
    setShowPasswordPrompt(true);
    // Autofill with randomized password by default
    setCustomPasswordInput(Math.random().toString(36).substring(2, 8).toUpperCase());
  };

  const handleConfirmPassword = () => {
    setJoinType('closed');
    setPassword(customPasswordInput.trim());
    setShowPasswordPrompt(false);
    setStep(3);
  };

  const handleNext = async () => {
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
      // Dismiss mobile keyboard by removing focus from active input
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      
      if (players.length < maxPlayers) {
        setShowTeamTypeConfirm(true);
      } else {
        setStep(3);
      }
    } else if (step === 3) {
      const success = await registerTeam(tournamentId, {
        name: teamName,
        tag: teamTag.toUpperCase(),
        captain,
        players: [{ username: captain }], // Only captain is in team initially, others are pending
        joinType,
        password,
        invites: players.filter(p => p.username !== captain).map(p => p.id)
      } as any);
      if (typeof success === 'string') {
        setCreatedTeamId(success);
        setStep(4);
      } else if (success) {
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
                Тип команди
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['invite_only', 'open', 'closed'].map(type => (
                  <button
                    key={type}
                    onClick={() => setJoinType(type as any)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      backgroundColor: joinType === type ? 'rgba(255, 92, 0, 0.1)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${joinType === type ? '#FF5C00' : 'transparent'}`,
                      borderRadius: '8px',
                      color: joinType === type ? '#FF5C00' : '#8F8F9B',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    {type === 'invite_only' ? 'ЗА ЗАПРОШЕННЯМ' : type === 'open' ? 'ВІДКРИТА' : 'З ПАРОЛЕМ'}
                  </button>
                ))}
              </div>
            </div>

            {joinType === 'closed' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '11px', color: '#51515E', fontWeight: '600' }}>
                  Пароль
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Введіть пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}

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
                СКЛАД КОМАНДИ ({players.length}/{maxPlayers})
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
                    {idx + 1}. {player.username} {player.username === captain ? '(Капітан)' : '(Запрошення)'}
                  </span>
                  {player.username !== captain && (
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
            {players.length < maxPlayers && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                <div style={{ display: 'flex', gap: '10px', position: 'relative' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Введіть ID гравця (напр. 1005)"
                    value={newPlayerInput}
                    onChange={(e) => setNewPlayerInput(e.target.value)}
                  />
                  {/* Results Dropdown */}
                  {newPlayerInput.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '4px',
                      background: '#15151A',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      padding: '8px',
                      zIndex: 10,
                      boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
                    }}>
                      {isSearching ? (
                        <div style={{ textAlign: 'center', color: '#888', padding: '10px' }}>Пошук...</div>
                      ) : searchError ? (
                        <div style={{ textAlign: 'center', color: '#ef4444', padding: '10px' }}>{searchError}</div>
                      ) : searchResults.length > 0 ? (
                        searchResults.map(res => {
                          const matchedName = res.username || res.telegram_username || String(res.reg_num);
                          const displayName = matchedName.startsWith('@') ? matchedName : `@${matchedName}`;
                          return (
                            <div 
                              key={res.id}
                              onClick={() => handleAddPlayer(res)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '12px',
                                background: 'rgba(255,255,255,0.02)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'background 0.2s'
                              }}
                              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                            >
                              <div style={{
                                width: '32px', height: '32px',
                                borderRadius: '50%',
                                background: 'linear-gradient(45deg, #FF4500, #FF8C00)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white', fontWeight: 'bold', fontSize: '14px',
                                marginRight: '12px'
                              }}>
                                {displayName.substring(1, 2).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>
                                  {displayName}
                                </div>
                                <div style={{ color: '#FF4500', fontSize: '12px', marginTop: '2px' }}>
                                  #{res.reg_num}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ padding: '12px', textAlign: 'center', color: '#EF4444', fontSize: '11px', fontFamily: 'Outfit' }}>Гравця не знайдено</div>
                      )}
                    </div>
                  )}
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
                      {idx + 1}. {p.username} {p.username === captain ? '👑' : '(Запрошено)'}
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

        {/* STEP 4: Waiting for Invite */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
            <h4 style={{ fontSize: '14px', color: 'white', fontWeight: '700', textAlign: 'center' }}>
              Очікування підтвердження
            </h4>
            
            <div style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '50%', 
              border: '4px solid rgba(255, 92, 0, 0.2)',
              borderTopColor: '#FF5C00',
              animation: 'spin 1s linear infinite',
              margin: '20px auto'
            }} />
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
            
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '13px', color: '#8F8F9B', marginBottom: '8px' }}>
                Запрошення відправлено в Telegram бота.
              </p>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#FF5C00', fontFamily: 'Outfit' }}>
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </p>
            </div>
            
            <p style={{ fontSize: '11px', color: '#51515E', textAlign: 'center' }}>
              Якщо гравець не підтвердить участь, реєстрацію буде скасовано.
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
          disabled={step === 4}
          style={{ width: '100%', padding: '14px', opacity: step === 4 ? 0.5 : 1 }}
        >
          {step === 4 ? 'ОЧІКУВАННЯ...' : step === 3 ? 'ЗАРЕЄСТРУВАТИСЬ' : 'ДАЛІ'}
        </button>
      </div>
      {/* Custom Team Type Confirmation Overlay */}
      {showTeamTypeConfirm && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(4, 4, 6, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="esports-card orange-glow" style={{
            width: '100%',
            maxWidth: '320px',
            backgroundColor: '#0E0E16',
            border: '1px solid rgba(255, 92, 0, 0.25)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            animation: 'modal-scale 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
            <style>{`
              @keyframes modal-scale {
                from { transform: scale(0.9); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
              }
            `}</style>
            
            <h4 style={{ fontSize: '14px', fontWeight: '800', color: 'white', fontFamily: 'Outfit, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Неповний склад команди ({players.length}/{maxPlayers})
            </h4>
            
            <p style={{ fontSize: '11px', color: '#8F8F9B', lineHeight: '1.5' }}>
              Ви додали менше гравців, ніж передбачено режимом турніру. Бажаєте зробити команду <strong>Приватною</strong> (доступною лише за паролем) чи <strong>Публічною</strong> (будь-хто зможе доєднатися)?
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
              <button
                onClick={handleSelectPrivate}
                className="btn-primary"
                style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                🔒 Зробити приватною
              </button>
              
              <button
                onClick={handleSelectPublic}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  color: '#8F8F9B',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.color = 'white'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.color = '#8F8F9B'; }}
              >
                🔓 Зробити публічною
              </button>
              
              <button
                onClick={() => setShowTeamTypeConfirm(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#51515E',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  marginTop: '4px'
                }}
              >
                Скасувати та повернутися
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Password Prompt Overlay */}
      {showPasswordPrompt && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(4, 4, 6, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="esports-card orange-glow" style={{
            width: '100%',
            maxWidth: '320px',
            backgroundColor: '#0E0E16',
            border: '1px solid rgba(255, 92, 0, 0.25)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            animation: 'modal-scale 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
            <h4 style={{ fontSize: '14px', fontWeight: '800', color: 'white', fontFamily: 'Outfit, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Пароль приватної команди
            </h4>
            
            <p style={{ fontSize: '11px', color: '#8F8F9B', lineHeight: '1.5' }}>
              Введіть пароль для команди. Ваші друзі зможуть приєднатися до вашого складу, ввівши цей пароль.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Введіть пароль"
                value={customPasswordInput}
                onChange={(e) => setCustomPasswordInput(e.target.value)}
                autoFocus
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
              <button
                onClick={handleConfirmPassword}
                className="btn-primary"
                style={{ width: '100%', padding: '12px' }}
              >
                ПРОДОВЖИТИ
              </button>
              
              <button
                onClick={() => {
                  setShowPasswordPrompt(false);
                  setShowTeamTypeConfirm(true);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#51515E',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  textTransform: 'uppercase'
                }}
              >
                Назад
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
