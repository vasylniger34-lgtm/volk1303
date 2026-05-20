import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { 
  Shield, Key, Mail, User, Lock, Eye, EyeOff, LogOut, 
  BarChart3, Trophy, Swords, Users, Settings, Activity, 
  Plus, Check, ChevronRight, Play, Edit3, X, Save, 
  Calendar, MapPin, Award, Trash2, PlusCircle, AlertCircle, RefreshCw, Send
} from 'lucide-react';

const MANAGER_ACCESS_CODE = 'VOLKI-ADMIN-2026';
const MAPS = ['de_dust2', 'de_mirage', 'de_inferno', 'de_nuke', 'de_ancient', 'de_anubis', 'de_vertigo', 'de_overpass'];

const MAP_PRESETS: Record<string, string> = {
  de_dust2: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800',
  de_mirage: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=800',
  de_inferno: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=800',
  de_nuke: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=800',
  de_ancient: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=800',
  de_anubis: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=800',
  de_vertigo: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800',
  de_overpass: 'https://images.unsplash.com/photo-1535223289827-42f1e9919769?q=80&w=800'
};

interface ManagerPanelProps {
  onExitAdmin?: () => void;
}

interface ManagerProfile {
  email: string;
  username: string;
  role: string;
  joinedAt: string;
  status: 'online' | 'offline';
}

