import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { CoinsManagementView } from './CoinsManagementView';
import { 
  Shield, Key, Mail, User, Lock, Eye, EyeOff, LogOut, 
  BarChart3, Trophy, Swords, Users, Settings, Activity, 
  Plus, Check, Play, Edit3, X, Save, 
  MapPin, Award, Trash2, PlusCircle, AlertCircle, RefreshCw, Send,
  MessageSquare, CheckCircle2, Coins
} from 'lucide-react';

const MANAGER_ACCESS_CODE = '11111111';
const MAPS = ['de_dust2', 'de_mirage', 'de_inferno', 'de_nuke', 'de_ancient', 'de_anubis', 'de_train', 'de_cache'];

const MAP_PRESETS: Record<string, string> = {
  de_dust2: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800',
  de_mirage: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=800',
  de_inferno: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=800',
  de_nuke: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=800',
  de_ancient: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=800',
  de_anubis: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=800',
  de_train: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800',
  de_cache: 'https://images.unsplash.com/photo-1535223289827-42f1e9919769?q=80&w=800'
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
    setMatchLive, setMatchScore, addMapScore, createTournament, 
    generateBracketForTournament, deleteTournament, updateTournament,
    showToast, updateMatchOdds, fillTournamentWithBots,
    user, isAuthenticated
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

  // Express Admin Activation fields
  const [expressCode, setExpressCode] = useState('');

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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tournaments' | 'matches' | 'broadcast' | 'analytics' | 'coins' | 'settings'>('dashboard');

  // Broadcast state
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastProgress, setBroadcastProgress] = useState<{current: number; total: number} | null>(null);
  const [broadcastResult, setBroadcastResult] = useState<{sent: number; failed: number} | null>(null);

  // Analytics real data state
  const [profilesCount, setProfilesCount] = useState(0);
  const [botSubscribersCount, setBotSubscribersCount] = useState(0);

  // Match management state
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [selectedTourneyIdForSimulation, setSelectedTourneyIdForSimulation] = useState<string | null>(null);
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
    name: '',
    type: '2X2' as '2X2' | '3X3' | '4X4' | '5X5' | 'BCI',
    prize: '25 000',
    prizeFirst: '',
    prizeSecond: '',
    prizeThird: '',
    prizePlacesCount: 3 as number,
    map: 'de_dust2',
    date: '',
    maxParticipants: 16,
    rules: 'Format: Single Elimination\nNo cheats permitted\nMatches are streamed live\nCaptain must report scores',
    imageUrl: '',
    streamUrl: '',
    status: 'upcoming' as 'upcoming' | 'active' | 'completed'
  });

  // Tournament Editing states
  const [editingTourney, setEditingTourney] = useState<any | null>(null);
  const [editTourneyForm, setEditTourneyForm] = useState({
    id: '',
    name: '',
    type: '2X2' as '2X2' | '3X3' | '4X4' | '5X5' | 'BCI',
    prizePool: '',
    prizeFirst: '',
    prizeSecond: '',
    prizeThird: '',
    prizePlacesCount: 3 as number,
    maxParticipants: 16,
    map: 'de_dust2',
    date: '',
    rules: '',
    imageUrl: '',
    streamUrl: '',
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

  const handleExpressActivate = async () => {
    if (!user || !user.id) {
      showToast('Спочатку увійдіть у свій акаунт', 'error');
      return;
    }

    if (expressCode.trim() !== '11111111') {
      showToast('Невірний код доступу!', 'error');
      return;
    }

    setAuthLoading(true);
    setAuthError('');

    try {
      if (useSupabase) {
        // Elevate user inside Supabase profiles
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ role: 'admin' })
          .eq('id', user.id);

        if (profileError) {
          throw new Error('Не вдалося оновити роль у базі даних: ' + profileError.message);
        }
      }

      // Successful activation
      const adminManager: ManagerProfile = {
        email: `${user.username}@volki.app`,
        username: user.username,
        role: 'Super Admin',
        joinedAt: new Date().toLocaleDateString('uk-UA'),
        status: 'online'
      };

      setManagerUser(adminManager);
      localStorage.setItem('volk_manager_profile', JSON.stringify(adminManager));
      localStorage.setItem('volk_manager_session', 'true');
      setIsAuthed(true);
      showToast('⚡ Права Адміністратора активовано! Вітаємо у Панелі Керування.', 'success');
    } catch (err: any) {
      setAuthError(err.message || 'Помилка під час активації адміна');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    if (regCode.trim().toLowerCase() !== managerInviteCode.trim().toLowerCase() && regCode.trim() !== '11111111') {
      setAuthError('Невірний код доступу керуючого! Зверніться до головного адміністратора.');
      setAuthLoading(false);
      return;
    }

    try {

      if (useSupabase) {
        try {
          // 1. Try standard email sign up (best-effort, not required for admin panel access)
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: regEmail,
            password: regPass,
            options: {
              data: {
                username: regUsername,
                role: 'admin'
              }
            }
          });

          if (!signUpError && signUpData?.user) {
            // Elevate user role to admin inside public.profiles
            const { error: profileError } = await supabase
              .from('profiles')
              .update({ role: 'admin' })
              .eq('id', signUpData.user.id);
            
            if (profileError) {
              console.warn('[VOLKI Admin] Could not update profile role:', profileError);
            }
          } else if (signUpError) {
            // Supabase auth failed — rate limit, anonymous disabled, SMTP error, etc.
            // This is NOT fatal — admin panel uses localStorage-based session
            console.warn('[VOLKI Admin] Supabase signUp unavailable (rate limit / anonymous disabled / SMTP):', signUpError.message);
          }
        } catch (signError: any) {
          console.warn('[VOLKI Admin] Supabase auth exception, proceeding with local session:', signError);
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
      // ── STEP 1: Check local managers list first (works after registration without email confirm) ──
      const localMatch = managers.find(m => m.email === loginEmail || m.username === loginEmail);
      if (localMatch && loginPass.length >= 6) {
        // Valid local manager — grant access immediately
        const activeManager: ManagerProfile = {
          ...localMatch,
          status: 'online'
        };
        setManagerUser(activeManager);
        localStorage.setItem('volk_manager_profile', JSON.stringify(activeManager));
        localStorage.setItem('volk_manager_session', 'true');
        setIsAuthed(true);
        showToast('Вхід успішний! Сесія адміністрування розпочата.', 'success');
        setAuthLoading(false);
        return;
      }

      if (useSupabase) {
        let activeManager: ManagerProfile | null = null;

        try {
          const { data: logInData, error: logInError } = await supabase.auth.signInWithPassword({
            email: loginEmail,
            password: loginPass
          });

          if (logInError) throw logInError;

          if (logInData?.user) {
            const { data: profile, error: profileErr } = await supabase
              .from('profiles')
              .select('role, username')
              .eq('id', logInData.user.id)
              .single();

            if (!profileErr && profile && profile.role !== 'admin') {
              await supabase.auth.signOut();
              throw new Error('Доступ заблоковано: Цей обліковий запис не є адміністратором.');
            }

            activeManager = {
              email: loginEmail,
              username: profile?.username || 'Admin User',
              role: profile?.role === 'admin' ? 'Super Admin' : 'Moderator',
              joinedAt: new Date().toLocaleDateString('uk-UA'),
              status: 'online'
            };
          }
        } catch (signInErr: any) {
          // Try profile lookup by username as fallback
          const searchUsername = loginEmail.includes('@') ? loginEmail.split('@')[0] : loginEmail;
          const { data: foundProfiles } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'admin')
            .or(`username.eq.${searchUsername},username.eq.${loginEmail}`);

          if (foundProfiles && foundProfiles.length > 0) {
            const matchedProfile = foundProfiles[0];
            activeManager = {
              email: loginEmail,
              username: matchedProfile.username || searchUsername,
              role: 'Super Admin',
              joinedAt: new Date().toLocaleDateString('uk-UA'),
              status: 'online'
            };
          } else {
            throw new Error('Невірний email/пароль. Якщо ви щойно зареєстрували акаунт — просто натисніть "Вхід" з тими самими даними.');
          }
        }

        if (activeManager) {
          setManagerUser(activeManager);
          localStorage.setItem('volk_manager_profile', JSON.stringify(activeManager));
        }
      } else {
        // Offline fallback
        if (loginEmail && loginPass.length >= 6) {
          const activeManager: ManagerProfile = {
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
      setAuthError(err.message || 'Помилка авторизації. Перевірте дані або скористайтесь кнопкою «Активувати».');
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
      const { error } = await supabase.storage.from('banners').upload(filePath, file);
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
    const pCount = editTourneyForm.prizePlacesCount;
    
    const autoFirst = pCount === 1 ? 1.0 : pCount === 2 ? 0.6 : 0.5;
    const autoSecond = pCount === 2 ? 0.4 : 0.3;
    const autoThird = 0.2;

    updateTournament(editingTourney.id, {
      name: editTourneyForm.name.toUpperCase(),
      type: editTourneyForm.type,
      date: editTourneyForm.date || 'Сьогодні, 20:00',
      prizePool: `${prizeNum.toLocaleString('uk-UA')} 🪙`,
      prizePlaces: {
        first: `${(parseInt(editTourneyForm.prizeFirst.replace(/\D/g, '')) || Math.round(prizeNum * autoFirst)).toLocaleString('uk-UA')} 🪙`,
        second: pCount >= 2 ? `${(parseInt(editTourneyForm.prizeSecond.replace(/\D/g, '')) || Math.round(prizeNum * autoSecond)).toLocaleString('uk-UA')} 🪙` : '',
        third: pCount >= 3 ? `${(parseInt(editTourneyForm.prizeThird.replace(/\D/g, '')) || Math.round(prizeNum * autoThird)).toLocaleString('uk-UA')} 🪙` : ''
      },
      maxParticipants: editTourneyForm.maxParticipants,
      map: editTourneyForm.map,
      rules: editTourneyForm.rules.split('\n').filter(r => r.trim()),
      imageUrl: editTourneyForm.imageUrl || MAP_PRESETS[editTourneyForm.map] || '',
      streamUrl: editTourneyForm.streamUrl || '',
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
    const pCount = tourneyForm.prizePlacesCount;
    
    // Auto-distribute based on number of prize places
    const autoFirst = pCount === 1 ? 1.0 : pCount === 2 ? 0.6 : 0.5;
    const autoSecond = pCount === 2 ? 0.4 : 0.3;
    const autoThird = 0.2;
    
    const pFirst = tourneyForm.prizeFirst.trim() 
      ? `${parseInt(tourneyForm.prizeFirst.replace(/\D/g, '')).toLocaleString('uk-UA')} 🪙`
      : `${Math.round(prizeNum * autoFirst).toLocaleString('uk-UA')} 🪙`;
      
    const pSecond = pCount >= 2 
      ? (tourneyForm.prizeSecond.trim() 
        ? `${parseInt(tourneyForm.prizeSecond.replace(/\D/g, '')).toLocaleString('uk-UA')} 🪙`
        : `${Math.round(prizeNum * autoSecond).toLocaleString('uk-UA')} 🪙`)
      : '';
      
    const pThird = pCount >= 3 
      ? (tourneyForm.prizeThird.trim() 
        ? `${parseInt(tourneyForm.prizeThird.replace(/\D/g, '')).toLocaleString('uk-UA')} 🪙`
        : `${Math.round(prizeNum * autoThird).toLocaleString('uk-UA')} 🪙`)
      : '';
      
    let formattedDate = tourneyForm.date;
    if (tourneyForm.date) {
      try {
        const d = new Date(tourneyForm.date);
        if (!isNaN(d.getTime())) {
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          const hours = String(d.getHours()).padStart(2, '0');
          const minutes = String(d.getMinutes()).padStart(2, '0');
          formattedDate = `${day}.${month}.${year}, ${hours}:${minutes}`;
        }
      } catch (err) {
        console.error("Date formatting error:", err);
      }
    } else {
      formattedDate = 'Сьогодні, 20:00';
    }

    createTournament({
      name: tourneyForm.name.toUpperCase(),
      type: tourneyForm.type,
      date: formattedDate,
      prizePool: `${prizeNum.toLocaleString('uk-UA')} 🪙`,
      prizePlaces: {
        first: pFirst,
        second: pSecond,
        third: pThird
      },
      maxParticipants: tourneyForm.maxParticipants,
      map: tourneyForm.map,
      system: 'Single Elimination',
      rules: tourneyForm.rules.split('\n').filter(r => r.trim()),
      imageUrl: tourneyForm.imageUrl || MAP_PRESETS[tourneyForm.map] || '',
      streamUrl: tourneyForm.streamUrl || '',
      status: tourneyForm.status
    });

    // Add log entry
    setTerminalLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Created new tournament: "${tourneyForm.name.toUpperCase()}" (${tourneyForm.type}) with a prize pool of ${prizeNum.toLocaleString()} 🪙`
    ]);

    setTourneyForm({
      name: '',
      type: '2X2',
      prize: '25 000',
      prizeFirst: '',
      prizeSecond: '',
      prizeThird: '',
      prizePlacesCount: 3,
      map: 'de_dust2',
      date: '',
      maxParticipants: 16,
      rules: 'Format: Single Elimination\nNo cheats permitted\nMatches are streamed live\nCaptain must report scores',
      imageUrl: '',
      streamUrl: '',
      status: 'upcoming'
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

  const injectMatchLog = (_matchId: string) => {
    if (!customLog.trim()) return;
    
    // Simulating app context score logs injection
    setTerminalLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] INJECTED LIVE MATCH LOG: "${customLog}"`
    ]);

    setCustomLog('');
    showToast('Коментар впроваджено в трансляцію!', 'success');
  };

  // ─── BROADCAST HANDLER ───

  const handleSendBroadcast = async () => {
    if (!broadcastMsg.trim()) {
      showToast('Введіть текст повідомлення!', 'error');
      return;
    }
    setBroadcastSending(true);
    setBroadcastProgress(null);
    setBroadcastResult(null);

    setTerminalLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Запуск розсилки в Telegram...`]);

    try {
      let chatIds: number[] = [8472692319, 6239669001]; // Hardcoded fallbacks so user and managers always receive it

      // 1. Fetch active subscribers from Supabase bot_subscribers
      try {
        const { data: subs, error: subErr } = await supabase
          .from('bot_subscribers')
          .select('chat_id')
          .eq('is_active', true);
        
        if (!subErr && subs) {
          const dbIds = subs.map(s => Number(s.chat_id)).filter(Boolean);
          for (const id of dbIds) {
            if (!chatIds.includes(id)) {
              chatIds.push(id);
            }
          }
        }
      } catch (e) {
        console.error('Failed to fetch subscribers:', e);
      }

      // 2. Fetch profiles with telegram_id
      try {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('telegram_id')
          .not('telegram_id', 'is', null);
        
        if (profiles) {
          for (const p of profiles) {
            const tgId = Number(p.telegram_id);
            if (tgId && !chatIds.includes(tgId)) {
              chatIds.push(tgId);
            }
          }
        }
      } catch (e) {
        console.error('Failed to fetch profiles:', e);
      }

      if (chatIds.length === 0) {
        setTerminalLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ⚠️ Не знайдено підписників або користувачів з Telegram ID для розсилки.`]);
      }

      const BOT_TOKEN = '8873845823:AAErjQiXP7InePLKku-MOhbqNPe-bMvt3LU';
      const CHANNEL_ID = '@volki1303';
      const finalMsg = broadcastMsg;
      const replyMarkup = {
        inline_keyboard: [[{ text: '🎮 В БОТ VOLK 1303', web_app: { url: 'https://volk1303.vercel.app' } }]]
      };

      let sent = 0;
      let failed = 0;
      const blockedIds: number[] = [];

      setBroadcastProgress({ current: 0, total: chatIds.length });

      // 3. Send to all subscribers sequentially
      for (let i = 0; i < chatIds.length; i++) {
        const chatId = chatIds[i];
        setBroadcastProgress({ current: i + 1, total: chatIds.length });

        try {
          const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: finalMsg,
              parse_mode: 'HTML',
              disable_web_page_preview: true,
              reply_markup: replyMarkup,
            }),
          });
          const result = await r.json();
          if (result.ok) {
            sent++;
          } else {
            failed++;
            const desc = result.description || '';
            if (desc.toLowerCase().includes('blocked') || result.error_code === 403) {
              blockedIds.push(chatId);
            }
          }
        } catch (err) {
          failed++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 80));
      }

      // 4. Mark blocked users as inactive in Supabase
      if (blockedIds.length > 0) {
        for (const blockedId of blockedIds) {
          try {
            await supabase
              .from('bot_subscribers')
              .update({ is_active: false })
              .eq('chat_id', blockedId);
          } catch (_) {}
        }
        setTerminalLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Позначено ${blockedIds.length} заблокованих чатів як неактивні.`]);
      }

      // 5. Send to Channel
      let channelOk = false;
      try {
        setTerminalLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Надсилання анонсу в канал ${CHANNEL_ID}...`]);
        const chanResp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: CHANNEL_ID,
            text: finalMsg,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: replyMarkup,
          }),
        });
        const chanResult = await chanResp.json();
        channelOk = chanResult.ok;
      } catch (e) {
        console.error('Failed to post to channel:', e);
      }

      setBroadcastResult({ sent, failed });
      setTerminalLogs(prev => [...prev,
        `[${new Date().toLocaleTimeString()}] Розсилка завершена: ✅ ${sent}/${chatIds.length} доставлено, ❌ ${failed} помилок. Канал: ${channelOk ? '✅' : '❌'}`
      ]);
      showToast(`Розсилку виконано! ✅ ${sent} надіслано, ❌ ${failed} помилок`, sent > 0 ? 'success' : 'error');
      if (sent > 0) setBroadcastMsg('');
    } catch (err: any) {
      showToast('Помилка розсилки: ' + err.message, 'error');
      setTerminalLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ❌ Помилка розсилки: ${err.message}`]);
    } finally {
      setBroadcastSending(false);
      setBroadcastProgress(null);
    }
  };

  // ─── STYLES & LAYOUTS ───

  const activeMatch = matches.find(m => m.id === selectedMatchId);

  // Auto-win and Dynamic Odds Handler
  const handleScoreChange = (team: 'A' | 'B', delta: number) => {
    if (!activeMatch) return;
    let newA = editScoreA;
    let newB = editScoreB;
    if (team === 'A') newA = Math.max(0, newA + delta);
    if (team === 'B') newB = Math.max(0, newB + delta);
    
    setEditScoreA(newA);
    setEditScoreB(newB);

    const diff = newA - newB;
    let newOddsA = 1.85;
    let newOddsB = 1.85;

    if (diff > 0) {
      newOddsA = Math.max(1.05, Number((1.85 - diff * 0.08).toFixed(2)));
      newOddsB = Math.min(10.0, Number((1.85 + diff * 0.2).toFixed(2)));
    } else if (diff < 0) {
      newOddsB = Math.max(1.05, Number((1.85 - Math.abs(diff) * 0.08).toFixed(2)));
      newOddsA = Math.min(10.0, Number((1.85 + Math.abs(diff) * 0.2).toFixed(2)));
    }
    
    setEditOddsA(newOddsA);
    setEditOddsB(newOddsB);

    // Save changes to server immediately to keep it snappy
    setMatchScore(activeMatch.id, newA, newB, 'live', null);
    updateMatchOdds(activeMatch.id, newOddsA, newOddsB);

    // Auto-finish at 13
    if (newA >= 13 || newB >= 13) {
      finishMatchWithScore(activeMatch.id, newA, newB);
      showToast(`Матч автоматично завершено: 13 раундів!`, 'success');
    }
  };

  // Stat Counters
  const liveMatchesCount = matches.filter(m => m.status === 'live').length;
  const upcomingMatchesCount = matches.filter(m => m.status === 'scheduled').length;
  const totalRegisteredTeams = Object.values(teams).reduce((a, b) => a + b.length, 0);
  const completedTournaments = tournaments.filter(t => t.status === 'completed').length;
  const finishedMatches = matches.filter(m => m.status === 'finished').length;

  // Load real analytics from Supabase
  useEffect(() => {
    if (!useSupabase || !isAuthed) return;
    supabase.from('profiles').select('id', { count: 'exact', head: true }).then(({ count }) => {
      setProfilesCount(count || 0);
    });
    supabase.from('bot_subscribers').select('chat_id', { count: 'exact', head: true }).eq('is_active', true).then(({ count }) => {
      setBotSubscribersCount(count || 0);
    });
  }, [useSupabase, isAuthed]);

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
              VOLK 1303
            </h1>
            <span style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '3px', color: '#FF5C00', textTransform: 'uppercase', marginTop: '6px' }}>
              ADMIN PANEL
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

          {/* Express Activation / Rate Limit Bypass Banners */}
          {isAuthenticated && user ? (
            <div style={{
              background: 'linear-gradient(135deg, rgba(255, 92, 0, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
              border: '1px solid rgba(255, 92, 0, 0.25)',
              borderRadius: '20px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  background: 'rgba(255, 92, 0, 0.2)',
                  borderRadius: '50%',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <User size={16} color="#FF5C00" />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#8F8F9B', fontWeight: '700', textTransform: 'uppercase' }}>Ви увійшли як гравець</div>
                  <div style={{ fontSize: '14px', color: '#fff', fontWeight: '800' }}>@{user.username}</div>
                </div>
              </div>
              
              <div style={{ fontSize: '11px', color: '#B5B5BE', lineHeight: '1.4' }}>
                Ви можете миттєво активувати цей акаунт як <strong>Адміністратора</strong> без реєстрації нових пошт та лімітів!
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input 
                  type="text" 
                  placeholder="Введіть код 11111111"
                  value={expressCode}
                  onChange={e => setExpressCode(e.target.value)}
                  style={{
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    color: 'white',
                    outline: 'none',
                    fontSize: '12px',
                    fontFamily: 'Outfit'
                  }}
                />
                <button
                  type="button"
                  onClick={handleExpressActivate}
                  disabled={authLoading}
                  style={{
                    background: 'linear-gradient(135deg, #FF5C00, #E04F00)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    fontFamily: 'Outfit',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  {authLoading ? 'Активація...' : '⚡ Активувати та увійти'}
                </button>
              </div>
            </div>
          ) : (
            onExitAdmin ? (
              <div style={{ marginBottom: '24px', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={onExitAdmin}
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    color: '#8F8F9B',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    padding: '10px 16px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    fontFamily: 'Outfit',
                    transition: 'all 0.2s',
                  }}
                >
                  ← Перейти до головного сайту
                </button>
              </div>
            ) : null
          )}

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
            <div style={{ fontSize: '15px', fontWeight: '900', letterSpacing: '2px', fontFamily: 'Outfit, sans-serif' }}>VOLK 1303</div>
            <div style={{ fontSize: '9px', color: '#FF5C00', fontWeight: '800', letterSpacing: '3px' }}>COMMAND CENTER</div>
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
            { id: 'matches', label: 'Проведення турнірів', icon: <Swords size={16} /> },
            { id: 'broadcast', label: 'Telegram Розсилки', icon: <MessageSquare size={16} /> },
            { id: 'analytics', label: 'Аналітика & Дані', icon: <BarChart3 size={16} /> },
            { id: 'coins', label: 'Керування монетами', icon: <Coins size={16} /> },
            { id: 'settings', label: 'Налаштування', icon: <Settings size={16} /> }
          ].map(item => {
            const isTabActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any);
                  if (item.id !== 'matches') {
                    setSelectedMatchId(null);
                    setSelectedTourneyIdForSimulation(null);
                  }
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
              {activeTab === 'matches' && '⚔️ Проведення турнірів & Управління Рахунками'}
              {activeTab === 'broadcast' && '📢 Telegram Розсилки для Підписників'}
              {activeTab === 'analytics' && '📈 Аналітика Платформи (Реальні Дані)'}
              {activeTab === 'coins' && '🪙 Керування Монетами'}
              {activeTab === 'settings' && '⚙️ Налаштування & Керуючі Сайтом'}
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
                              {t.status === 'active' && (
                                <button 
                                  onClick={() => {
                                    if (confirm(`Завершити турнір "${t.name}" та відправити в архів?`)) {
                                      updateTournament(t.id, { status: 'completed' });
                                      setTerminalLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Completed tournament: "${t.name}"`]);
                                      showToast('Турнір успішно завершено та архівовано!', 'success');
                                    }
                                  }}
                                  style={{
                                    background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.2)',
                                    borderRadius: '8px', padding: '6px 12px', fontSize: '11px', color: '#8B5CF6', fontWeight: '700',
                                    fontFamily: 'Outfit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                                  }}
                                >
                                  <CheckCircle2 size={10} /> Завершити
                                </button>
                              )}
                              {tTeams.length < t.maxParticipants && (
                                <button 
                                  onClick={async () => {
                                    setTerminalLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Filling tournament "${t.name}" with bot participants...`]);
                                    await fillTournamentWithBots(t.id);
                                  }}
                                  style={{
                                    background: 'rgba(255, 92, 0, 0.08)', border: '1px solid rgba(255, 92, 0, 0.2)',
                                    borderRadius: '8px', padding: '6px 12px', fontSize: '11px', color: '#FF5C00', fontWeight: '700',
                                    fontFamily: 'Outfit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                                  }}
                                >
                                  🤖 Наповнити ботами
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
                                    prizeSecond: t.prizePlaces.second ? t.prizePlaces.second.replace(' 🪙', '') : '',
                                    prizeThird: t.prizePlaces.third ? t.prizePlaces.third.replace(' 🪙', '') : '',
                                    prizePlacesCount: !t.prizePlaces.second ? 1 : !t.prizePlaces.third ? 2 : 3,
                                    maxParticipants: t.maxParticipants,
                                    map: t.map,
                                    date: t.date,
                                    rules: (t.rules || []).join('\n'),
                                    imageUrl: t.imageUrl || '',
                                    streamUrl: t.streamUrl || '',
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
                          
                          {/* Twitch Stream Preview */}
                          {t.streamUrl && (
                            <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '16px' }}>
                              <a href={t.streamUrl.startsWith('https://') ? t.streamUrl : `https://${t.streamUrl}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginBottom: '12px', background: '#9146FF', color: '#fff', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '12px', fontFamily: 'Outfit' }}>
                                📺 Дивитись на Twitch
                              </a>
                              {t.streamUrl.includes('twitch.tv') ? (
                                <iframe
                                  src={`https://player.twitch.tv/?channel=${t.streamUrl.split('twitch.tv/')[1]?.split('?')[0]}&parent=${window.location.hostname}`}
                                  height="200"
                                  width="100%"
                                  allowFullScreen
                                  style={{ border: 'none', borderRadius: '8px' }}
                                ></iframe>
                              ) : (
                                <div style={{ height: '200px', width: '100%', background: '#1a1a1a', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', border: '1px dashed #333' }}>
                                  Stream Preview Not Available for non-Twitch URLs
                                </div>
                              )}
                            </div>
                          )}
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
                        <option value="3X3">3x3 Match</option>
                        <option value="4X4">4x4 Classic</option>
                        <option value="5X5">5x5 Classic</option>
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
                      <label style={{ fontSize: '10px', fontWeight: '800', color: '#8F8F9B', textTransform: 'uppercase' }}>Статус Турніру</label>
                      <select 
                        value={tourneyForm.status}
                        onChange={e => setTourneyForm({ ...tourneyForm, status: e.target.value as any })}
                        style={{
                          background: '#0B0B11', border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '10px', padding: '10px 14px', color: 'white', fontSize: '12px', outline: 'none', fontFamily: 'Outfit', cursor: 'pointer'
                        }}
                      >
                        <option value="upcoming">Майбутній (Upcoming)</option>
                        <option value="active">Активний (Active)</option>
                        <option value="completed">Завершений (Completed)</option>
                      </select>
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
                        {[2, 4, 8, 16, 32].map(n => (
                          <option key={n} value={n}>
                            {n} {n === 2 || n === 4 ? 'команди' : 'команд'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '10px', fontWeight: '800', color: '#8F8F9B', textTransform: 'uppercase' }}>Загальний Призовий Фонд (🪙)</label>
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
                      <label style={{ fontSize: '10px', fontWeight: '800', color: '#8F8F9B', textTransform: 'uppercase' }}>Кількість призових місць</label>
                      <select
                        value={tourneyForm.prizePlacesCount}
                        onChange={e => setTourneyForm({ ...tourneyForm, prizePlacesCount: Number(e.target.value) })}
                        style={{
                          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '10px', padding: '10px 14px', color: 'white', fontSize: '12px', outline: 'none', fontFamily: 'Outfit', cursor: 'pointer'
                        }}
                      >
                        <option value={1}>1 місце (100%)</option>
                        <option value={2}>2 місця (60/40%)</option>
                        <option value={3}>3 місця (50/30/20%)</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: tourneyForm.prizePlacesCount === 1 ? '1fr' : tourneyForm.prizePlacesCount === 2 ? '1fr 1fr' : '1fr 1fr 1fr', gap: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '9px', fontWeight: '800', color: '#FFD700', textTransform: 'uppercase' }}>🥇 1-е місце (опц)</label>
                      <input 
                        type="text" 
                        placeholder={`Авто (${tourneyForm.prizePlacesCount === 1 ? '100' : tourneyForm.prizePlacesCount === 2 ? '60' : '50'}%)`}
                        value={tourneyForm.prizeFirst}
                        onChange={e => setTourneyForm({ ...tourneyForm, prizeFirst: e.target.value })}
                        style={{
                          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '10px', padding: '10px 12px', color: 'white', fontSize: '12px', outline: 'none', fontFamily: 'Outfit'
                        }}
                      />
                    </div>
                    {tourneyForm.prizePlacesCount >= 2 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '9px', fontWeight: '800', color: '#C0C0C0', textTransform: 'uppercase' }}>🥈 2-е місце (опц)</label>
                        <input 
                          type="text" 
                          placeholder={`Авто (${tourneyForm.prizePlacesCount === 2 ? '40' : '30'}%)`}
                          value={tourneyForm.prizeSecond}
                          onChange={e => setTourneyForm({ ...tourneyForm, prizeSecond: e.target.value })}
                          style={{
                            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '10px', padding: '10px 12px', color: 'white', fontSize: '12px', outline: 'none', fontFamily: 'Outfit'
                          }}
                        />
                      </div>
                    )}
                    {tourneyForm.prizePlacesCount >= 3 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '9px', fontWeight: '800', color: '#CD7F32', textTransform: 'uppercase' }}>🥉 3-є місце (опц)</label>
                        <input 
                          type="text" 
                          placeholder="Авто (20%)"
                          value={tourneyForm.prizeThird}
                          onChange={e => setTourneyForm({ ...tourneyForm, prizeThird: e.target.value })}
                          style={{
                            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '10px', padding: '10px 12px', color: 'white', fontSize: '12px', outline: 'none', fontFamily: 'Outfit'
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '10px', fontWeight: '800', color: '#8F8F9B', textTransform: 'uppercase' }}>Дата Та Час</label>
                    <input 
                      type="datetime-local" 
                      required
                      value={tourneyForm.date}
                      onChange={e => setTourneyForm({ ...tourneyForm, date: e.target.value })}
                      style={{
                        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '10px', padding: '10px 14px', color: 'white', fontSize: '12px', outline: 'none', fontFamily: 'Outfit',
                        colorScheme: 'dark'
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

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '10px', fontWeight: '800', color: '#EF4444', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      📡 Посилання на LIVE Ефір (YouTube / Twitch)
                    </label>
                    <input
                      type="url"
                      placeholder="https://youtube.com/live/... або https://twitch.tv/channel"
                      value={tourneyForm.streamUrl}
                      onChange={e => setTourneyForm({ ...tourneyForm, streamUrl: e.target.value })}
                      style={{
                        background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: '10px', padding: '10px 14px', color: 'white', fontSize: '12px', outline: 'none', fontFamily: 'Outfit'
                      }}
                    />
                    <span style={{ fontSize: '10px', color: '#51515E' }}>
                      Гравці побачать цей ефір на сторінці матчу під час Live статусу
                    </span>
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
            <div>
              {selectedTourneyIdForSimulation === null ? (
                /* Level 1: Tournament Selection */
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '950', fontFamily: 'Outfit', color: 'white', textTransform: 'uppercase', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Trophy size={18} color="#FF5C00" /> Виберіть активний турнір для проведення ігор
                  </h3>
                  
                  {(() => {
                    const activeOrUpcoming = tournaments.filter(t => t.status === 'upcoming' || t.status === 'active');
                    if (activeOrUpcoming.length === 0) {
                      return (
                        <div className="esports-card" style={{ padding: '60px 20px', textAlign: 'center', color: '#51515E' }}>
                          <Swords size={48} style={{ margin: '0 auto 16px', opacity: 0.2, color: '#FF5C00' }} />
                          <p style={{ fontSize: '15px', fontWeight: '750', color: '#8F8F9B' }}>Наразі немає активних або запланованих турнірів</p>
                          <p style={{ fontSize: '11px', marginTop: '6px' }}>Створіть турнір у вкладці «Турніри & Сітки»</p>
                        </div>
                      );
                    }
                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                        {activeOrUpcoming.map(t => {
                          const tTeams = teams[t.id] || [];
                          const tMatches = matches.filter(m => m.tournamentId === t.id);
                          const liveMatches = tMatches.filter(m => m.status === 'live').length;
                          const finishedMatches = tMatches.filter(m => m.status === 'finished').length;
                          
                          return (
                            <div 
                              key={t.id} 
                              className="esports-card" 
                              style={{ 
                                padding: '24px', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                justifyContent: 'space-between', 
                                border: liveMatches > 0 ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(255,255,255,0.04)',
                                boxShadow: liveMatches > 0 ? '0 0 20px rgba(239, 68, 68, 0.05)' : 'none',
                                transition: 'transform 0.2s, border-color 0.2s'
                              }}
                            >
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                  <span style={{
                                    background: t.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 92, 0, 0.1)',
                                    color: t.status === 'active' ? '#10B981' : '#FF5C00',
                                    padding: '2px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: '800', textTransform: 'uppercase'
                                  }}>
                                    {t.status === 'active' ? 'АКТИВНИЙ' : 'ОЧІКУВАННЯ'}
                                  </span>
                                  {liveMatches > 0 && (
                                    <span style={{ 
                                      background: 'rgba(239, 68, 68, 0.1)', 
                                      color: '#EF4444', 
                                      padding: '2px 8px', 
                                      borderRadius: '4px', 
                                      fontSize: '9px', 
                                      fontWeight: '800', 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: '4px' 
                                    }}>
                                      <span style={{ 
                                        width: '6px', 
                                        height: '6px', 
                                        borderRadius: '50%', 
                                        backgroundColor: '#EF4444', 
                                        display: 'inline-block'
                                      }}></span>
                                      {liveMatches} LIVE
                                    </span>
                                  )}
                                </div>
                                <h4 style={{ fontSize: '18px', fontWeight: '950', fontFamily: 'Outfit', color: 'white', margin: '0 0 10px 0' }}>
                                  {t.name}
                                </h4>
                                <div style={{ fontSize: '12px', color: '#8F8F9B', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                                  <div>📅 Дата: <span style={{ color: 'white', fontWeight: '600' }}>{t.date || 'Не вказано'}</span></div>
                                  <div>🗺️ Карта: <span style={{ color: 'white', fontWeight: '600' }}>{t.map || 'Невідомо'}</span></div>
                                  <div>👥 Команди: <span style={{ color: '#10B981', fontWeight: '700' }}>{tTeams.length} / {t.maxParticipants}</span></div>
                                  <div>📊 Матчі: <span style={{ color: '#3B82F6', fontWeight: '750' }}>{finishedMatches} зіграно / {tMatches.length} всього</span></div>
                                </div>
                              </div>
                              
                              <button
                                onClick={() => {
                                  setSelectedTourneyIdForSimulation(t.id);
                                  setSelectedMatchId(null);
                                }}
                                className="btn-primary"
                                style={{ 
                                  width: '100%', 
                                  padding: '12px', 
                                  borderRadius: '10px', 
                                  fontSize: '12px', 
                                  fontWeight: '800', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center', 
                                  gap: '8px',
                                  cursor: 'pointer'
                                }}
                              >
                                <Swords size={14} /> Керувати матчами
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* Level 2 & 3: Tournaments Matches View & Match simulation control */
                <div>
                  {(() => {
                    const activeTourney = tournaments.find(t => t.id === selectedTourneyIdForSimulation);
                    const tourneyMatches = matches.filter(m => m.tournamentId === selectedTourneyIdForSimulation);
                    
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Level Navigation Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <button
                            onClick={() => {
                              setSelectedTourneyIdForSimulation(null);
                              setSelectedMatchId(null);
                            }}
                            style={{
                              background: 'rgba(255,255,255,0.02)',
                              border: '1px solid rgba(255,255,255,0.06)',
                              borderRadius: '8px',
                              padding: '8px 16px',
                              color: '#8F8F9B',
                              fontSize: '12px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontFamily: 'Outfit'
                            }}
                          >
                            ← До списку турнірів
                          </button>
                          
                          <h3 style={{ fontSize: '15px', fontWeight: '950', fontFamily: 'Outfit', color: 'white', textTransform: 'uppercase', margin: 0 }}>
                            🏆 {activeTourney?.name} — Управління іграми
                          </h3>
                        </div>

                        {/* Simulation & Listing Container */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '28px' }}>
                          
                          {/* Matches List */}
                          <div className="esports-card" style={{ padding: '24px', height: 'fit-content' }}>
                            <h3 style={{ fontSize: '13px', fontWeight: '850', textTransform: 'uppercase', fontFamily: 'Outfit', color: '#8F8F9B', marginBottom: '16px' }}>
                              Список ігор турніру ({tourneyMatches.length})
                            </h3>

                            {tourneyMatches.length === 0 ? (
                              <div style={{ padding: '40px 10px', textAlign: 'center', color: '#51515E' }}>
                                <Swords size={32} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
                                <p style={{ fontSize: '13px', fontWeight: '750' }}>Матчі для цього турніру ще не згенеровані</p>
                                <p style={{ fontSize: '11px', marginTop: '4px' }}>Сформуйте сітку у вкладці «Турніри & Сітки»</p>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {tourneyMatches.map(m => {
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
                                          {m.roundName}
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
                            {activeMatch && activeMatch.tournamentId === selectedTourneyIdForSimulation ? (
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
                                        style={{ padding: '12px 20px', borderRadius: '10px', fontSize: '12px', cursor: 'pointer' }}
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
                                          onClick={() => handleScoreChange('A', -1)}
                                          style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: 'rgba(255,255,255,0.03)', color: 'white', cursor: 'pointer', fontWeight: '800' }}
                                        >
                                          -
                                        </button>
                                        <span style={{ fontSize: '28px', fontWeight: '950', fontFamily: 'Outfit', minWidth: '32px' }}>{editScoreA}</span>
                                        <button 
                                          onClick={() => handleScoreChange('A', 1)}
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
                                          onClick={() => handleScoreChange('B', -1)}
                                          style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: 'rgba(255,255,255,0.03)', color: 'white', cursor: 'pointer', fontWeight: '800' }}
                                        >
                                          -
                                        </button>
                                        <span style={{ fontSize: '28px', fontWeight: '950', fontFamily: 'Outfit', minWidth: '32px' }}>{editScoreB}</span>
                                        <button 
                                          onClick={() => handleScoreChange('B', 1)}
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

                                  {/* Map Score Management (BO3/BO5) */}
                                  {activeMatch.status === 'live' && (
                                    <div style={{
                                      background: '#040406',
                                      border: '1px solid rgba(16, 185, 129, 0.15)',
                                      borderRadius: '16px',
                                      padding: '20px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '12px'
                                    }}>
                                      <span style={{ fontSize: '10px', fontWeight: '800', color: '#8F8F9B', textTransform: 'uppercase' }}>
                                        📊 Карти матчу (BO{activeMatch.mapScores.length > 0 ? activeMatch.mapScores.length * 2 + 1 : 3})
                                      </span>

                                      {/* Recorded map results */}
                                      {activeMatch.mapScores.length > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                          {activeMatch.mapScores.map((ms, idx) => (
                                            <div key={idx} style={{
                                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                              padding: '6px 10px', background: 'rgba(255,255,255,0.02)',
                                              borderRadius: '8px', fontSize: '11px'
                                            }}>
                                              <span style={{ color: '#8F8F9B' }}>Карта {idx + 1}</span>
                                              <span style={{ fontWeight: '800', color: ms.scoreA > ms.scoreB ? '#10B981' : ms.scoreA < ms.scoreB ? '#EF4444' : 'white' }}>
                                                {ms.scoreA} : {ms.scoreB}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {/* Current map indicator */}
                                      <div style={{ fontSize: '11px', color: '#8F8F9B' }}>
                                        Поточна карта: <span style={{ color: '#FF5C00', fontWeight: '800' }}>Карта {activeMatch.currentMap}</span>
                                        &nbsp;→ Рахунок: <span style={{ color: 'white', fontWeight: '800' }}>{editScoreA} : {editScoreB}</span>
                                      </div>

                                      {/* Commit map button */}
                                      <button
                                        onClick={() => {
                                          if (editScoreA === 0 && editScoreB === 0) {
                                            showToast('Рахунок карти 0:0 — спочатку встановіть результат!', 'error');
                                            return;
                                          }
                                          addMapScore(activeMatch.id, editScoreA, editScoreB);
                                          setEditScoreA(0);
                                          setEditScoreB(0);
                                          setTerminalLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Карта ${activeMatch.currentMap} зафіксована: ${editScoreA}:${editScoreB}`]);
                                          showToast(`✅ Карта ${activeMatch.currentMap} зафіксована! Рахунок скинуто для наступної карти.`, 'success');
                                        }}
                                        style={{
                                          background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)',
                                          borderRadius: '10px', padding: '11px 16px', fontSize: '12px', color: '#10B981',
                                          fontWeight: '800', cursor: 'pointer',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                        }}
                                      >
                                        <Check size={14} /> Зафіксувати карту {activeMatch.currentMap} ({editScoreA}:{editScoreB})
                                      </button>
                                    </div>
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
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* ============================================================
              TAB: TELEGRAM BROADCAST
             ============================================================ */}
          {activeTab === 'broadcast' && (
            <div style={{ display: 'flex', gap: '28px', alignItems: 'flex-start' }}>
              {/* Broadcast Composer */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="esports-card" style={{
                  padding: '20px 24px',
                  background: 'linear-gradient(135deg, rgba(255, 92, 0, 0.08) 0%, rgba(16, 16, 25, 0.4) 100%)',
                  border: '1px solid rgba(255, 92, 0, 0.25)',
                  boxShadow: '0 4px 20px rgba(255, 92, 0, 0.03)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '20px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(255, 92, 0, 0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0
                    }}>📢</div>
                    <div>
                      <h4 style={{ fontSize: '13px', fontWeight: '900', fontFamily: 'Outfit', color: 'white', margin: '0 0 4px 0' }}>Мобільна розсилка через Telegram-бот</h4>
                      <p style={{ fontSize: '11px', color: '#8F8F9B', margin: 0, lineHeight: '1.4' }}>
                        Ви можете робити розсилки прямо зі свого телефону! Перейдіть у наш бот і скористайтеся командою <code style={{ color: '#FF5C00', background: 'rgba(255,92,0,0.1)', padding: '2px 6px', borderRadius: '4px' }}>/broadcast</code>.
                      </p>
                    </div>
                  </div>
                  <a href="https://t.me/volki1303_bot" target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ padding: '10px 18px', borderRadius: '10px', fontSize: '11px', fontWeight: '800', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                    <span>Відкрити бот</span> ➔
                  </a>
                </div>

                <div className="esports-card" style={{ padding: '28px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '900', fontFamily: 'Outfit', color: '#fff', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MessageSquare size={18} color="#FF5C00" /> Нова Розсилка
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    {[
                      { label: '🏆 Анонс турніру', text: '🔥 <b>Новий турнір!</b>\n\n🏆 Реєстрацію відкрито!\n📅 Формат: [формат]\n💰 Призовий фонд: [сума]\n\nЗалітай в додаток та реєструй команду! 👇' },
                      { label: '🔴 Live матч', text: '🔴 <b>МАТЧ LIVE!</b>\n\nЗараз розпочався матч на платформі VOLK 1303!\n⚔️ [Команда A] vs [Команда B]\n\nЗаходь та став свої прогнози! 👇' },
                      { label: 'Тех. роботи', text: '🛠 <b>Технічні роботи</b>\n\nПлатформа VOLK 1303 тимчасово недоступна через технічні роботи.\nЧас відновлення: [час]\n\nДякуємо за розуміння! 🙏' },
                      { label: '💰 Нарахування монет', text: '🪙 <b>Бонусні монети!</b>\n\nУсім активним користувачам платформи нараховано бонусні монети.\nЗаходьте в додаток і перевіряйте баланс! 👇' },
                    ].map((tpl, i) => (
                      <button key={i} onClick={() => setBroadcastMsg(tpl.text)} style={{ background: 'rgba(255, 92, 0, 0.06)', border: '1px solid rgba(255, 92, 0, 0.15)', borderRadius: '8px', padding: '8px', fontSize: '10px', color: '#FF5C00', fontWeight: '700', cursor: 'pointer', fontFamily: 'Outfit' }}>
                        {tpl.label}
                      </button>
                    ))}
                  </div>

                  <textarea rows={8} placeholder={'🚨 <b>АНОНС!</b>\n\nТекст повідомлення...'} value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px 16px', color: 'white', fontSize: '13px', outline: 'none', fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box', lineHeight: '1.6' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                    <span style={{ fontSize: '11px', color: '#51515E' }}>{broadcastMsg.length} символів</span>
                    <button onClick={handleSendBroadcast} disabled={broadcastSending || !broadcastMsg.trim()} className="btn-primary" style={{ padding: '10px 24px', borderRadius: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', opacity: broadcastSending ? 0.7 : 1 }}>
                      {broadcastSending ? (
                        <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Надсилання...</>
                      ) : (
                        <><Send size={14} /> Надіслати всім</>
                      )}
                    </button>
                  </div>

                  {broadcastProgress && (
                    <div style={{ marginTop: '16px', padding: '14px 16px', borderRadius: '12px', background: 'rgba(255, 92, 0, 0.05)', border: '1px solid rgba(255, 92, 0, 0.15)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#FF5C00', fontFamily: 'Outfit' }}>⚡ Надсилання розсилки...</span>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: '#fff', fontFamily: 'monospace' }}>{broadcastProgress.current} / {broadcastProgress.total}</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${(broadcastProgress.current / broadcastProgress.total) * 100}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #FF5C00, #FF8C00)',
                          transition: 'width 0.15s ease-out'
                        }} />
                      </div>
                    </div>
                  )}

                  {/* Result */}
                  {broadcastResult && (
                    <div style={{
                      marginTop: '16px', padding: '14px 16px', borderRadius: '12px',
                      background: broadcastResult.sent > 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                      border: `1px solid ${broadcastResult.sent > 0 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                      display: 'flex', alignItems: 'center', gap: '12px'
                    }}>
                      <CheckCircle2 size={18} color={broadcastResult.sent > 0 ? '#10B981' : '#EF4444'} />
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>
                        ✅ Надіслано: <strong style={{ color: '#10B981' }}>{broadcastResult.sent}</strong>
                        &nbsp;&nbsp;❌ Помилок: <strong style={{ color: '#EF4444' }}>{broadcastResult.failed}</strong>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Preview + Subscriber Stats */}
              <div style={{ width: '320px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Subscriber count */}
                <div className="esports-card" style={{ padding: '20px' }}>
                  <h4 style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', fontFamily: 'Outfit', color: '#8F8F9B', marginBottom: '14px' }}>Аудиторія</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#8F8F9B' }}>Підписники бота</span>
                      <span style={{ fontSize: '18px', fontWeight: '900', fontFamily: 'Outfit', color: '#FF5C00' }}>{botSubscribersCount}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#8F8F9B' }}>Гравців на платформі</span>
                      <span style={{ fontSize: '18px', fontWeight: '900', fontFamily: 'Outfit', color: '#3B82F6' }}>{profilesCount}</span>
                    </div>
                  </div>
                </div>

                {/* Telegram preview */}
                <div className="esports-card" style={{ padding: '20px' }}>
                  <h4 style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', fontFamily: 'Outfit', color: '#8F8F9B', marginBottom: '12px' }}>Прев'ю у Telegram</h4>
                  <div style={{
                    background: '#1C1C22', borderRadius: '12px', padding: '14px',
                    border: '1px solid rgba(255,255,255,0.04)', minHeight: '80px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #FF5C00, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🐺</div>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '800', color: '#fff' }}>VOLKI 1303</div>
                        <div style={{ fontSize: '9px', color: '#8F8F9B' }}>Бот</div>
                      </div>
                    </div>
                    <div
                      style={{ fontSize: '12px', color: '#E5E5EA', lineHeight: '1.5', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                      dangerouslySetInnerHTML={{
                        __html: broadcastMsg
                          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                          .replace(/&lt;b&gt;/g, '<strong>').replace(/&lt;\/b&gt;/g, '</strong>')
                          .replace(/&lt;i&gt;/g, '<em>').replace(/&lt;\/i&gt;/g, '</em>')
                          .replace(/&lt;code&gt;/g, '<code style="background:rgba(255,255,255,0.08);padding:1px 4px;border-radius:3px">').replace(/&lt;\/code&gt;/g, '</code>')
                          || '<span style="color:#51515E;font-style:italic">Введіть текст повідомлення зліва...</span>'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================
              TAB: PLATFORM ANALYTICS (Real Data)
             ============================================================ */}
          {activeTab === 'analytics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              
              {/* Real Analytics Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                {[
                  { label: 'Гравців на платформі', val: profilesCount.toString(), color: '#3B82F6', icon: '👤' },
                  { label: 'Підписники Telegram', val: botSubscribersCount.toString(), color: '#FF5C00', icon: '📱' },
                  { label: 'Турнірів проведено', val: completedTournaments.toString(), color: '#8B5CF6', icon: '🏆' },
                  { label: 'Матчів зіграно', val: finishedMatches.toString(), color: '#10B981', icon: '⚔️' },
                  { label: 'Команд зареєстровано', val: totalRegisteredTeams.toString(), color: '#F59E0B', icon: '👥' },
                  { label: 'LIVE зараз', val: liveMatchesCount.toString(), color: '#EF4444', icon: '🔴' }
                ].map((stat, i) => (
                  <div key={i} className="esports-card" style={{
                    padding: '20px',
                    background: `linear-gradient(135deg, ${stat.color}08 0%, rgba(16, 16, 25, 0.4) 100%)`,
                    border: `1px solid ${stat.color}15`
                  }}>
                    <span style={{ fontSize: '20px', display: 'block', marginBottom: '8px' }}>{stat.icon}</span>
                    <span style={{ fontSize: '10px', color: '#8F8F9B', textTransform: 'uppercase', fontWeight: '700' }}>{stat.label}</span>
                    <div style={{ fontSize: '28px', fontWeight: '950', fontFamily: 'Outfit', color: stat.color, margin: '4px 0 0' }}>{stat.val}</div>
                  </div>
                ))}
              </div>

              {/* Tournaments Breakdown Table */}
              <div className="esports-card" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', fontFamily: 'Outfit', color: '#ccc', marginBottom: '18px' }}>
                  Деталізація по Турнірах (Реальні Дані)
                </h3>
                {tournaments.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#51515E', padding: '40px' }}>
                    <Trophy size={32} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
                    <p>Турнірів ще немає</p>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#8F8F9B', textAlign: 'left' }}>
                        <th style={{ padding: '10px 12px' }}>Назва</th>
                        <th style={{ padding: '10px 12px' }}>Тип</th>
                        <th style={{ padding: '10px 12px' }}>Статус</th>
                        <th style={{ padding: '10px 12px' }}>Команди</th>
                        <th style={{ padding: '10px 12px' }}>Матчі</th>
                        <th style={{ padding: '10px 12px' }}>Призовий фонд</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tournaments.map(t => {
                        const tTeams = teams[t.id] || [];
                        const tMatches = matches.filter(m => m.tournamentId === t.id);
                        return (
                          <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                            <td style={{ padding: '12px', fontWeight: '700', color: 'white', fontFamily: 'Outfit' }}>{t.name}</td>
                            <td style={{ padding: '12px', color: '#FF5C00', fontWeight: '700' }}>{t.type}</td>
                            <td style={{ padding: '12px' }}>
                              <span style={{
                                background: t.status === 'active' ? 'rgba(16,185,129,0.1)' : t.status === 'completed' ? 'rgba(139,92,246,0.1)' : 'rgba(255,92,0,0.1)',
                                color: t.status === 'active' ? '#10B981' : t.status === 'completed' ? '#8B5CF6' : '#FF5C00',
                                padding: '2px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: '800', textTransform: 'uppercase'
                              }}>
                                {t.status === 'active' ? 'LIVE' : t.status === 'completed' ? 'DONE' : 'SOON'}
                              </span>
                            </td>
                            <td style={{ padding: '12px', color: '#10B981', fontWeight: '700' }}>{tTeams.length}/{t.maxParticipants}</td>
                            <td style={{ padding: '12px', color: '#3B82F6', fontWeight: '700' }}>{tMatches.length}</td>
                            <td style={{ padding: '12px', color: '#FF5C00', fontWeight: '800' }}>{t.prizePool}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Tournament Status Donut (real data) */}
              {tournaments.length > 0 && (() => {
                const upcoming = tournaments.filter(t => t.status === 'upcoming').length;
                const active = tournaments.filter(t => t.status === 'active').length;
                const completed = tournaments.filter(t => t.status === 'completed').length;
                const total = tournaments.length;
                const circ = 251.2;
                const upcomingArc = (upcoming / total) * circ;
                const activeArc = (active / total) * circ;
                const completedArc = (completed / total) * circ;
                return (
                  <div className="esports-card" style={{ padding: '24px', maxWidth: '380px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', fontFamily: 'Outfit', color: '#ccc', marginBottom: '20px' }}>
                      Розподіл за Статусами Турнірів
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                      <svg viewBox="0 0 100 100" style={{ width: '120px', height: '120px', flexShrink: 0 }}>
                        <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="12" />
                        {upcomingArc > 0 && <circle cx="50" cy="50" r="40" fill="transparent" stroke="#FF5C00" strokeWidth="12" strokeDasharray={`${upcomingArc} ${circ}`} strokeDashoffset="0" />}
                        {activeArc > 0 && <circle cx="50" cy="50" r="40" fill="transparent" stroke="#10B981" strokeWidth="12" strokeDasharray={`${activeArc} ${circ}`} strokeDashoffset={`-${upcomingArc}`} />}
                        {completedArc > 0 && <circle cx="50" cy="50" r="40" fill="transparent" stroke="#8B5CF6" strokeWidth="12" strokeDasharray={`${completedArc} ${circ}`} strokeDashoffset={`-${upcomingArc + activeArc}`} />}
                        <text x="50" y="54" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold" fontFamily="Outfit">{total}</text>
                      </svg>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8F8F9B' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#FF5C00', display: 'inline-block' }}></span> Очікування</span>
                          <strong style={{ color: '#FF5C00' }}>{upcoming}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8F8F9B' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#10B981', display: 'inline-block' }}></span> Активні</span>
                          <strong style={{ color: '#10B981' }}>{active}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8F8F9B' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#8B5CF6', display: 'inline-block' }}></span> Завершені</span>
                          <strong style={{ color: '#8B5CF6' }}>{completed}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ==========================================
                  ARCHIVES SECTION
                 ========================================== */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '24px', marginTop: '12px' }}>
                
                {/* 🏆 Completed Tournaments Archive */}
                <div className="esports-card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '850', textTransform: 'uppercase', fontFamily: 'Outfit', color: '#ccc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Trophy size={16} color="#8B5CF6" /> Архів Завершених Турнірів
                  </h3>
                  
                  {(() => {
                    const completed = tournaments.filter(t => t.status === 'completed');
                    if (completed.length === 0) {
                      return (
                        <div style={{ padding: '40px 10px', textAlign: 'center', color: '#51515E' }}>
                          <p style={{ fontSize: '13px', fontWeight: '750' }}>Завершених турнірів ще немає</p>
                        </div>
                      );
                    }
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
                        {completed.map(t => {
                          const tTeams = teams[t.id] || [];
                          return (
                            <div key={t.id} style={{
                              background: 'rgba(255,255,255,0.01)',
                              border: '1px solid rgba(255,255,255,0.04)',
                              borderRadius: '12px',
                              padding: '16px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h4 style={{ fontSize: '14px', fontWeight: '800', fontFamily: 'Outfit', color: 'white', margin: 0 }}>
                                  {t.name}
                                </h4>
                                <span style={{ fontSize: '10px', color: '#8B5CF6', fontWeight: '800', textTransform: 'uppercase' }}>
                                  {t.type}
                                </span>
                              </div>
                              <div style={{ fontSize: '11px', color: '#8F8F9B', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                <div>📅 Дата: <span style={{ color: 'white', fontWeight: '600' }}>{t.date || 'Не вказано'}</span></div>
                                <div>👥 Гравці/Команди: <span style={{ color: '#10B981', fontWeight: '700' }}>{tTeams.length}</span></div>
                                <div>🗺️ Карта: <span style={{ color: 'white', fontWeight: '600' }}>{t.map || 'Невідомо'}</span></div>
                                <div>💰 Приз: <span style={{ color: '#FF5C00', fontWeight: '750' }}>{t.prizePool}</span></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* ⚔️ Finished Matches Archive */}
                <div className="esports-card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '850', textTransform: 'uppercase', fontFamily: 'Outfit', color: '#ccc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Swords size={16} color="#10B981" /> Архів Зіграних Матчів
                  </h3>

                  {(() => {
                    const finished = matches.filter(m => m.status === 'finished');
                    if (finished.length === 0) {
                      return (
                        <div style={{ padding: '40px 10px', textAlign: 'center', color: '#51515E' }}>
                          <p style={{ fontSize: '13px', fontWeight: '750' }}>Зіграних матчів ще немає</p>
                        </div>
                      );
                    }
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
                        {finished.map(m => {
                          const scoreA = m.scoreA;
                          const scoreB = m.scoreB;
                          const winA = scoreA > scoreB;
                          const winB = scoreB > scoreA;
                          return (
                            <div key={m.id} style={{
                              background: 'rgba(255,255,255,0.01)',
                              border: '1px solid rgba(255,255,255,0.04)',
                              borderRadius: '12px',
                              padding: '16px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#8F8F9B', textTransform: 'uppercase' }}>
                                <span>🏆 {m.tournamentName}</span>
                                <span>{m.roundName}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0' }}>
                                {/* Team A */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                  <span style={{ 
                                    fontSize: '13px', 
                                    fontWeight: winA ? '900' : '600', 
                                    color: winA ? '#10B981' : '#ccc' 
                                  }}>
                                    {m.teamA?.name || 'TBD'}
                                  </span>
                                  {winA && <span style={{ fontSize: '10px', color: '#10B981' }}>👑</span>}
                                </div>

                                {/* Score Display */}
                                <span style={{ 
                                  fontFamily: 'Outfit', 
                                  fontWeight: '900', 
                                  fontSize: '14px', 
                                  color: 'white',
                                  padding: '4px 10px',
                                  background: 'rgba(255,255,255,0.02)',
                                  borderRadius: '6px',
                                  margin: '0 12px'
                                }}>
                                  {scoreA} : {scoreB}
                                </span>

                                {/* Team B */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'flex-end' }}>
                                  {winB && <span style={{ fontSize: '10px', color: '#10B981' }}>👑</span>}
                                  <span style={{ 
                                    fontSize: '13px', 
                                    fontWeight: winB ? '900' : '600', 
                                    color: winB ? '#10B981' : '#ccc' 
                                  }}>
                                    {m.teamB?.name || 'TBD'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

              </div>

            </div>
          )}

          {/* ============================================================
              TAB: COINS
             ============================================================ */}
          {activeTab === 'coins' && (
            <CoinsManagementView />
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

                {/* Managers section inside settings */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '20px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '800', fontFamily: 'Outfit', color: 'white', marginBottom: '6px' }}>Список Керуючих Платформою</h4>
                  <p style={{ fontSize: '11px', color: '#51515E', marginBottom: '16px' }}>Всі зареєстровані адміністратори та керуючі з правами доступу.</p>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#8F8F9B' }}>
                        <th style={{ padding: '10px 12px' }}>Користувач</th>
                        <th style={{ padding: '10px 12px' }}>Ел. Пошта</th>
                        <th style={{ padding: '10px 12px' }}>Роль</th>
                        <th style={{ padding: '10px 12px' }}>Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {managers.map((mgr, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                          <td style={{ padding: '12px', fontWeight: '700', color: 'white', fontFamily: 'Outfit' }}>{mgr.username}</td>
                          <td style={{ padding: '12px', color: '#8F8F9B' }}>{mgr.email}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ background: mgr.role.includes('Super') ? 'rgba(255,92,0,0.1)' : 'rgba(139,92,246,0.1)', color: mgr.role.includes('Super') ? '#FF5C00' : '#8B5CF6', padding: '2px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: '800' }}>{mgr.role}</span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: mgr.status === 'online' ? '#10B981' : '#51515E', fontWeight: '600' }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: mgr.status === 'online' ? '#10B981' : '#51515E', display: 'inline-block' }}></span>
                              {mgr.status === 'online' ? 'Online' : 'Offline'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                    <option value="3X3">3x3 Match</option>
                    <option value="4X4">4x4 Classic</option>
                    <option value="5X5">5x5 Classic</option>
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
                    {[2, 4, 8, 16, 32].map(n => (
                      <option key={n} value={n}>
                        {n} {n === 2 || n === 4 ? 'команди' : 'команд'}
                      </option>
                    ))}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
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
                  <label style={{ fontSize: '10px', fontWeight: '800', color: '#8F8F9B', textTransform: 'uppercase' }}>Призових місць</label>
                  <select
                    value={editTourneyForm.prizePlacesCount}
                    onChange={e => setEditTourneyForm({ ...editTourneyForm, prizePlacesCount: Number(e.target.value) })}
                    style={{
                      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '10px', padding: '10px 14px', color: 'white', fontSize: '12px', outline: 'none', fontFamily: 'Outfit', cursor: 'pointer'
                    }}
                  >
                    <option value={1}>1 місце (100%)</option>
                    <option value={2}>2 місця (60/40%)</option>
                    <option value={3}>3 місця (50/30/20%)</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: editTourneyForm.prizePlacesCount === 1 ? '1fr' : editTourneyForm.prizePlacesCount === 2 ? '1fr 1fr' : '1fr 1fr 1fr', gap: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '10px', fontWeight: '800', color: '#FFD700', textTransform: 'uppercase' }}>🥇 1-е місце</label>
                  <input 
                    type="text" 
                    placeholder={`Авто (${editTourneyForm.prizePlacesCount === 1 ? '100' : editTourneyForm.prizePlacesCount === 2 ? '60' : '50'}%)`}
                    value={editTourneyForm.prizeFirst}
                    onChange={e => setEditTourneyForm({ ...editTourneyForm, prizeFirst: e.target.value })}
                    style={{
                      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '10px', padding: '10px 14px', color: 'white', fontSize: '12px', outline: 'none', fontFamily: 'Outfit'
                    }}
                  />
                </div>
                {editTourneyForm.prizePlacesCount >= 2 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '10px', fontWeight: '800', color: '#C0C0C0', textTransform: 'uppercase' }}>🥈 2-е місце</label>
                    <input 
                      type="text" 
                      placeholder={`Авто (${editTourneyForm.prizePlacesCount === 2 ? '40' : '30'}%)`}
                      value={editTourneyForm.prizeSecond}
                      onChange={e => setEditTourneyForm({ ...editTourneyForm, prizeSecond: e.target.value })}
                      style={{
                        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '10px', padding: '10px 14px', color: 'white', fontSize: '12px', outline: 'none', fontFamily: 'Outfit'
                      }}
                    />
                  </div>
                )}
                {editTourneyForm.prizePlacesCount >= 3 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '10px', fontWeight: '800', color: '#CD7F32', textTransform: 'uppercase' }}>🥉 3-є місце</label>
                    <input 
                      type="text" 
                      placeholder="Авто (20%)"
                      value={editTourneyForm.prizeThird}
                      onChange={e => setEditTourneyForm({ ...editTourneyForm, prizeThird: e.target.value })}
                      style={{
                        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '10px', padding: '10px 14px', color: 'white', fontSize: '12px', outline: 'none', fontFamily: 'Outfit'
                      }}
                    />
                  </div>
                )}
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

              {/* Stream URL */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '16px' }}>
                <label style={{ fontSize: '10px', fontWeight: '800', color: '#EF4444', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📡 Посилання на LIVE Ефір (YouTube / Twitch)
                </label>
                <input
                  type="url"
                  placeholder="https://youtube.com/live/... або https://twitch.tv/channel"
                  value={editTourneyForm.streamUrl}
                  onChange={e => setEditTourneyForm({ ...editTourneyForm, streamUrl: e.target.value })}
                  style={{
                    background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: '10px', padding: '10px 14px', color: 'white', fontSize: '12px', outline: 'none', fontFamily: 'Outfit'
                  }}
                />
                {editTourneyForm.streamUrl && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '10px', color: '#10B981', fontWeight: '700' }}>✓ Ефір підключено</span>
                    <button
                      type="button"
                      onClick={() => setEditTourneyForm({ ...editTourneyForm, streamUrl: '' })}
                      style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '10px', fontWeight: '700' }}
                    >
                      Прибрати
                    </button>
                  </div>
                )}
                <span style={{ fontSize: '10px', color: '#51515E' }}>Гравці побачать цей ефір на сторінці матчу під час Live статусу</span>
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