export const ManagerPanel: React.FC<ManagerPanelProps> = ({ onExitAdmin }) => {
  const { 
    tournaments, matches, teams,
    setMatchLive, setMatchScore, createTournament, 
    generateBracketForTournament, deleteTournament, updateTournament,
    showToast, resetAllData, updateMatchOdds
  } = useApp();

  const useSupabase = isSupabaseConfigured();

  // Admin / Manager Session State
  const [isAuthed, setIsAuthed] = useState(() => {
    return localStorage.getItem('volk_manager_session') === 'true';
  });
  const [managerUser, setManagerUser] = useState<Partial<ManagerProfile>>(() => {
    try {
      const saved = localStorage.getItem('volk_manager_profile');
      return saved ? JSON.parse(saved) : { email: 'manager@volki.gg', username: 'Volki Director', role: 'Super Admin' };
    } catch (e) {
      console.warn('[VOLKI] Failed to parse volk_manager_profile from localStorage:', e);
      return { email: 'manager@volki.gg', username: 'Volki Director', role: 'Super Admin' };
    }
  });

  // Auth Page Switch
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);

  // Register fields
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regCode, setRegCode] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);

  // General loading & error states
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Dashboard workspace navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tournaments' | 'matches' | 'managers' | 'analytics' | 'settings'>('dashboard');

  // Match management state
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [editScoreA, setEditScoreA] = useState(0);
  const [editScoreB, setEditScoreB] = useState(0);
  const [editOddsA, setEditOddsA] = useState(1.85);
  const [editOddsB, setEditOddsB] = useState(1.85);
  const [customLog, setCustomLog] = useState('');

  // Live Terminal Log System state
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] System Initialized. Command Center ready.`,
    `[${new Date().toLocaleTimeString()}] Connection established with ${useSupabase ? 'Supabase cloud database' : 'local storage mock engine'}.`,
    `[${new Date().toLocaleTimeString()}] Awaiting incoming admin instructions.`
  ]);

  // Tournament creation form state
  const [tourneyForm, setTourneyForm] = useState({
    name: '', type: '2X2' as '2X2' | '4X4' | 'BCI', prize: '25 000',
    map: 'de_dust2', date: '', maxParticipants: 16,
    rules: 'Format: Single Elimination\nNo cheats permitted\nMatches are streamed live\nCaptain must report scores',
    imageUrl: ''
  });

  // Tournament Editing states
  const [editingTourney, setEditingTourney] = useState<any | null>(null);
  const [editTourneyForm, setEditTourneyForm] = useState({
    id: '',
    name: '',
    type: '2X2' as '2X2' | '4X4' | 'BCI',
    prizePool: '',
    prizeFirst: '',
    prizeSecond: '',
    prizeThird: '',
    maxParticipants: 16,
    map: 'de_dust2',
    date: '',
    rules: '',
    imageUrl: '',
    status: 'upcoming' as 'upcoming' | 'active' | 'completed'
  });

  // Manager Registry List (Stateful mock list sync'd with local storage)
  const [managers, setManagers] = useState<ManagerProfile[]>(() => {
    try {
      const saved = localStorage.getItem('volk_managers_list');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('[VOLKI] Failed to parse volk_managers_list from localStorage:', e);
    }
    return [
      { email: 'director@volki.gg', username: 'Volki Director', role: 'Super Admin', joinedAt: '20.05.2026', status: 'online' },
      { email: 'moderator1@volki.gg', username: 'Alex CS', role: 'Moderator', joinedAt: '20.05.2026', status: 'offline' }
    ];
  });

  // Invite manager access configuration code
  const [managerInviteCode, setManagerInviteCode] = useState(MANAGER_ACCESS_CODE);

  // Sync managers to local storage
  useEffect(() => {
    localStorage.setItem('volk_managers_list', JSON.stringify(managers));
  }, [managers]);

  // Auto-scroller for live console terminal
  const terminalBottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (terminalBottomRef.current) {
      terminalBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLogs]);

  // Generate live background simulator logs to make the cover dashboard feel active
  useEffect(() => {
    if (!isAuthed) return;

    const mockActions = [
      "User @aim_bot placed a bet of 800 🪙 on tournament match",
      "New player registered on platform: @cs2_enjoyer",
      "API request received: FetchActiveTournaments (200 OK)",
      "Resolved prediction bets for match in tournament bracket",
      "Player request received: JoinTeam (200 OK)",
      "Server status healthy: CPU 12%, Memory 48%, Active websockets: 28",
      "Telegram bot ping received from Webhook handler",
      "Deposited +5000 🪙 to wallet for testing admin role",
      "Refreshed bracket connector graphics in user application"
    ];

    const interval = setInterval(() => {
      const randomAction = mockActions[Math.floor(Math.random() * mockActions.length)];
      setTerminalLogs(prev => [
        ...prev, 
        `[${new Date().toLocaleTimeString()}] ${randomAction}`
      ].slice(-25)); // Keep last 25 logs
    }, 4500);

    return () => clearInterval(interval);
  }, [isAuthed]);

  // ─── AUTHENTICATION HANDLERS ───

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    if (regCode !== managerInviteCode) {
      setAuthError('Невірний код доступу керуючого! Зверніться до головного адміністратора.');
      setAuthLoading(false);
      return;
    }

    try {
      if (useSupabase) {
        // 1. Sign up user via Supabase
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: regEmail,
          password: regPass,
          options: {
            data: {
              username: regUsername,
              role: 'admin' // Attempt metadata injection
            }
          }
        });

        if (signUpError) throw signUpError;

        if (signUpData?.user) {
          // 2. Elevate user role to admin inside public.profiles
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', signUpData.user.id);
          
          if (profileError) {
            console.warn('[VOLKI Admin] Could not update profile role to admin directly via client RLS:', profileError);
          }
        }
      }

      // Successful registration setup
      const newManager: ManagerProfile = {
        email: regEmail,
        username: regUsername,
        role: 'Site Administrator',
        joinedAt: new Date().toLocaleDateString('uk-UA'),
        status: 'online'
      };

      setManagers(prev => [...prev, newManager]);
      setManagerUser(newManager);
      localStorage.setItem('volk_manager_profile', JSON.stringify(newManager));
      localStorage.setItem('volk_manager_session', 'true');
      setIsAuthed(true);
      showToast('Реєстрація успішна! Ласкаво просимо до панелі керування.', 'success');
    } catch (err: any) {
      setAuthError(err.message || 'Сталася помилка при реєстрації');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      if (useSupabase) {
        const { data: logInData, error: logInError } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password: loginPass
        });

        if (logInError) throw logInError;

        if (logInData?.user) {
          // Verify profile role is admin
          const { data: profile, error: profileErr } = await supabase
            .from('profiles')
            .select('role, username')
            .eq('id', logInData.user.id)
            .single();

          if (!profileErr && profile && profile.role !== 'admin') {
            await supabase.auth.signOut();
            throw new Error('Доступ заблоковано: Цей обліковий запис не є адміністратором.');
          }

          const activeManager: ManagerProfile = {
            email: loginEmail,
            username: profile?.username || 'Admin User',
            role: profile?.role === 'admin' ? 'Super Admin' : 'Moderator',
            joinedAt: new Date().toLocaleDateString('uk-UA'),
            status: 'online'
          };
          setManagerUser(activeManager);
          localStorage.setItem('volk_manager_profile', JSON.stringify(activeManager));
        }
      } else {
        // Local/offline credentials fallback validation
        // Search in local managers list
        const matched = managers.find(m => m.email === loginEmail);
        if (loginEmail && loginPass.length >= 6) {
          const activeManager: ManagerProfile = matched || {
            email: loginEmail,
            username: loginEmail.split('@')[0],
            role: 'Site Administrator',
            joinedAt: new Date().toLocaleDateString('uk-UA'),
            status: 'online'
          };
          setManagerUser(activeManager);
          localStorage.setItem('volk_manager_profile', JSON.stringify(activeManager));
        } else {
          throw new Error('Введіть коректну адресу та пароль (мін. 6 символів)');
        }
      }

      localStorage.setItem('volk_manager_session', 'true');
      setIsAuthed(true);
      showToast('Вхід успішний! Сесія адміністрування розпочата.', 'success');
    } catch (err: any) {
      setAuthError(err.message || 'Помилка авторизації керуючого');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('volk_manager_session');
    localStorage.removeItem('volk_manager_profile');
    setIsAuthed(false);
    showToast('Ви вийшли з панелі керування.', 'info');
  };

  const handleImageUpload = async (file: File, isEdit: boolean) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    const filePath = `banners/${fileName}`;

    if (useSupabase) {
      showToast('Завантаження зображення...', 'info');
      const { data, error } = await supabase.storage.from('banners').upload(filePath, file);
      if (error) {
        console.error('Supabase upload error:', error);
        showToast('Помилка завантаження. Створіть бакет "banners" у Supabase або вставте посилання.', 'error');
        return;
      }
      const { data: urlData } = supabase.storage.from('banners').getPublicUrl(filePath);
      if (isEdit) {
        setEditTourneyForm(prev => ({ ...prev, imageUrl: urlData.publicUrl }));
      } else {
        setTourneyForm(prev => ({ ...prev, imageUrl: urlData.publicUrl }));
      }
      showToast('Зображення завантажено в Supabase!', 'success');
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 450;
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          
          if (isEdit) {
            setEditTourneyForm(prev => ({ ...prev, imageUrl: dataUrl }));
          } else {
            setTourneyForm(prev => ({ ...prev, imageUrl: dataUrl }));
          }
          showToast('Зображення стиснуто локально!', 'success');
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditTourneySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTourneyForm.name.trim()) return;

    const prizeNum = parseInt(editTourneyForm.prizePool.replace(/\D/g, '')) || 25000;

    updateTournament(editingTourney.id, {
      name: editTourneyForm.name.toUpperCase(),
      type: editTourneyForm.type,
      date: editTourneyForm.date || 'Сьогодні, 20:00',
      prizePool: `${prizeNum.toLocaleString('uk-UA')} 🪙`,
      prizePlaces: {
        first: `${(parseInt(editTourneyForm.prizeFirst.replace(/\D/g, '')) || Math.round(prizeNum * 0.5)).toLocaleString('uk-UA')} 🪙`,
        second: `${(parseInt(editTourneyForm.prizeSecond.replace(/\D/g, '')) || Math.round(prizeNum * 0.3)).toLocaleString('uk-UA')} 🪙`,
        third: `${(parseInt(editTourneyForm.prizeThird.replace(/\D/g, '')) || Math.round(prizeNum * 0.2)).toLocaleString('uk-UA')} 🪙`
      },
      maxParticipants: editTourneyForm.maxParticipants,
      map: editTourneyForm.map,
      rules: editTourneyForm.rules.split('\n').filter(r => r.trim()),
      imageUrl: editTourneyForm.imageUrl || MAP_PRESETS[editTourneyForm.map] || '',
      status: editTourneyForm.status
    });

    setTerminalLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Updated tournament "${editTourneyForm.name.toUpperCase()}" settings.`
    ]);

    setEditingTourney(null);
  };

  // ─── TOURNAMENT MANAGEMENT HANDLERS ───

  const handleCreateTourneySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tourneyForm.name.trim()) return;

    const prizeNum = parseInt(tourneyForm.prize.replace(/\D/g, '')) || 25000;
    
    createTournament({
      name: tourneyForm.name.toUpperCase(),
      type: tourneyForm.type,
      date: tourneyForm.date || 'Сьогодні, 20:00',
      prizePool: `${prizeNum.toLocaleString('uk-UA')} 🪙`,
      prizePlaces: {
        first: `${Math.round(prizeNum * 0.5).toLocaleString('uk-UA')} 🪙`,
        second: `${Math.round(prizeNum * 0.3).toLocaleString('uk-UA')} 🪙`,
        third: `${Math.round(prizeNum * 0.2).toLocaleString('uk-UA')} 🪙`
      },
      maxParticipants: tourneyForm.maxParticipants,
      map: tourneyForm.map,
      system: 'Single Elimination',
      rules: tourneyForm.rules.split('\n').filter(r => r.trim()),
      imageUrl: tourneyForm.imageUrl || MAP_PRESETS[tourneyForm.map] || ''
    });

    // Add log entry
    setTerminalLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Created new tournament: "${tourneyForm.name.toUpperCase()}" (${tourneyForm.type}) with a prize pool of ${prizeNum.toLocaleString()} 🪙`
    ]);

    setTourneyForm({
      name: '', type: '2X2', prize: '25 000', map: 'de_dust2', date: '', maxParticipants: 16,
      rules: 'Format: Single Elimination\nNo cheats permitted\nMatches are streamed live\nCaptain must report scores',
      imageUrl: ''
    });

    setActiveTab('tournaments');
    showToast('Турнір успішно створено!', 'success');
  };

  // ─── MATCH SIMULATOR INJECTORS ───

  const startSelectedMatchLive = (matchId: string) => {
    setMatchLive(matchId);
    setTerminalLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Match [${matchId.substring(0, 8)}] set LIVE. Simulation sequence armed.`
    ]);
  };

  const adjustScore = (matchId: string, team: 'A' | 'B', currentA: number, currentB: number, change: number) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    const nextScoreA = team === 'A' ? Math.max(0, currentA + change) : currentA;
    const nextScoreB = team === 'B' ? Math.max(0, currentB + change) : currentB;

    setMatchScore(matchId, nextScoreA, nextScoreB, 'live', null);

    setTerminalLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Adjusted match score: ${match.teamA?.name || 'A'} [${nextScoreA}:${nextScoreB}] ${match.teamB?.name || 'B'}`
    ]);
  };

  const finishMatchWithScore = (matchId: string, finalA: number, finalB: number) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    const winnerId = finalA > finalB ? (match.teamA?.id || null) : (match.teamB?.id || null);
    
    setMatchScore(matchId, finalA, finalB, 'finished', winnerId);
    setSelectedMatchId(null);

    setTerminalLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Resolved match finished: winner [${winnerId?.substring(0, 8)}] Score [${finalA}:${finalB}]`
    ]);
    showToast('Матч завершено, ставки розраховані!', 'success');
  };

  const injectMatchLog = (matchId: string) => {
    if (!customLog.trim()) return;
    
    // Simulating app context score logs injection
    setTerminalLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] INJECTED LIVE MATCH LOG: "${customLog}"`
    ]);

    setCustomLog('');
    showToast('Коментар впроваджено в трансляцію!', 'success');
  };

  // ─── STYLES & LAYOUTS ───

  const activeMatch = matches.find(m => m.id === selectedMatchId);

  // Stat Counters
  const liveMatchesCount = matches.filter(m => m.status === 'live').length;
  const upcomingMatchesCount = matches.filter(m => m.status === 'scheduled').length;
  const totalRegisteredTeams = Object.values(teams).reduce((a, b) => a + b.length, 0);

  // ─── RENDER: AUTH GATE ───

  if (!isAuthed) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#040406',
        backgroundImage: 'radial-gradient(circle at 50% -20%, rgba(255, 92, 0, 0.15) 0%, transparent 60%), radial-gradient(circle at 10% 90%, rgba(139, 92, 246, 0.08) 0%, transparent 50%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        color: '#fff',
        fontFamily: 'Inter, sans-serif'
      }}>
        {/* Animated Cyber Lines */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'radial-gradient(circle, transparent 20%, #040406 80%)',
          pointerEvents: 'none',
          zIndex: 1
        }} />

        <div style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth: '460px',
          background: 'rgba(12, 12, 18, 0.75)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 92, 0, 0.15)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 40px rgba(255, 92, 0, 0.03)',
          borderRadius: '32px',
          padding: '48px 40px 32px',
          overflow: 'hidden'
        }}>
          {/* Header Banner */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '36px', textAlign: 'center' }}>
            <div style={{
              width: '72px', height: '72px',
              borderRadius: '22px',
              background: 'linear-gradient(135deg, rgba(255, 92, 0, 0.2), rgba(139, 92, 246, 0.15))',
              border: '1px solid rgba(255, 92, 0, 0.3)',
              boxShadow: '0 8px 30px rgba(255, 92, 0, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <Shield size={36} color="#FF5C00" />
            </div>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '28px', fontWeight: '950', letterSpacing: '4px', margin: 0, color: '#fff' }}>
              COMMAND CENTER
            </h1>
            <span style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '3px', color: '#FF5C00', textTransform: 'uppercase', marginTop: '6px' }}>
              Керування Платформою VOLKI
            </span>
          </div>

          {/* Form Switcher tabs */}
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '16px',
            padding: '4px',
            marginBottom: '28px'
          }}>
            <button 
              type="button" 
              onClick={() => { setAuthMode('login'); setAuthError(''); }}
              style={{
                flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
                fontFamily: 'Outfit', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px',
                background: authMode === 'login' ? 'linear-gradient(135deg, #FF5C00, #E04F00)' : 'transparent',
                color: authMode === 'login' ? '#fff' : '#8F8F9B',
                cursor: 'pointer', transition: 'all 0.25s'
              }}
            >
              Вхід
            </button>
            <button 
              type="button" 
              onClick={() => { setAuthMode('register'); setAuthError(''); }}
              style={{
                flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
                fontFamily: 'Outfit', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px',
                background: authMode === 'register' ? 'linear-gradient(135deg, #FF5C00, #E04F00)' : 'transparent',
                color: authMode === 'register' ? '#fff' : '#8F8F9B',
                cursor: 'pointer', transition: 'all 0.25s'
              }}
            >
              Реєстрація керуючих
            </button>
          </div>

          {/* Errors display */}
          {authError && (
            <div style={{
              display: 'flex', alignItems: 'start', gap: '10px',
              background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '14px', padding: '14px 16px', marginBottom: '24px'
            }}>
              <AlertCircle size={16} color="#EF4444" style={{ marginTop: '2px', flexShrink: 0 }} />
              <span style={{ fontSize: '12px', color: '#FCA5A5', fontWeight: '600', lineHeight: '1.4' }}>{authError}</span>
            </div>
          )}

          {/* Form Content */}
          {authMode === 'login' ? (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '10px', fontWeight: '800', color: '#8F8F9B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Електронна Пошта
                </label>
                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '0 16px' }}>
                  <Mail size={16} color="#FF5C00" style={{ marginRight: '12px', flexShrink: 0 }} />
                  <input 
                    type="email" 
                    placeholder="manager@volki.app"
                    required
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    style={{
                      background: 'none', border: 'none', padding: '14px 0', color: 'white', outline: 'none', fontSize: '13px', width: '100%', fontFamily: 'Outfit'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '10px', fontWeight: '800', color: '#8F8F9B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Пароль
                </label>
                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '0 16px' }}>
                  <Lock size={16} color="#FF5C00" style={{ marginRight: '12px', flexShrink: 0 }} />
                  <input 
                    type={showLoginPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    required
                    value={loginPass}
                    onChange={e => setLoginPass(e.target.value)}
                    style={{
                      background: 'none', border: 'none', padding: '14px 0', color: 'white', outline: 'none', fontSize: '13px', width: '100%', fontFamily: 'Outfit'
                    }}
                  />
                  <button type="button" onClick={() => setShowLoginPass(!showLoginPass)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#51515E' }}>
                    {showLoginPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={authLoading}
                className="btn-primary"
                style={{ width: '100%', padding: '16px', borderRadius: '14px', marginTop: '12px', fontSize: '13px' }}
              >
                {authLoading ? 'Підключення...' : 'Авторизуватись в системі'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10px', fontWeight: '800', color: '#8F8F9B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Адреса Ел. Пошти
                </label>
                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '0 16px' }}>
                  <Mail size={16} color="#FF5C00" style={{ marginRight: '12px', flexShrink: 0 }} />
                  <input 
                    type="email" 
                    placeholder="name@volki.gg"
                    required
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    style={{
                      background: 'none', border: 'none', padding: '12px 0', color: 'white', outline: 'none', fontSize: '13px', width: '100%', fontFamily: 'Outfit'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10px', fontWeight: '800', color: '#8F8F9B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Ім'я Користувача
                </label>
                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '0 16px' }}>
                  <User size={16} color="#FF5C00" style={{ marginRight: '12px', flexShrink: 0 }} />
                  <input 
                    type="text" 
                    placeholder="Chief_Organizer"
                    required
                    value={regUsername}
                    onChange={e => setRegUsername(e.target.value)}
                    style={{
                      background: 'none', border: 'none', padding: '12px 0', color: 'white', outline: 'none', fontSize: '13px', width: '100%', fontFamily: 'Outfit'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10px', fontWeight: '800', color: '#8F8F9B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Пароль
                </label>
                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '0 16px' }}>
                  <Lock size={16} color="#FF5C00" style={{ marginRight: '12px', flexShrink: 0 }} />
                  <input 
                    type={showRegPass ? 'text' : 'password'}
                    placeholder="Мінімум 6 знаків"
                    required
                    minLength={6}
                    value={regPass}
                    onChange={e => setRegPass(e.target.value)}
                    style={{
                      background: 'none', border: 'none', padding: '12px 0', color: 'white', outline: 'none', fontSize: '13px', width: '100%', fontFamily: 'Outfit'
                    }}
                  />
                  <button type="button" onClick={() => setShowRegPass(!showRegPass)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#51515E' }}>
                    {showRegPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10px', fontWeight: '800', color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Key size={10} /> Код Доступу Керуючого
                </label>
                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '14px', padding: '0 16px' }}>
                  <Key size={16} color="#EF4444" style={{ marginRight: '12px', flexShrink: 0 }} />
                  <input 
                    type="text" 
                    placeholder="Введіть секретний код адміна"
                    required
                    value={regCode}
                    onChange={e => setRegCode(e.target.value)}
                    style={{
                      background: 'none', border: 'none', padding: '12px 0', color: 'white', outline: 'none', fontSize: '13px', width: '100%', fontFamily: 'Outfit'
                    }}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={authLoading}
                className="btn-primary"
                style={{ width: '100%', padding: '15px', borderRadius: '14px', marginTop: '10px', fontSize: '13px' }}
              >
                {authLoading ? 'Створення...' : 'Зареєструвати аккаунт керуючого'}
              </button>
            </form>
          )}

          {onExitAdmin && (
            <button 
              onClick={onExitAdmin} 
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: '#8F8F9B',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: '700',
                marginTop: '20px',
                textAlign: 'center',
                fontFamily: 'Outfit',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                transition: 'color 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = '#8F8F9B'}
            >
              ← Повернутися до Головного Сайту
            </button>
          )}
          <div style={{ textAlign: 'center', color: '#51515E', fontSize: '10px', marginTop: '32px', letterSpacing: '0.5px' }}>
            Сесія захищена шифруванням. Тільки авторизовані менеджери.
          </div>
        </div>
      </div>
    );
  }

  // ─── RENDER: COMMAND CENTER DASHBOARD ───

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#06060A',
      color: '#fff',
      fontFamily: 'Inter, Outfit, sans-serif'
    }}>
      
      {/* ─── SIDEBAR ─── */}
      <div style={{
        width: '280px',
        background: '#0B0B11',
        borderRight: '1px solid rgba(255, 255, 255, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        height: '100vh',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        {/* Brand Logo */}
        <div style={{ padding: '28px 24px', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(255, 92, 0, 0.2), rgba(139, 92, 246, 0.1))',
            border: '1px solid rgba(255, 92, 0, 0.3)',
            display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center'
          }}>
            <Shield size={20} color="#FF5C00" />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '950', fontFamily: 'Outfit', letterSpacing: '2px' }}>VOLKI 13:03</div>
            <div style={{ fontSize: '9px', color: '#FF5C00', fontWeight: '800', letterSpacing: '2px', textTransform: 'uppercase' }}>COMMAND WORKSPACE</div>
          </div>
        </div>

        {/* Manager User Quick Info */}
        <div style={{
          padding: '16px 20px',
          background: 'rgba(255, 255, 255, 0.01)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #FF5C00, #8B5CF6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', fontWeight: '800', color: 'white', fontFamily: 'Outfit'
          }}>
            {managerUser.username?.substring(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: '13px', fontWeight: '750', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'Outfit' }}>
              {managerUser.username}
            </div>
            <div style={{ fontSize: '10px', color: '#FF5C00', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {managerUser.role}
            </div>
          </div>
        </div>

        {/* Menu Navigation */}
        <div style={{ flex: 1, padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {[
            { id: 'dashboard', label: 'Огляд Системи', icon: <Activity size={16} /> },
            { id: 'tournaments', label: 'Турніри & Сітки', icon: <Trophy size={16} /> },
            { id: 'matches', label: 'Симулятор Матчів', icon: <Swords size={16} /> },
            { id: 'managers', label: 'Керуючі Сайтом', icon: <Users size={16} /> },
            { id: 'analytics', label: 'Аналітика & Дані', icon: <BarChart3 size={16} /> },
            { id: 'settings', label: 'Налаштування', icon: <Settings size={16} /> }
          ].map(item => {
            const isTabActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any);
                  if (item.id !== 'matches') setSelectedMatchId(null);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 24px', border: 'none', outline: 'none',
                  fontSize: '13px', fontWeight: isTabActive ? '750' : '500',
                  fontFamily: 'Outfit, sans-serif',
                  background: isTabActive ? 'rgba(255, 92, 0, 0.08)' : 'transparent',
                  color: isTabActive ? '#FF5C00' : '#8F8F9B',
                  borderLeft: isTabActive ? '4px solid #FF5C00' : '4px solid transparent',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
                }}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Action button footers */}
        <div style={{ padding: '20px 24px', borderTop: '1px solid rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {onExitAdmin && (
            <button
              onClick={onExitAdmin}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '10px', padding: '10px 14px', fontSize: '11px', fontWeight: '700',
                color: '#ccc', cursor: 'pointer', fontFamily: 'Outfit', textTransform: 'uppercase', letterSpacing: '0.5px'
              }}
            >
              ← До Головного Сайту
            </button>
          )}
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)',
              borderRadius: '10px', padding: '10px 14px', fontSize: '11px', fontWeight: '700',
              color: '#EF4444', cursor: 'pointer', fontFamily: 'Outfit', textTransform: 'uppercase', letterSpacing: '0.5px'
            }}
          >
            <LogOut size={12} /> Завершити Сесію
          </button>
        </div>
      </div>

      {/* ─── MAIN WORKSPACE PANEL ─── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden'
      }}>
        
        {/* Workspace Top Header */}
        <div style={{
          height: '80px',
          borderBottom: '1px solid rgba(255,255,255,0.03)',
          background: 'rgba(11, 11, 17, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 36px',
          backdropFilter: 'blur(8px)',
          flexShrink: 0
        }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '900', letterSpacing: '0.5px', fontFamily: 'Outfit', textTransform: 'uppercase', margin: 0 }}>
              {activeTab === 'dashboard' && '📊 Панель Огляду Системи'}
              {activeTab === 'tournaments' && '🏆 Керування Турнірами & Сітками'}
              {activeTab === 'matches' && '⚔️ Симулятор Матчів & Запис Рахунків'}
              {activeTab === 'managers' && '👥 Облікові Записи Керуючих'}
              {activeTab === 'analytics' && '📈 Аналітика Платформи & Користувачі'}
              {activeTab === 'settings' && '⚙️ Системні Налаштування'}
            </h2>
          </div>

          {/* Connection Indicators */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981', boxShadow: '0 0 8px #10B981', display: 'inline-block' }}></span>
              <span style={{ fontSize: '11px', color: '#8F8F9B', fontWeight: '600' }}>База даних: {useSupabase ? 'Supabase Cloud' : 'Локальна'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981', boxShadow: '0 0 8px #10B981', display: 'inline-block' }}></span>
              <span style={{ fontSize: '11px', color: '#8F8F9B', fontWeight: '600' }}>Статус сервера: ACTIVE</span>
            </div>
          </div>
        </div>

        {/* ─── SCROLLABLE WORKSPACE CONTAINER ─── */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '36px',
          background: '#08080C'
        }}>
          
          {/* ============================================================
              TAB: DASHBOARD OVERVIEW
             ============================================================ */}
          {activeTab === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              
              {/* Stats Bento Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '18px' }}>
                {[
                  { title: 'Активні Турніри', count: tournaments.length, color: '#FF5C00', desc: 'Усього створено сіток' },
                  { title: 'Зареєстровано Команд', count: totalRegisteredTeams, color: '#10B981', desc: 'Склади гравців платформи' },
                  { title: 'Матчі LIVE / Scheduled', count: `${liveMatchesCount} / ${upcomingMatchesCount}`, color: '#3B82F6', desc: 'Активний розклад ігор' },
                  { title: "Об'єм Ставок (Mock)", count: '142 850 🪙', color: '#8B5CF6', desc: 'Прийнятий обсяг прогнозів' }
                ].map((stat, i) => (
                  <div key={i} className="esports-card" style={{
                    padding: '24px',
                    background: `linear-gradient(135deg, ${stat.color}08 0%, rgba(16, 16, 25, 0.4) 100%)`,
                    border: '1px solid rgba(255, 255, 255, 0.03)'
                  }}>
                    <span style={{ fontSize: '10px', color: '#8F8F9B', fontWeight: '750', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.title}</span>
                    <div style={{ fontSize: '32px', fontWeight: '950', fontFamily: 'Outfit', color: stat.color, margin: '8px 0 4px' }}>{stat.count}</div>
                    <span style={{ fontSize: '11px', color: '#51515E' }}>{stat.desc}</span>
                  </div>
                ))}
              </div>

              {/* Main Dashboard Panel Layout */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
                
                {/* Live Platform Action Monitor Console */}
                <div className="esports-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', minHeight: '380px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', fontFamily: 'Outfit', color: '#ccc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Activity size={14} color="#FF5C00" /> LIVE Термінал Активності Платформи
                    </h3>
                    <span style={{ fontSize: '9px', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                      ● LIVE СТРІМ
                    </span>
                  </div>

                  {/* Monospace Output */}
                  <div style={{
                    flex: 1,
                    background: '#020204',
                    border: '1px solid rgba(255, 255, 255, 0.03)',
                    borderRadius: '12px',
                    padding: '16px',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    color: '#4ADE80',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    maxHeight: '300px'
                  }}>
                    {terminalLogs.map((log, i) => (
                      <div key={i} style={{ lineBreak: 'anywhere' }}>{log}</div>
                    ))}
                    <div ref={terminalBottomRef} />
                  </div>
                </div>

                {/* Quick actions cover */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Platform Health Widget */}
                  <div className="esports-card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', fontFamily: 'Outfit', color: '#ccc', marginBottom: '14px' }}>
                      Системні Індикатори
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {[
                        { label: 'Навантаження CPU', val: '14%', color: '#10B981' },
                        { label: 'Використання RAM', val: '54%', color: '#10B981' },
                        { label: 'Вебсокети сполучення', val: '28 / 200 max', color: '#3B82F6' },
                        { label: 'Час безперебійної роботи', val: '32d 14h 28m', color: '#FF5C00' }
                      ].map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                          <span style={{ color: '#8F8F9B' }}>{item.label}</span>
                          <span style={{ color: item.color, fontWeight: '700' }}>{item.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Dev / Manager Quick Actions */}
                  <div className="esports-card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', fontFamily: 'Outfit', color: '#ccc', marginBottom: '14px' }}>
                      Швидкі Посилання
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                      <button 
                        onClick={() => setActiveTab('tournaments')}
                        style={{
                          background: 'rgba(255, 92, 0, 0.05)', border: '1px solid rgba(255, 92, 0, 0.15)',
                          borderRadius: '10px', padding: '12px', fontSize: '12px', fontWeight: '700',
                          color: '#FF5C00', cursor: 'pointer', fontFamily: 'Outfit', textAlign: 'left',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}
                      >
                        Створити Турнірную Сітку <PlusCircle size={14} />
                      </button>
                      <button 
                        onClick={() => setActiveTab('matches')}
                        style={{
                          background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: '10px', padding: '12px', fontSize: '12px', fontWeight: '700',
                          color: '#ccc', cursor: 'pointer', fontFamily: 'Outfit', textAlign: 'left',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}
                      >
                        Керувати Live Рахунками <Swords size={14} />
                      </button>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ============================================================
              TAB: TOURNAMENTS MANAGER (Cover + Actions)
             ============================================================ */}
          {activeTab === 'tournaments' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '28px' }}>
              
              {/* Tournaments list cover section */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', fontFamily: 'Outfit', color: '#ccc', margin: 0 }}>
                    Активні Турнірні Сітки ({tournaments.length})
                  </h3>
                  {tournaments.length > 0 && (
                    <button
                      onClick={() => {
                        if (confirm('Ви впевнені, що хочете видалити ВСІ турніри? Це також видалить усі пов\'язані матчі, команди та ставки.')) {
                          tournaments.forEach(t => deleteTournament(t.id));
                          setTerminalLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Deleted all tournaments.`]);
                          showToast('Усі турніри видалено', 'info');
                        }
                      }}
                      style={{
                        background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '6px', padding: '4px 10px', fontSize: '11px', color: '#EF4444', fontWeight: '700',
                        fontFamily: 'Outfit', cursor: 'pointer'
                      }}
                    >
                      Видалити всі
                    </button>
                  )}
                </div>

                {tournaments.length === 0 ? (
                  <div className="esports-card" style={{ padding: '60px', textAlign: 'center', color: '#51515E' }}>
                    <Trophy size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
                    <p style={{ fontSize: '15px', fontWeight: '700', color: '#8F8F9B' }}>Турнірів ще не створено</p>
                    <p style={{ fontSize: '11px', marginTop: '6px' }}>Скористайтеся конструктором праворуч для створення</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {tournaments.map(t => {
                      const tTeams = teams[t.id] || [];
                      const tMatches = matches.filter(m => m.tournamentId === t.id);

                      return (
                        <div key={t.id} className="esports-card" style={{ padding: '20px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                            <div>
                              <h4 style={{ fontSize: '16px', fontWeight: '900', fontFamily: 'Outfit', color: 'white' }}>{t.name}</h4>
                              <span style={{
                                background: t.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : t.status === 'completed' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255, 92, 0, 0.1)',
                                color: t.status === 'active' ? '#10B981' : t.status === 'completed' ? '#8B5CF6' : '#FF5C00',
                                padding: '2px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: '800', textTransform: 'uppercase',
                                marginTop: '4px', display: 'inline-block'
                              }}>
                                {t.status === 'active' ? 'АКТИВНИЙ' : t.status === 'completed' ? 'ЗАВЕРШЕНИЙ' : 'ОЧІКУВАННЯ'}
                              </span>
                            </div>
                            
                            {/* Actions controls */}
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {t.status === 'upcoming' && (
                                <button 
                                  onClick={() => {
                                    updateTournament(t.id, { status: 'active' });
                                    showToast('Турнір переведено в активний статус!', 'info');
                                  }}
                                  style={{
                                    background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)',
                                    borderRadius: '8px', padding: '6px 12px', fontSize: '11px', color: '#10B981', fontWeight: '700',
                                    fontFamily: 'Outfit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                                  }}
                                >
                                  <Play size={10} /> Запустити
                                </button>
                              )}
                              <button 
                                onClick={() => {
                                  generateBracketForTournament(t.id);
                                  setTerminalLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Generated grid bracket for tournament "${t.name}"`]);
                                }}
                                style={{
                                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                                  borderRadius: '8px', padding: '6px 12px', fontSize: '11px', color: '#ccc', fontWeight: '700',
                                  fontFamily: 'Outfit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                                }}
                              >
                                <RefreshCw size={10} /> Згенерувати сітку
                              </button>
                              <button 
                                onClick={() => {
                                  setEditingTourney(t);
                                  setEditTourneyForm({
                                    id: t.id,
                                    name: t.name,
                                    type: t.type,
                                    prizePool: t.prizePool.replace(' 🪙', ''),
                                    prizeFirst: t.prizePlaces.first.replace(' 🪙', ''),
                                    prizeSecond: t.prizePlaces.second.replace(' 🪙', ''),
                                    prizeThird: t.prizePlaces.third.replace(' 🪙', ''),
                                    maxParticipants: t.maxParticipants,
                                    map: t.map,
                                    date: t.date,
                                    rules: (t.rules || []).join('\n'),
                                    imageUrl: t.imageUrl || '',
                                    status: t.status
                                  });
                                }}
                                style={{
                                  background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)',
                                  borderRadius: '8px', padding: '8px', color: '#3B82F6', cursor: 'pointer'
                                }}
                                title="Редагувати"
                              >
                                <Edit3 size={12} />
                              </button>
                              <button 
                                onClick={() => {
                                  if (confirm(`Ви впевнені, що хочете видалити турнір "${t.name}"?`)) {
                                    deleteTournament(t.id);
                                    setTerminalLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Deleted tournament: "${t.name}"`]);
                                  }
                                }}
                                style={{
                                  background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)',
                                  borderRadius: '8px', padding: '6px 12px', fontSize: '11px', color: '#EF4444', fontWeight: '700',
                                  fontFamily: 'Outfit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                                }}
                              >
                                <Trash2 size={10} /> Видалити
                              </button>
                            </div>
                          </div>

                          {/* Tournament stats bar */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '11px', color: '#8F8F9B', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '12px', marginTop: '12px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Activity size={12} color="#FF5C00" /> Формат: {t.type}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12} /> Карта: {t.map}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={12} /> {tTeams.length} / {t.maxParticipants} команд</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Swords size={12} /> {tMatches.length} матчів</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#FF5C00', fontWeight: '800' }}><Award size={12} /> Фонд: {t.prizePool}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Tournament Generator Console */}
              <div className="esports-card" style={{ padding: '24px', height: 'fit-content' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', fontFamily: 'Outfit', color: '#ccc', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Plus size={16} color="#FF5C00" /> Конструктор Нових Турнірів
                </h3>

                <form onSubmit={handleCreateTourneySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '10px', fontWeight: '800', color: '#8F8F9B', textTransform: 'uppercase' }}>Назва Турніру</label>
                    <input 
                      type="text" 
                      required
                      placeholder="ESPORTS SUMMER AIM CUP"
                      value={tourneyForm.name}
                      onChange={e => setTourneyForm({ ...tourneyForm, name: e.target.value })}
                      style={{
                        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '10px', padding: '10px 14px', color: 'white', fontSize: '12px', outline: 'none', fontFamily: 'Outfit'
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '10px', fontWeight: '800', color: '#8F8F9B', textTransform: 'uppercase' }}>Формат Гри</label>
                      <select 
                        value={tourneyForm.type}
                        onChange={e => setTourneyForm({ ...tourneyForm, type: e.target.value as any })}
                        style={{
                          background: '#0B0B11', border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '10px', padding: '10px 14px', color: 'white', fontSize: '12px', outline: 'none', fontFamily: 'Outfit', cursor: 'pointer'
                        }}
                      >
                        <option value="2X2">2x2 Aim Match</option>
                        <option value="4X4">4x4 Classic</option>
                        <option value="BCI">Битва Кланів</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '10px', fontWeight: '800', color: '#8F8F9B', textTransform: 'uppercase' }}>Локація / Карта</label>
                      <select 
                        value={tourneyForm.map}
                        onChange={e => setTourneyForm({ ...tourneyForm, map: e.target.value })}
                        style={{
                          background: '#0B0B11', border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '10px', padding: '10px 14px', color: 'white', fontSize: '12px', outline: 'none', fontFamily: 'Outfit', cursor: 'pointer'
                        }}
                      >
                        {MAPS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '10px', fontWeight: '800', color: '#8F8F9B', textTransform: 'uppercase' }}>Призовий Фонд (🪙)</label>
                      <input 
                        type="text" 
                        required
                        placeholder="25 000"
                        value={tourneyForm.prize}
                        onChange={e => setTourneyForm({ ...tourneyForm, prize: e.target.value })}
                        style={{
                          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '10px', padding: '10px 14px', color: 'white', fontSize: '12px', outline: 'none', fontFamily: 'Outfit'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '10px', fontWeight: '800', color: '#8F8F9B', textTransform: 'uppercase' }}>Макс. Учасників</label>
                      <select 
                        value={tourneyForm.maxParticipants}
                        onChange={e => setTourneyForm({ ...tourneyForm, maxParticipants: Number(e.target.value) })}
                        style={{
                          background: '#0B0B11', border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '10px', padding: '10px 14px', color: 'white', fontSize: '12px', outline: 'none', fontFamily: 'Outfit', cursor: 'pointer'
                        }}
                      >
                        {[4, 8, 16, 32].map(n => <option key={n} value={n}>{n} команд</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '10px', fontWeight: '800', color: '#8F8F9B', textTransform: 'uppercase' }}>Дата Та Час</label>
                    <input 
                      type="text" 
                      placeholder="Завтра, 19:30"
                      value={tourneyForm.date}
                      onChange={e => setTourneyForm({ ...tourneyForm, date: e.target.value })}
                      style={{
                        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '10px', padding: '10px 14px', color: 'white', fontSize: '12px', outline: 'none', fontFamily: 'Outfit'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '10px', fontWeight: '800', color: '#8F8F9B', textTransform: 'uppercase' }}>Правила Турніру</label>
                    <textarea 
                      rows={3}
                      value={tourneyForm.rules}
                      onChange={e => setTourneyForm({ ...tourneyForm, rules: e.target.value })}
                      style={{
                        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '10px', padding: '10px 14px', color: 'white', fontSize: '12px', outline: 'none', fontFamily: 'Outfit', resize: 'vertical'
                      }}
                    />
                  </div>

                  {/* Photo / Banner configuration */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '10px', fontWeight: '800', color: '#8F8F9B', textTransform: 'uppercase' }}>Баннер / Фото Турніру</label>
                    
                    {/* Presets Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '8px' }}>
                      {Object.keys(MAP_PRESETS).map(mapName => {
                        const isPresetActive = tourneyForm.imageUrl === MAP_PRESETS[mapName];
                        return (
                          <button
                            key={mapName}
                            type="button"
                            onClick={() => setTourneyForm({ ...tourneyForm, imageUrl: MAP_PRESETS[mapName] })}
                            style={{
                              padding: '6px 4px',
                              background: isPresetActive ? 'rgba(255, 92, 0, 0.15)' : 'rgba(255,255,255,0.02)',
                              border: isPresetActive ? '1px solid #FF5C00' : '1px solid rgba(255,255,255,0.06)',
                              borderRadius: '8px',
                              fontSize: '8px',
                              color: isPresetActive ? '#FF5C00' : '#8F8F9B',
                              cursor: 'pointer',
                              textAlign: 'center',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              textOverflow: 'ellipsis',
                              fontFamily: 'Outfit'
                            }}
                          >
                            {mapName.replace('de_', '').toUpperCase()}
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom URL */}
                    <input 
                      type="text" 
                      placeholder="Вставте URL зображення або виберіть пресет вище"
                      value={tourneyForm.imageUrl}
                      onChange={e => setTourneyForm({ ...tourneyForm, imageUrl: e.target.value })}
                      style={{
                        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '10px', padding: '10px 14px', color: 'white', fontSize: '12px', outline: 'none', fontFamily: 'Outfit'
                      }}
                    />

                    {/* File Upload */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                      <input 
                        type="file" 
                        accept="image/*"
                        id="create-tourney-file-upload"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, false);
                        }}
                        style={{ display: 'none' }}
                      />
                      <label 
                        htmlFor="create-tourney-file-upload"
                        style={{
                          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px', padding: '8px 12px', fontSize: '10px', fontWeight: '800',
                          color: '#fff', cursor: 'pointer', fontFamily: 'Outfit', display: 'inline-block'
                        }}
                      >
                        Завантажити файл
                      </label>
                      {tourneyForm.imageUrl && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '10px', color: '#10B981', fontWeight: '700' }}>✓ Зображення готове</span>
                          <button 
                            type="button" 
                            onClick={() => setTourneyForm({ ...tourneyForm, imageUrl: '' })}
                            style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '10px', fontWeight: '700' }}
                          >
                            Очистити
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="btn-primary" 
                    style={{ width: '100%', padding: '14px', borderRadius: '10px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '6px' }}
                  >
                    <PlusCircle size={14} /> Створити Турнір та Профілі
                  </button>
                </form>
              </div>

            </div>
          )}

          {/* ============================================================
              TAB: MATCH SIMULATOR
             ============================================================ */}
          {activeTab === 'matches' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '28px' }}>
              
              {/* Matches List */}
              <div className="esports-card" style={{ padding: '24px', height: 'fit-content' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', fontFamily: 'Outfit', color: '#ccc', marginBottom: '16px' }}>
                  Список Турнірних Ігор ({matches.length})
                </h3>

                {matches.length === 0 ? (
                  <div style={{ padding: '40px 10px', textAlign: 'center', color: '#51515E' }}>
                    <Swords size={32} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
                    <p style={{ fontSize: '13px', fontWeight: '750' }}>Матчі відсутні</p>
                    <p style={{ fontSize: '11px', marginTop: '4px' }}>Сформуйте сітку у вкладці «Турніри»</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {matches.map(m => {
                      const isSelected = selectedMatchId === m.id;
                      return (
                        <div 
                          key={m.id} 
                          onClick={() => {
                            setSelectedMatchId(m.id);
                            setEditScoreA(m.scoreA);
                            setEditScoreB(m.scoreB);
                            setEditOddsA(m.oddsA || 1.85);
                            setEditOddsB(m.oddsB || 1.85);
                          }}
                          style={{
                            background: isSelected ? 'rgba(255, 92, 0, 0.05)' : 'rgba(255,255,255,0.01)',
                            border: isSelected ? '1px solid rgba(255, 92, 0, 0.3)' : '1px solid rgba(255,255,255,0.04)',
                            borderRadius: '12px',
                            padding: '12px 16px',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '9px', color: '#8F8F9B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              {m.tournamentName} · {m.roundName}
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: '700', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>{m.teamA?.name || 'TBD'}</span>
                              <span style={{ color: '#FF5C00' }}>vs</span>
                              <span>{m.teamB?.name || 'TBD'}</span>
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{
                              fontFamily: 'Outfit', fontWeight: '900', fontSize: '14px',
                              color: m.status === 'live' ? '#EF4444' : m.status === 'finished' ? '#10B981' : '#8F8F9B'
                            }}>
                              {m.scoreA} : {m.scoreB}
                            </span>
                            <span style={{
                              background: m.status === 'live' ? 'rgba(239, 68, 68, 0.1)' : m.status === 'finished' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 92, 0, 0.05)',
                              color: m.status === 'live' ? '#EF4444' : m.status === 'finished' ? '#10B981' : '#FF5C00',
                              padding: '2px 6px', borderRadius: '4px', fontSize: '8px', fontWeight: '800'
                            }}>
                              {m.status === 'live' ? '🔴 LIVE' : m.status === 'finished' ? 'DONE' : 'WAIT'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Match Control Dashboard (Simulation Panel) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {activeMatch ? (
                  <div className="esports-card" style={{ padding: '28px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '16px', marginBottom: '20px' }}>
                      <div>
                        <span style={{ fontSize: '10px', color: '#8F8F9B', textTransform: 'uppercase' }}>Симулятор Live Гри</span>
                        <h3 style={{ fontSize: '18px', fontWeight: '900', fontFamily: 'Outfit', marginTop: '4px' }}>
                          {activeMatch.teamA?.name || 'TBD'} vs {activeMatch.teamB?.name || 'TBD'}
                        </h3>
                        <span style={{ fontSize: '11px', color: '#51515E' }}>{activeMatch.tournamentName} ({activeMatch.roundName})</span>
                      </div>
                      <button 
                        onClick={() => setSelectedMatchId(null)}
                        style={{ background: 'none', border: 'none', color: '#8F8F9B', cursor: 'pointer' }}
                      >
                        <X size={18} />
                      </button>
                    </div>

                    {/* Simulation Parameters */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      
                      {/* Active Status Actions */}
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {activeMatch.status === 'scheduled' && (
                          <button 
                            onClick={() => startSelectedMatchLive(activeMatch.id)}
                            className="btn-primary"
                            style={{ padding: '12px 20px', borderRadius: '10px', fontSize: '12px' }}
                          >
                            <Play size={12} style={{ marginRight: '6px' }} /> Запустити LIVE Матч
                          </button>
                        )}
                        {activeMatch.status === 'live' && (
                          <button 
                            onClick={() => finishMatchWithScore(activeMatch.id, editScoreA, editScoreB)}
                            style={{
                              background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)',
                              borderRadius: '10px', padding: '12px 20px', fontSize: '12px', color: '#10B981', fontWeight: '700', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: '6px'
                            }}
                          >
                            <Check size={12} /> Завершити Матч & Виплатити Ставки
                          </button>
                        )}
                      </div>

                      {/* Interactive Score Board Editor */}
                      <div style={{
                        background: '#040406',
                        border: '1px solid rgba(255,255,255,0.03)',
                        borderRadius: '16px',
                        padding: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-around'
                      }}>
                        {/* Team A */}
                        <div style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: 'white', display: 'block', marginBottom: '8px' }}>
                            {activeMatch.teamA?.name || 'Team A'}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <button 
                              onClick={() => setEditScoreA(prev => Math.max(0, prev - 1))}
                              style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: 'rgba(255,255,255,0.03)', color: 'white', cursor: 'pointer', fontWeight: '800' }}
                            >
                              -
                            </button>
                            <span style={{ fontSize: '28px', fontWeight: '950', fontFamily: 'Outfit', minWidth: '32px' }}>{editScoreA}</span>
                            <button 
                              onClick={() => setEditScoreA(prev => prev + 1)}
                              style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: 'rgba(255,92,0,0.1)', color: '#FF5C00', cursor: 'pointer', fontWeight: '800' }}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <span style={{ fontSize: '24px', fontWeight: '900', color: '#51515E' }}>:</span>

                        {/* Team B */}
                        <div style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: 'white', display: 'block', marginBottom: '8px' }}>
                            {activeMatch.teamB?.name || 'Team B'}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <button 
                              onClick={() => setEditScoreB(prev => Math.max(0, prev - 1))}
                              style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: 'rgba(255,255,255,0.03)', color: 'white', cursor: 'pointer', fontWeight: '800' }}
                            >
                              -
                            </button>
                            <span style={{ fontSize: '28px', fontWeight: '950', fontFamily: 'Outfit', minWidth: '32px' }}>{editScoreB}</span>
                            <button 
                              onClick={() => setEditScoreB(prev => prev + 1)}
                              style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: 'rgba(255,92,0,0.1)', color: '#FF5C00', cursor: 'pointer', fontWeight: '800' }}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Fast Score Updater Button */}
                      {activeMatch.status === 'live' && (
                        <button 
                          onClick={() => {
                            setMatchScore(activeMatch.id, editScoreA, editScoreB, 'live', null);
                            showToast('Рахунок матчу оновлено!', 'info');
                          }}
                          style={{
                            background: 'rgba(255, 92, 0, 0.15)', border: '1px solid rgba(255, 92, 0, 0.3)',
                            borderRadius: '10px', padding: '12px', fontSize: '12px', color: '#FF5C00', fontWeight: '750', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                          }}
                        >
                          <Save size={14} /> Оновити рахунок на платформі
                        </button>
                      )}

                      {/* Match Odds (Coefficients) Editor */}
                      <div style={{
                        background: '#040406',
                        border: '1px solid rgba(255,255,255,0.03)',
                        borderRadius: '16px',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}>
                        <span style={{ fontSize: '10px', fontWeight: '800', color: '#8F8F9B', textTransform: 'uppercase' }}>
                          Коефіцієнти матчу (ставки на монетки)
                        </span>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                          {/* Odds A */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '10px', color: '#8F8F9B' }}>Коеф. на {activeMatch.teamA?.name || 'Team A'}</label>
                            <input 
                              type="number" 
                              step="0.01" 
                              min="1.01"
                              value={editOddsA}
                              onChange={e => setEditOddsA(Math.max(1.01, parseFloat(e.target.value) || 0))}
                              style={{
                                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '8px', padding: '8px 12px', color: 'white', fontSize: '12px', outline: 'none', fontFamily: 'Outfit'
                              }}
                            />
                          </div>

                          {/* Odds B */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '10px', color: '#8F8F9B' }}>Коеф. на {activeMatch.teamB?.name || 'Team B'}</label>
                            <input 
                              type="number" 
                              step="0.01" 
                              min="1.01"
                              value={editOddsB}
                              onChange={e => setEditOddsB(Math.max(1.01, parseFloat(e.target.value) || 0))}
                              style={{
                                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '8px', padding: '8px 12px', color: 'white', fontSize: '12px', outline: 'none', fontFamily: 'Outfit'
                              }}
                            />
                          </div>
                        </div>

                        <button 
                          onClick={() => {
                            updateMatchOdds(activeMatch.id, editOddsA, editOddsB);
                            setTerminalLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Updated match odds: ${editOddsA} vs ${editOddsB}`]);
                          }}
                          style={{
                            background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '10px', padding: '10px', fontSize: '11px', color: '#3B82F6', fontWeight: '750', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '4px'
                          }}
                        >
                          <Save size={12} /> Зберегти коефіцієнти
                        </button>
                      </div>

                      {/* Live commentary logger simulation injection */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '20px' }}>
                        <label style={{ fontSize: '10px', fontWeight: '800', color: '#8F8F9B', textTransform: 'uppercase' }}>
                          Впровадити Коментар LIVE ЛОГУ
                        </label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input 
                            type="text" 
                            placeholder="Гравець 1 робить неймовірний даблкіл на точці А..."
                            value={customLog}
                            onChange={e => setCustomLog(e.target.value)}
                            style={{
                              flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: '10px', padding: '10px 14px', color: 'white', fontSize: '12px', outline: 'none', fontFamily: 'Outfit'
                            }}
                          />
                          <button 
                            onClick={() => injectMatchLog(activeMatch.id)}
                            style={{
                              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                              borderRadius: '10px', padding: '10px 14px', color: '#ccc', cursor: 'pointer',
                              display: 'flex', alignItems: 'center'
                            }}
                          >
                            <Send size={14} />
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                ) : (
                  <div className="esports-card" style={{ padding: '60px', textAlign: 'center', color: '#51515E' }}>
                    <Swords size={48} style={{ margin: '0 auto 16px', opacity: 0.15 }} />
                    <p style={{ fontSize: '15px', fontWeight: '700', color: '#8F8F9B' }}>Жодної гри не вибрано</p>
                    <p style={{ fontSize: '11px', marginTop: '4px' }}>Клацніть на матч із лівого списку, щоб отримати доступ до симулятора</p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ============================================================
              TAB: MANAGERS LIST
             ============================================================ */}
          {activeTab === 'managers' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              
              {/* Register / Invite new Admin */}
              <div className="esports-card" style={{ padding: '24px', maxWidth: '640px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', fontFamily: 'Outfit', color: '#ccc', marginBottom: '14px' }}>
                  Налаштування Коду Реєстрації
                </h3>
                <p style={{ fontSize: '12px', color: '#8F8F9B', lineHeight: '1.5', marginBottom: '18px' }}>
                  Ви можете змінити Секретний Код Реєстрації керуючих нижче. Тільки ті користувачі, які введуть цей код під час реєстрації, зможуть отримати роль адміністратора.
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input 
                    type="text" 
                    value={managerInviteCode}
                    onChange={e => setRegCode(e.target.value)}
                    style={{
                      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '10px', padding: '10px 14px', color: 'white', fontSize: '12px', outline: 'none', fontFamily: 'Outfit', width: '200px'
                    }}
                  />
                  <button 
                    onClick={() => {
                      if (regCode.trim()) {
                        setManagerInviteCode(regCode.trim());
                        showToast('Код доступу адміністраторів оновлено!', 'success');
                      }
                    }}
                    className="btn-primary" 
                    style={{ padding: '10px 20px', borderRadius: '10px', fontSize: '12px' }}
                  >
                    Зберегти код
                  </button>
                </div>
              </div>

              {/* Registered Managers Table */}
              <div className="esports-card" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', fontFamily: 'Outfit', color: '#ccc', marginBottom: '16px' }}>
                  Список Авторизованих Менеджерів Платформи ({managers.length})
                </h3>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#8F8F9B' }}>
                      <th style={{ padding: '12px' }}>Користувач</th>
                      <th style={{ padding: '12px' }}>Ел. Пошта</th>
                      <th style={{ padding: '12px' }}>Роль</th>
                      <th style={{ padding: '12px' }}>Дата приєднання</th>
                      <th style={{ padding: '12px' }}>Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {managers.map((mgr, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '14px 12px', fontWeight: '700', color: 'white', fontFamily: 'Outfit' }}>
                          {mgr.username}
                        </td>
                        <td style={{ padding: '14px 12px', color: '#8F8F9B' }}>{mgr.email}</td>
                        <td style={{ padding: '14px 12px' }}>
                          <span style={{
                            background: mgr.role.includes('Super') ? 'rgba(255, 92, 0, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                            color: mgr.role.includes('Super') ? '#FF5C00' : '#8B5CF6',
                            padding: '2px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: '800'
                          }}>
                            {mgr.role}
                          </span>
                        </td>
                        <td style={{ padding: '14px 12px', color: '#51515E' }}>{mgr.joinedAt}</td>
                        <td style={{ padding: '14px 12px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: mgr.status === 'online' ? '#10B981' : '#51515E', fontWeight: '600' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: mgr.status === 'online' ? '#10B981' : '#51515E' }}></span>
                            {mgr.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* ============================================================
              TAB: PLATFORM ANALYTICS (SVG Charts Cover)
             ============================================================ */}
          {activeTab === 'analytics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              
              {/* Analytics header overview stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                {[
                  { label: 'Нові користувачі (Цей тиждень)', val: '+142 гравці', rate: '+12.4% відн. минулого' },
                  { label: 'Середній розмір ставки', val: '450 🪙', rate: 'Стабільно' },
                  { label: 'Коефіцієнт утримання (Retention)', val: '78.2%', rate: '+2.1% за місяць' }
                ].map((item, i) => (
                  <div key={i} className="esports-card" style={{ padding: '20px' }}>
                    <span style={{ fontSize: '10px', color: '#8F8F9B', textTransform: 'uppercase' }}>{item.label}</span>
                    <div style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'Outfit', margin: '6px 0', color: 'white' }}>{item.val}</div>
                    <span style={{ fontSize: '10px', color: '#10B981', fontWeight: '600' }}>{item.rate}</span>
                  </div>
                ))}
              </div>

              {/* Spline Custom SVG Charts Area */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
                
                {/* User registration curve */}
                <div className="esports-card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', fontFamily: 'Outfit', color: '#ccc', marginBottom: '20px' }}>
                    Динаміка Реєстрації Гравців (Травень)
                  </h3>

                  {/* Custom SVG Line Graph */}
                  <div style={{ position: 'relative', width: '100%', height: '220px' }}>
                    <svg viewBox="0 0 500 200" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                      <defs>
                        <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#FF5C00" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#FF5C00" stopOpacity="0" />
                        </linearGradient>
                      </defs>

                      {/* Grid Lines */}
                      <line x1="0" y1="50" x2="500" y2="50" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
                      <line x1="0" y1="100" x2="500" y2="100" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
                      <line x1="0" y1="150" x2="500" y2="150" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
                      
                      {/* Spline Path */}
                      <path 
                        d="M0 160 Q 80 120, 160 140 T 320 70 T 480 30" 
                        fill="none" 
                        stroke="#FF5C00" 
                        strokeWidth="3"
                        style={{ filter: 'drop-shadow(0 4px 10px rgba(255, 92, 0, 0.4))' }} 
                      />

                      {/* Area Under Spline */}
                      <path 
                        d="M0 160 Q 80 120, 160 140 T 320 70 T 480 30 L 480 200 L 0 200 Z" 
                        fill="url(#curveGrad)" 
                      />

                      {/* Points markers */}
                      <circle cx="160" cy="140" r="5" fill="#FF5C00" stroke="#fff" strokeWidth="2" />
                      <circle cx="320" cy="70" r="5" fill="#FF5C00" stroke="#fff" strokeWidth="2" />
                      <circle cx="480" cy="30" r="5" fill="#FF5C00" stroke="#fff" strokeWidth="2" />
                    </svg>
                  </div>
                  
                  {/* Axis Legend */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#51515E', marginTop: '12px', fontFamily: 'Outfit' }}>
                    <span>01 Трав</span>
                    <span>08 Трав</span>
                    <span>15 Трав</span>
                    <span>20 Трав (Сьогодні)</span>
                  </div>
                </div>

                {/* Betting Distribution */}
                <div className="esports-card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', fontFamily: 'Outfit', color: '#ccc', marginBottom: '20px' }}>
                    Розподіл Ставок за Дисциплінами
                  </h3>

                  {/* SVG Donut Chart */}
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '180px' }}>
                    <svg viewBox="0 0 100 100" style={{ width: '130px', height: '130px' }}>
                      {/* Background Donut */}
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255,255,255,0.02)" strokeWidth="12" />
                      
                      {/* CS2 2X2 portion (60%) */}
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="#FF5C00" strokeWidth="12" strokeDasharray="150 251.2" strokeDashoffset="0" />
                      
                      {/* CS2 4X4 portion (25%) */}
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="#8B5CF6" strokeWidth="12" strokeDasharray="62.8 251.2" strokeDashoffset="-150" />
                      
                      {/* BCI portion (15%) */}
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="#10B981" strokeWidth="12" strokeDasharray="38.4 251.2" strokeDashoffset="-212.8" />
                    </svg>
                  </div>

                  {/* Donut Legend */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', marginTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#FF5C00' }}></span> 2х2 Дуелі</span>
                      <span style={{ fontWeight: '700' }}>60%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#8B5CF6' }}></span> 4х4 Командні</span>
                      <span style={{ fontWeight: '700' }}>25%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#10B981' }}></span> Битви Кланів (BCI)</span>
                      <span style={{ fontWeight: '700' }}>15%</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ============================================================
              TAB: SETTINGS
             ============================================================ */}
          {activeTab === 'settings' && (
            <div className="esports-card" style={{ padding: '32px', maxWidth: '720px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '900', fontFamily: 'Outfit', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '14px', marginBottom: '24px' }}>
                Конфігурація Системи Управління
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Manager Access Code config */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#8F8F9B', textTransform: 'uppercase' }}>
                    Секретний Код Запрошення Керуючих (Invite Access Code)
                  </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input 
                      type="text" 
                      value={managerInviteCode}
                      onChange={e => setManagerInviteCode(e.target.value)}
                      style={{
                        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '10px', padding: '12px 16px', color: 'white', fontSize: '13px', outline: 'none', fontFamily: 'Outfit', width: '320px'
                      }}
                    />
                    <button 
                      onClick={() => {
                        if (managerInviteCode.trim()) {
                          showToast('Код запрошення оновлено успішно!', 'success');
                          setTerminalLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Manager Invitation access key modified.`]);
                        }
                      }}
                      className="btn-primary" 
                      style={{ padding: '0 24px', borderRadius: '10px', fontSize: '12px' }}
                    >
                      Зберегти зміни
                    </button>
                  </div>
                  <span style={{ fontSize: '11px', color: '#51515E', lineHeight: '1.4', marginTop: '4px' }}>
                    Цей пароль необхідний для реєстрації будь-якого нового облікового запису адміністратора. Захищає вашу платформу від несанкціонованого доступу.
                  </span>
                </div>

                {/* Maintenance switch */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: '800', fontFamily: 'Outfit', color: 'white' }}>Режим Технічних Робіт (Maintenance Mode)</h4>
                    <p style={{ fontSize: '11px', color: '#51515E', marginTop: '4px' }}>Призупиняє прийом ставок та реєстрацію гравців у додатку.</p>
                  </div>
                  <button 
                    onClick={() => {
                      showToast('Режим тех. робіт тимчасово недоступний!', 'info');
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '10px', padding: '10px 16px', color: '#8F8F9B', fontSize: '11px', fontWeight: '700', cursor: 'pointer'
                    }}
                  >
                    Включити
                  </button>
                </div>

                {/* Database reset */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '20px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '800', fontFamily: 'Outfit', color: '#EF4444' }}>Небезпечна Зона</h4>
                  <p style={{ fontSize: '11px', color: '#51515E', marginTop: '4px', marginBottom: '12px' }}>Видаляє локально збережені сесії, турніри та налаштування симулятора.</p>
                  <button 
                    onClick={async () => {
                      if (confirm('Скинути всю конфігурацію? Це видалить усі турніри, команди та матчі з сервера та локальної пам\'яті.')) {
                        await resetAllData();
                      }
                    }}
                    style={{
                      background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: '10px', padding: '10px 16px', color: '#EF4444', fontSize: '11px', fontWeight: '700', cursor: 'pointer'
                    }}
                  >
                    Скинути Базу даних
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>

      </div>

      {/* ─── EDIT TOURNAMENT MODAL ─── */}
      {editingTourney && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(6, 6, 10, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(12px)',
          padding: '20px',
          overflowY: 'auto'
        }}>
          <div style={{
            background: '#0B0B11',
            border: '1px solid rgba(255, 92, 0, 0.15)',
            borderRadius: '24px',
            padding: '28px',
            width: '100%',
            maxWidth: '650px',
            boxShadow: '0px 20px 50px rgba(0,0,0,0.6)',
            position: 'relative',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <button 
              onClick={() => setEditingTourney(null)}
              style={{
                position: 'absolute', top: '20px', right: '20px',
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', cursor: 'pointer'
              }}
            >
              <X size={16} />
            </button>

            <h3 style={{ fontSize: '18px', fontWeight: '900', fontFamily: 'Outfit', color: 'white', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={20} color="#FF5C00" /> Редагувати Турнір: {editingTourney.name}
            </h3>

            <form onSubmit={handleEditTourneySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10px', fontWeight: '800', color: '#8F8F9B', textTransform: 'uppercase' }}>Назва Турніру</label>
                <input 
                  type="text" 
                  required
                  value={editTourneyForm.name}
                  onChange={e => setEditTourneyForm({ ...editTourneyForm, name: e.target.value })}
                  style={{
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px', padding: '10px 14px', color: 'white', fontSize: '12px', outline: 'none', fontFamily: 'Outfit'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '10px', fontWeight: '800', color: '#8F8F9B', textTransform: 'uppercase' }}>Формат Гри</label>
                  <select 
                    value={editTourneyForm.type}
                    onChange={e => setEditTourneyForm({ ...editTourneyForm, type: e.target.value as any })}
                    style={{
                      background: '#06060A', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '10px', padding: '10px 14px', color: 'white', fontSize: '12px', outline: 'none', fontFamily: 'Outfit', cursor: 'pointer'
                    }}
                  >
                    <option value="2X2">2x2 Aim Match</option>
                    <option value="4X4">4x4 Classic</option>
                    <option value="BCI">Битва Кланів</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '10px', fontWeight: '800', color: '#8F8F9B', textTransform: 'uppercase' }}>Локація / Карта</label>
                  <select 
                    value={editTourneyForm.map}
                    onChange={e => setEditTourneyForm({ ...editTourneyForm, map: e.target.value })}
                    style={{
                      background: '#06060A', border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px', padding: '10px 14px', color: 'white', fontSize: '12px', outline: 'none', fontFamily: 'Outfit', cursor: 'pointer'
                    }}
                  >
                    {MAPS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '10px', fontWeight: '800', color: '#8F8F9B', textTransform: 'uppercase' }}>Дата</label>
                  <input 
                    type="text" 
                    value={editTourneyForm.date}
                    onChange={e => setEditTourneyForm({ ...editTourneyForm, date: e.target.value })}
                    style={{
                      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '10px', padding: '10px 14px', color: 'white', fontSize: '12px', outline: 'none', fontFamily: 'Outfit'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '10px', fontWeight: '800', color: '#8F8F9B', textTransform: 'uppercase' }}>Макс. Учасників</label>
                  <select 
                    value={editTourneyForm.maxParticipants}
                    onChange={e => setEditTourneyForm({ ...editTourneyForm, maxParticipants: Number(e.target.value) })}
                    style={{
                      background: '#06060A', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '10px', padding: '10px 14px', color: 'white', fontSize: '12px', outline: 'none', fontFamily: 'Outfit', cursor: 'pointer'
                    }}
                  >
                    {[4, 8, 16, 32].map(n => <option key={n} value={n}>{n} команд</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '10px', fontWeight: '800', color: '#FF5C00', textTransform: 'uppercase' }}>Статус</label>
                  <select 
                    value={editTourneyForm.status}
                    onChange={e => setEditTourneyForm({ ...editTourneyForm, status: e.target.value as any })}
                    style={{
                      background: '#06060A', border: '1px solid rgba(255, 92, 0, 0.25)',
                      borderRadius: '10px', padding: '10px 14px', color: '#FF5C00', fontSize: '12px', outline: 'none', fontFamily: 'Outfit', cursor: 'pointer', fontWeight: '700'
                    }}
                  >
                    <option value="upcoming">Upcoming (Очікується)</option>
                    <option value="active">Active (Йде зараз)</option>
                    <option value="completed">Completed (Завершено)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '10px', fontWeight: '800', color: '#8F8F9B', textTransform: 'uppercase' }}>Призовий Фонд</label>
                  <input 
                    type="text" 
                    value={editTourneyForm.prizePool}
                    onChange={e => setEditTourneyForm({ ...editTourneyForm, prizePool: e.target.value })}
                    style={{
                      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '10px', padding: '10px 14px', color: 'white', fontSize: '12px', outline: 'none', fontFamily: 'Outfit'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '10px', fontWeight: '800', color: '#FFD700', textTransform: 'uppercase' }}>1-е місце</label>
                  <input 
                    type="text" 
                    placeholder="50%"
                    value={editTourneyForm.prizeFirst}
                    onChange={e => setEditTourneyForm({ ...editTourneyForm, prizeFirst: e.target.value })}
                    style={{
                      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '10px', padding: '10px 14px', color: 'white', fontSize: '12px', outline: 'none', fontFamily: 'Outfit'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '10px', fontWeight: '800', color: '#C0C0C0', textTransform: 'uppercase' }}>2-е місце</label>
                  <input 
                    type="text" 
                    placeholder="30%"
                    value={editTourneyForm.prizeSecond}
                    onChange={e => setEditTourneyForm({ ...editTourneyForm, prizeSecond: e.target.value })}
                    style={{
                      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '10px', padding: '10px 14px', color: 'white', fontSize: '12px', outline: 'none', fontFamily: 'Outfit'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '10px', fontWeight: '800', color: '#CD7F32', textTransform: 'uppercase' }}>3-є місце</label>
                  <input 
                    type="text" 
                    placeholder="20%"
                    value={editTourneyForm.prizeThird}
                    onChange={e => setEditTourneyForm({ ...editTourneyForm, prizeThird: e.target.value })}
                    style={{
                      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '10px', padding: '10px 14px', color: 'white', fontSize: '12px', outline: 'none', fontFamily: 'Outfit'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10px', fontWeight: '800', color: '#8F8F9B', textTransform: 'uppercase' }}>Правила (по одному на рядок)</label>
                <textarea 
                  rows={4}
                  value={editTourneyForm.rules}
                  onChange={e => setEditTourneyForm({ ...editTourneyForm, rules: e.target.value })}
                  style={{
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px', padding: '10px 14px', color: 'white', fontSize: '12px', outline: 'none', fontFamily: 'Outfit', resize: 'vertical'
                  }}
                />
              </div>

              {/* Photo / Banner Manager */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '16px' }}>
                <label style={{ fontSize: '10px', fontWeight: '800', color: '#FF5C00', textTransform: 'uppercase' }}>Зміна Обкладинки / Банера</label>
                
                {/* Presets Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '8px' }}>
                  {Object.keys(MAP_PRESETS).map(mapName => {
                    const isPresetActive = editTourneyForm.imageUrl === MAP_PRESETS[mapName];
                    return (
                      <button
                        key={mapName}
                        type="button"
                        onClick={() => setEditTourneyForm({ ...editTourneyForm, imageUrl: MAP_PRESETS[mapName] })}
                        style={{
                          padding: '6px 4px',
                          background: isPresetActive ? 'rgba(255, 92, 0, 0.15)' : 'rgba(255,255,255,0.02)',
                          border: isPresetActive ? '1px solid #FF5C00' : '1px solid rgba(255,255,255,0.06)',
                          borderRadius: '8px',
                          fontSize: '8px',
                          color: isPresetActive ? '#FF5C00' : '#8F8F9B',
                          cursor: 'pointer',
                          textAlign: 'center',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          fontFamily: 'Outfit'
                        }}
                      >
                        {mapName.replace('de_', '').toUpperCase()}
                      </button>
                    );
                  })}
                </div>

                <input 
                  type="text" 
                  placeholder="Посилання на баннер турніру"
                  value={editTourneyForm.imageUrl}
                  onChange={e => setEditTourneyForm({ ...editTourneyForm, imageUrl: e.target.value })}
                  style={{
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px', padding: '10px 14px', color: 'white', fontSize: '12px', outline: 'none', fontFamily: 'Outfit'
                  }}
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                  <input 
                    type="file" 
                    accept="image/*"
                    id="edit-tourney-file-upload"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file, true);
                    }}
                    style={{ display: 'none' }}
                  />
                  <label 
                    htmlFor="edit-tourney-file-upload"
                    style={{
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px', padding: '8px 12px', fontSize: '10px', fontWeight: '800',
                      color: '#fff', cursor: 'pointer', fontFamily: 'Outfit', display: 'inline-block'
                    }}
                  >
                    Завантажити нове фото
                  </label>
                  {editTourneyForm.imageUrl && (
                    <button 
                      type="button" 
                      onClick={() => setEditTourneyForm({ ...editTourneyForm, imageUrl: '' })}
                      style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '10px', fontWeight: '700' }}
                    >
                      Видалити обкладинку
                    </button>
                  )}
                </div>

                {/* Banner preview */}
                {editTourneyForm.imageUrl && (
                  <div style={{ marginTop: '8px', position: 'relative', borderRadius: '12px', overflow: 'hidden', height: '110px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <img 
                      src={editTourneyForm.imageUrl} 
                      alt="Banner Preview" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.currentTarget.src = '';
                        showToast('Невірне посилання на зображення або помилка завантаження', 'error');
                      }}
                    />
                    <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: '700' }}>
                      ПЕРЕГЛЯД БАНЕРА
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ flex: 1, padding: '14px', borderRadius: '10px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <Save size={14} /> Зберегти зміни
                </button>
                <button 
                  type="button" 
                  onClick={() => setEditingTourney(null)}
                  style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px', padding: '14px 20px', color: '#fff', fontSize: '12px', cursor: 'pointer', fontFamily: 'Outfit'
                  }}
                >
                  Скасувати
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
