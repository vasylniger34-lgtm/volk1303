import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { ProfileRow, MatchRow, TeamRow } from '../types/database';

// ─── Types ───

export interface Player {
  username: string;
}

export interface Team {
  id: string;
  name: string;
  tag: string;
  captain: string;
  players: Player[];
  logoText: string;
  logoBg: string;
}

export interface Tournament {
  id: string;
  name: string;
  type: '2X2' | '4X4' | 'BCI';
  date: string;
  prizePool: string;
  prizePlaces: {
    first: string;
    second: string;
    third: string;
  };
  participantsCount: number;
  maxParticipants: number;
  status: 'upcoming' | 'active' | 'completed';
  map: string;
  system: string;
  rules: string[];
}

export interface Match {
  id: string;
  tournamentId: string;
  tournamentName: string;
  roundName: '1/8' | 'Quarterfinal' | 'Semifinal' | 'Final';
  teamA: Team | null;
  teamB: Team | null;
  scoreA: number;
  scoreB: number;
  status: 'scheduled' | 'live' | 'finished';
  winnerId: string | null;
  oddsA: number;
  oddsB: number;
  map: string;
  time: string;
  currentMap: number;
  mapScores: { scoreA: number; scoreB: number }[];
  liveLogs: string[];
}

export interface Prediction {
  id: string;
  matchId: string;
  tournamentName: string;
  teamA: string;
  teamB: string;
  predictionType: 'winner' | 'total_rounds';
  predictedValue: string;
  odds: number;
  wager: number;
  status: 'pending' | 'won' | 'lost';
  payout: number;
  date: string;
}

export interface UserStats {
  wins: number;
  losses: number;
  predictionsPlaced: number;
  predictionsWon: number;
}

export interface UserProfile {
  id: string;
  username: string;
  balance: number;
  level: number;
  xp: number;
  xpNext: number;
  role: 'player' | 'admin' | 'moderator';
  stats: UserStats;
}

export interface ToastMessage {
  show: boolean;
  message: string;
  type: 'success' | 'info' | 'error';
}

interface AppContextType {
  // Auth
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  authLogin: (telegramData: { id: string; username: string; first_name: string }) => Promise<void>;
  authLogout: () => Promise<void>;
  // Data
  user: UserProfile;
  tournaments: Tournament[];
  teams: Record<string, Team[]>;
  matches: Match[];
  predictions: Prediction[];
  toast: ToastMessage;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  hideToast: () => void;
  registerTeam: (tournamentId: string, teamData: Omit<Team, 'id' | 'logoText' | 'logoBg'>) => boolean;
  placePrediction: (prediction: Omit<Prediction, 'id' | 'status' | 'payout' | 'date'>) => boolean;
  setMatchLive: (matchId: string) => void;
  setMatchScore: (matchId: string, scoreA: number, scoreB: number, status: 'live' | 'finished', winnerId?: string | null) => void;
  resetAllData: () => void;
  addFunds: (amount: number) => void;
  createTournament: (tourney: Omit<Tournament, 'id' | 'participantsCount' | 'status'>) => void;
  resolveBetsForMatch: (matchId: string, winnerId: string, finalScoreA: number, finalScoreB: number) => void;
  generateBracketForTournament: (tournamentId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ─── Default Mock Data ───

const DEFAULT_TEAMS: Omit<Team, 'id'>[] = [
  { name: 'Team 67', tag: '67', captain: '@volki_player', players: [{ username: '@volki_player' }, { username: '@volki_partner' }], logoText: '67', logoBg: '#4C1D95' },
  { name: 'Team 52', tag: '52', captain: '@player_52', players: [{ username: '@player_52' }, { username: '@partner_52' }], logoText: '52', logoBg: '#1E293B' },
  { name: 'Wild Wolves', tag: 'WW', captain: '@wolf_cap', players: [{ username: '@wolf_cap' }, { username: '@wolf_two' }], logoText: 'WW', logoBg: '#064E3B' },
  { name: 'Exort', tag: 'EX', captain: '@exort_cap', players: [{ username: '@exort_cap' }, { username: '@exort_two' }], logoText: 'EX', logoBg: '#7F1D1D' },
  { name: 'Next Gen', tag: 'NE', captain: '@next_cap', players: [{ username: '@next_cap' }, { username: '@next_two' }], logoText: 'NE', logoBg: '#1E3A8A' },
  { name: 'Good Game', tag: 'GG', captain: '@gg_cap', players: [{ username: '@gg_cap' }, { username: '@gg_two' }], logoText: 'GG', logoBg: '#701A75' },
  { name: 'Thirteen', tag: '13', captain: '@thirteen_cap', players: [{ username: '@thirteen_cap' }, { username: '@thirteen_two' }], logoText: '13', logoBg: '#78350F' },
  { name: 'Kill Machine', tag: 'KM', captain: '@km_cap', players: [{ username: '@km_cap' }, { username: '@km_two' }], logoText: 'KM', logoBg: '#312E81' },
  { name: 'King Rosters', tag: 'KR', captain: '@kr_cap', players: [{ username: '@kr_cap' }, { username: '@kr_two' }], logoText: 'KR', logoBg: '#0F172A' },
  { name: 'Anarchy', tag: 'AN', captain: '@anarchy_cap', players: [{ username: '@anarchy_cap' }, { username: '@anarchy_two' }], logoText: 'AN', logoBg: '#854D0E' },
  { name: 'Flash', tag: 'FL', captain: '@flash_cap', players: [{ username: '@flash_cap' }, { username: '@flash_two' }], logoText: 'FL', logoBg: '#14532D' },
  { name: 'Zero Q', tag: 'ZQ', captain: '@zq_cap', players: [{ username: '@zq_cap' }, { username: '@zq_two' }], logoText: 'ZQ', logoBg: '#581C87' },
  { name: 'Nexus', tag: 'NX', captain: '@nexus_cap', players: [{ username: '@nexus_cap' }, { username: '@nexus_two' }], logoText: 'NX', logoBg: '#164E63' },
  { name: 'Qwert', tag: 'QT', captain: '@qt_cap', players: [{ username: '@qt_cap' }, { username: '@qt_two' }], logoText: 'QT', logoBg: '#581C87' },
  { name: 'Rising Stars', tag: 'RS', captain: '@rs_cap', players: [{ username: '@rs_cap' }, { username: '@rs_two' }], logoText: 'RS', logoBg: '#111827' }
];

const DEFAULT_USER: UserProfile = {
  id: 'local_user',
  username: 'volki_player',
  balance: 12450,
  level: 4,
  xp: 450,
  xpNext: 1000,
  role: 'admin', // Local dev mode = admin by default
  stats: { wins: 28, losses: 14, predictionsPlaced: 47, predictionsWon: 31 }
};

// ─── Supabase helpers: convert DB rows to app types ───

function dbTeamToApp(row: TeamRow): Team {
  return {
    id: row.id,
    name: row.name,
    tag: row.tag,
    captain: row.captain,
    players: (row.players || []) as Player[],
    logoText: row.logo_text || row.tag.substring(0, 2).toUpperCase(),
    logoBg: row.logo_bg || '#1E293B'
  };
}

function profileToUser(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    username: row.username,
    balance: row.balance,
    level: row.level,
    xp: row.xp,
    xpNext: row.xp_next,
    role: row.role,
    stats: {
      wins: row.wins,
      losses: row.losses,
      predictionsPlaced: row.predictions_placed,
      predictionsWon: row.predictions_won
    }
  };
}

// ─── Provider ───

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const useSupabase = isSupabaseConfigured();

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (!useSupabase) return true; // offline mode = auto-logged-in
    return Boolean(localStorage.getItem('volk_session'));
  });
  const [isLoading, setIsLoading] = useState(useSupabase);

  // 1. User state
  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('volk_user');
    return saved ? JSON.parse(saved) : DEFAULT_USER;
  });

  const isAdmin = user.role === 'admin';

  // 2. Tournaments
  const [tournaments, setTournaments] = useState<Tournament[]>(() => {
    const saved = localStorage.getItem('volk_tournaments');
    return saved ? JSON.parse(saved) : [
      {
        id: '2x2_aim_cup', name: '2X2 AIM CUP', type: '2X2', date: 'Сьогодні, 20:00',
        prizePool: '20 000 🪙', prizePlaces: { first: '10 000 🪙', second: '6 000 🪙', third: '4 000 🪙' },
        participantsCount: 15, maxParticipants: 16, status: 'active', map: 'de_dust2',
        system: 'Single Elimination', rules: ['Матчі проходять у форматі 2х2.', 'Single Elimination.', 'Використання сторонніх програм заборонено.']
      },
      {
        id: '2x2_headshot', name: '2X2 HEADSHOT', type: '2X2', date: '30.05, 18:00',
        prizePool: '15 000 🪙', prizePlaces: { first: '8 000 🪙', second: '4 500 🪙', third: '2 500 🪙' },
        participantsCount: 8, maxParticipants: 16, status: 'upcoming', map: 'de_inferno',
        system: 'Single Elimination', rules: ['Лише попадання в голову.', 'Формат 2х2, BO1.']
      },
      {
        id: '2x2_fast_cup', name: '2X2 FAST CUP', type: '2X2', date: '31.05, 19:00',
        prizePool: '10 000 🪙', prizePlaces: { first: '5 000 🪙', second: '3 000 🪙', third: '2 000 🪙' },
        participantsCount: 4, maxParticipants: 16, status: 'upcoming', map: 'de_mirage',
        system: 'Single Elimination', rules: ['Швидкий турнір за 2 години.']
      },
      {
        id: '2x2_warmup', name: '2X2 WARMUP', type: '2X2', date: '01.06, 17:00',
        prizePool: '10 000 🪙', prizePlaces: { first: '5 000 🪙', second: '3 000 🪙', third: '2 000 🪙' },
        participantsCount: 0, maxParticipants: 16, status: 'upcoming', map: 'de_nuke',
        system: 'Single Elimination', rules: ['Розминочний турнір.']
      },
      {
        id: '4x4_night_battle', name: '4X4 NIGHT BATTLE', type: '4X4', date: 'Завтра, 19:00',
        prizePool: '30 000 🪙', prizePlaces: { first: '15 000 🪙', second: '10 000 🪙', third: '5 000 🪙' },
        participantsCount: 12, maxParticipants: 16, status: 'upcoming', map: 'de_ancient',
        system: 'Single Elimination', rules: ['Нічний турнір у форматі 4х4.']
      }
    ];
  });

  // 3. Teams
  const [teams, setTeams] = useState<Record<string, Team[]>>(() => {
    const saved = localStorage.getItem('volk_teams');
    if (saved) return JSON.parse(saved);
    const aimCupTeams = DEFAULT_TEAMS.map((t, idx) => ({ ...t, id: `team_${idx + 1}` }));
    return {
      '2x2_aim_cup': aimCupTeams,
      '2x2_headshot': aimCupTeams.slice(0, 8),
      '2x2_fast_cup': aimCupTeams.slice(0, 4),
      '2x2_warmup': [],
      '4x4_night_battle': aimCupTeams.slice(0, 12)
    };
  });

  // 4. Matches
  const [matches, setMatches] = useState<Match[]>(() => {
    const saved = localStorage.getItem('volk_matches');
    if (saved) return JSON.parse(saved);
    const list: Team[] = DEFAULT_TEAMS.map((t, idx) => ({ ...t, id: `team_${idx + 1}` }));
    return [
      {
        id: 'match_aim_cup_semi_1', tournamentId: '2x2_aim_cup', tournamentName: '2X2 AIM CUP',
        roundName: 'Semifinal', teamA: list[0], teamB: list[1], scoreA: 12, scoreB: 7,
        status: 'live', winnerId: null, oddsA: 1.55, oddsB: 2.35, map: 'de_dust2', time: '12:45',
        currentMap: 1, mapScores: [], liveLogs: ['Match started', 'Round 19: Team 67 wins (12:7)']
      },
      {
        id: 'match_aim_cup_semi_2', tournamentId: '2x2_aim_cup', tournamentName: '2X2 AIM CUP',
        roundName: 'Semifinal', teamA: list[2], teamB: list[3], scoreA: 0, scoreB: 0,
        status: 'scheduled', winnerId: null, oddsA: 1.85, oddsB: 1.95, map: 'de_dust2', time: '14:30',
        currentMap: 1, mapScores: [], liveLogs: []
      },
      {
        id: 'match_aim_cup_quarter_1', tournamentId: '2x2_aim_cup', tournamentName: '2X2 AIM CUP',
        roundName: 'Quarterfinal', teamA: list[0], teamB: list[4], scoreA: 16, scoreB: 9,
        status: 'finished', winnerId: 'team_1', oddsA: 1.45, oddsB: 2.65, map: 'de_dust2', time: 'Вчора',
        currentMap: 1, mapScores: [{ scoreA: 16, scoreB: 9 }], liveLogs: ['Team 67 advanced']
      },
      {
        id: 'match_aim_cup_quarter_2', tournamentId: '2x2_aim_cup', tournamentName: '2X2 AIM CUP',
        roundName: 'Quarterfinal', teamA: list[1], teamB: list[5], scoreA: 16, scoreB: 12,
        status: 'finished', winnerId: 'team_2', oddsA: 1.70, oddsB: 2.10, map: 'de_dust2', time: 'Вчора',
        currentMap: 1, mapScores: [{ scoreA: 16, scoreB: 12 }], liveLogs: ['Team 52 advanced']
      }
    ] as Match[];
  });

  // 5. Predictions
  const [predictions, setPredictions] = useState<Prediction[]>(() => {
    const saved = localStorage.getItem('volk_predictions');
    return saved ? JSON.parse(saved) : [];
  });

  // Toast
  const [toast, setToast] = useState<ToastMessage>({ show: false, message: '', type: 'success' });

  // ─── Supabase Init: check session & load data ───

  useEffect(() => {
    if (!useSupabase) {
      setIsLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            setUser(profileToUser(profile as ProfileRow));
          }
          setIsAuthenticated(true);
          localStorage.setItem('volk_session', 'true');

          // Load tournaments from Supabase
          await loadSupabaseData();
        } else {
          setIsAuthenticated(false);
          localStorage.removeItem('volk_session');
        }
      } catch (err) {
        console.error('[VOLKI] Auth init error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          setUser(profileToUser(profile as ProfileRow));
        }
        setIsAuthenticated(true);
        localStorage.setItem('volk_session', 'true');
        await loadSupabaseData();
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        localStorage.removeItem('volk_session');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ─── Supabase Data Loader ───

  const loadSupabaseData = useCallback(async () => {
    if (!useSupabase) return;

    try {
      // Load tournaments
      const { data: tourneysData } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false });

      if (tourneysData && tourneysData.length > 0) {
        setTournaments(tourneysData.map(t => ({
          id: t.id,
          name: t.name,
          type: t.type as '2X2' | '4X4' | 'BCI',
          date: t.date,
          prizePool: t.prize_pool,
          prizePlaces: {
            first: t.prize_first || '',
            second: t.prize_second || '',
            third: t.prize_third || ''
          },
          participantsCount: t.participants_count,
          maxParticipants: t.max_participants,
          status: t.status as 'upcoming' | 'active' | 'completed',
          map: t.map,
          system: t.system,
          rules: t.rules || []
        })));
      }

      // Load teams
      const { data: teamsData } = await supabase.from('teams').select('*');
      if (teamsData && teamsData.length > 0) {
        const grouped: Record<string, Team[]> = {};
        teamsData.forEach(t => {
          const team = dbTeamToApp(t as TeamRow);
          if (!grouped[t.tournament_id]) grouped[t.tournament_id] = [];
          grouped[t.tournament_id].push(team);
        });
        setTeams(grouped);
      }

      // Load matches (with team data)
      const { data: matchesData } = await supabase.from('matches').select('*');
      if (matchesData && matchesData.length > 0) {
        // We need teams to hydrate match data
        const { data: allTeamsData } = await supabase.from('teams').select('*');
        const teamsMap: Record<string, Team> = {};
        (allTeamsData || []).forEach(t => {
          teamsMap[t.id] = dbTeamToApp(t as TeamRow);
        });

        setMatches(matchesData.map((m: MatchRow) => ({
          id: m.id,
          tournamentId: m.tournament_id,
          tournamentName: m.tournament_name,
          roundName: m.round_name,
          teamA: m.team_a_id ? teamsMap[m.team_a_id] || null : null,
          teamB: m.team_b_id ? teamsMap[m.team_b_id] || null : null,
          scoreA: m.score_a,
          scoreB: m.score_b,
          status: m.status as 'scheduled' | 'live' | 'finished',
          winnerId: m.winner_id,
          oddsA: Number(m.odds_a),
          oddsB: Number(m.odds_b),
          map: m.map,
          time: m.time || '',
          currentMap: m.current_map,
          mapScores: (m.map_scores || []) as { scoreA: number; scoreB: number }[],
          liveLogs: m.live_logs || []
        })));
      }
    } catch (err) {
      console.error('[VOLKI] Data load error:', err);
    }
  }, [useSupabase]);

  // ─── Supabase Realtime: subscribe to match updates ───

  useEffect(() => {
    if (!useSupabase) return;

    const channel = supabase
      .channel('matches-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'matches'
      }, () => {
        // Reload all data on any match change
        loadSupabaseData();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tournaments'
      }, () => {
        loadSupabaseData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [useSupabase, loadSupabaseData]);

  // ─── localStorage sync (offline mode) ───

  useEffect(() => { localStorage.setItem('volk_user', JSON.stringify(user)); }, [user]);
  useEffect(() => { localStorage.setItem('volk_tournaments', JSON.stringify(tournaments)); }, [tournaments]);
  useEffect(() => { localStorage.setItem('volk_teams', JSON.stringify(teams)); }, [teams]);
  useEffect(() => { localStorage.setItem('volk_matches', JSON.stringify(matches)); }, [matches]);
  useEffect(() => { localStorage.setItem('volk_predictions', JSON.stringify(predictions)); }, [predictions]);

  // ─── LIVE scores simulator (offline mode only) ───

  useEffect(() => {
    if (useSupabase) return; // In Supabase mode, scores are updated via admin panel

    const interval = setInterval(() => {
      setMatches(prevMatches => {
        let updated = false;
        const newMatches = prevMatches.map(match => {
          if (match.status === 'live') {
            updated = true;
            const probA = 1 / match.oddsA;
            const probB = 1 / match.oddsB;
            const totalProb = probA + probB;
            const roll = Math.random() * totalProb;

            let newScoreA = match.scoreA;
            let newScoreB = match.scoreB;
            let roundWinner = '';

            if (roll < probA) {
              newScoreA += 1;
              roundWinner = match.teamA?.name || 'Team A';
            } else {
              newScoreB += 1;
              roundWinner = match.teamB?.name || 'Team B';
            }

            const currentTotalRound = newScoreA + newScoreB;
            const logEntry = `Round ${currentTotalRound}: ${roundWinner} wins with ${Math.random() > 0.6 ? 'a stunning double kill' : 'excellent site control'}.`;
            const newLogs = [...match.liveLogs, logEntry];
            if (newLogs.length > 15) newLogs.shift();

            if (newScoreA >= 16 && newScoreA - newScoreB >= 2) {
              setTimeout(() => {
                resolveBetsForMatch(match.id, match.teamA?.id || '', newScoreA, newScoreB);
              }, 500);
              return { ...match, scoreA: newScoreA, scoreB: newScoreB, status: 'finished', winnerId: match.teamA?.id || null, liveLogs: [...newLogs, `${match.teamA?.name} wins ${newScoreA}:${newScoreB}!`] } as Match;
            } else if (newScoreB >= 16 && newScoreB - newScoreA >= 2) {
              setTimeout(() => {
                resolveBetsForMatch(match.id, match.teamB?.id || '', newScoreA, newScoreB);
              }, 500);
              return { ...match, scoreA: newScoreA, scoreB: newScoreB, status: 'finished', winnerId: match.teamB?.id || null, liveLogs: [...newLogs, `${match.teamB?.name} wins ${newScoreA}:${newScoreB}!`] } as Match;
            }

            return { ...match, scoreA: newScoreA, scoreB: newScoreB, liveLogs: newLogs } as Match;
          }
          return match;
        });
        return updated ? newMatches : prevMatches;
      });
    }, 9000);

    return () => clearInterval(interval);
  }, [matches, useSupabase]);

  // ─── Auth Methods ───

  const authLogin = async (telegramData: { id: string; username: string; first_name: string }) => {
    setIsLoading(true);
    let supabaseSuccess = false;

    try {
      if (useSupabase) {
        const email = `${telegramData.id}@telegram.volki.app`;
        const password = `volki_tg_${telegramData.id}_secure`;

        // Try sign in first
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

        if (signInError) {
          // Try sign up
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                username: telegramData.username,
                telegram_id: telegramData.id,
                telegram_username: telegramData.username
              }
            }
          });

          if (!signUpError && signUpData?.user) {
            // Try sign in again after signup
            const { error: retryError } = await supabase.auth.signInWithPassword({ email, password });
            if (!retryError) {
              supabaseSuccess = true;
            }
          }
        } else {
          supabaseSuccess = true;
        }

        if (supabaseSuccess) {
          // Load profile from Supabase
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            if (profile) {
              setUser(profileToUser(profile as ProfileRow));
            }
          }
        }
      }
    } catch (err) {
      console.warn('[VOLKI] Supabase auth failed, using offline mode:', err);
    }

    // Always authenticate — fallback to mock if Supabase didn't work
    if (!supabaseSuccess) {
      setUser(prev => ({
        ...prev,
        id: telegramData.id,
        username: telegramData.username
      }));
    }

    setIsAuthenticated(true);
    localStorage.setItem('volk_session', 'true');
    showToast(`Вітаємо, @${telegramData.username}! 🎮`, 'success');
    setIsLoading(false);
  };

  const authLogout = async () => {
    if (useSupabase) {
      await supabase.auth.signOut();
    }
    setIsAuthenticated(false);
    localStorage.removeItem('volk_session');
    setUser(DEFAULT_USER);
    showToast('Ви вийшли з акаунту', 'info');
  };

  // ─── Toast ───

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ show: true, message, type });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, show: false }));
  };

  const addFunds = (amount: number) => {
    if (useSupabase) {
      supabase.from('profiles').update({ balance: user.balance + amount }).eq('id', user.id).then();
    }
    setUser(prev => ({ ...prev, balance: prev.balance + amount }));
    showToast(`Баланс поповнено на +${amount} 🪙`, 'success');
  };

  // ─── Register Team ───

  const registerTeam = (tournamentId: string, teamData: Omit<Team, 'id' | 'logoText' | 'logoBg'>): boolean => {
    const tourney = tournaments.find(t => t.id === tournamentId);
    if (!tourney) return false;
    if (tourney.participantsCount >= tourney.maxParticipants) {
      showToast('Турнір вже заповнений!', 'error');
      return false;
    }

    const newTeam: Team = {
      ...teamData,
      id: `team_${Date.now()}`,
      logoText: teamData.tag.substring(0, 3).toUpperCase(),
      logoBg: ['#FF5C00', '#8B5CF6', '#10B981', '#3B82F6', '#EF4444', '#EC4899'][Math.floor(Math.random() * 6)]
    };

    if (useSupabase) {
      supabase.from('teams').insert({
        tournament_id: tournamentId,
        name: newTeam.name,
        tag: newTeam.tag,
        captain: newTeam.captain,
        players: newTeam.players as unknown as { username: string }[],
        logo_text: newTeam.logoText,
        logo_bg: newTeam.logoBg
      }).then();

      supabase.from('tournaments')
        .update({ participants_count: tourney.participantsCount + 1 })
        .eq('id', tournamentId).then();
    }

    setTeams(prev => ({ ...prev, [tournamentId]: [...(prev[tournamentId] || []), newTeam] }));
    setTournaments(prev => prev.map(t => {
      if (t.id === tournamentId) {
        const newCount = t.participantsCount + 1;
        return { ...t, participantsCount: newCount, status: newCount === t.maxParticipants ? 'active' : t.status };
      }
      return t;
    }));

    showToast(`Команда "${teamData.name}" зареєстрована!`, 'success');

    if (tourney.participantsCount + 1 === tourney.maxParticipants) {
      setTimeout(() => generateBracketForTournament(tournamentId), 1000);
    }

    return true;
  };

  // ─── Generate Bracket ───

  const generateBracketForTournament = (tournamentId: string) => {
    const list = teams[tournamentId] || [];
    if (list.length < 2) return;

    const newMatches: Match[] = [];
    const tourney = tournaments.find(t => t.id === tournamentId);
    const tournamentName = tourney?.name || 'Tournament';
    const shuffled = [...list].sort(() => Math.random() - 0.5);

    if (shuffled.length >= 8) {
      newMatches.push({
        id: `match_${tournamentId}_semi_1`, tournamentId, tournamentName,
        roundName: 'Semifinal', teamA: shuffled[0] || null, teamB: shuffled[1] || null,
        scoreA: 0, scoreB: 0, status: 'scheduled', winnerId: null,
        oddsA: parseFloat((1.3 + Math.random() * 0.9).toFixed(2)),
        oddsB: parseFloat((1.3 + Math.random() * 0.9).toFixed(2)),
        map: tourney?.map || 'de_dust2', time: '18:00', currentMap: 1, mapScores: [], liveLogs: []
      });

      newMatches.push({
        id: `match_${tournamentId}_semi_2`, tournamentId, tournamentName,
        roundName: 'Semifinal', teamA: shuffled[2] || null, teamB: shuffled[3] || null,
        scoreA: 0, scoreB: 0, status: 'scheduled', winnerId: null,
        oddsA: parseFloat((1.3 + Math.random() * 0.9).toFixed(2)),
        oddsB: parseFloat((1.3 + Math.random() * 0.9).toFixed(2)),
        map: tourney?.map || 'de_dust2', time: '18:45', currentMap: 1, mapScores: [], liveLogs: []
      });

      newMatches.push({
        id: `match_${tournamentId}_final`, tournamentId, tournamentName,
        roundName: 'Final', teamA: null, teamB: null,
        scoreA: 0, scoreB: 0, status: 'scheduled', winnerId: null,
        oddsA: 1.85, oddsB: 1.85,
        map: tourney?.map || 'de_dust2', time: '20:00', currentMap: 1, mapScores: [], liveLogs: []
      });
    }

    if (useSupabase) {
      // Delete existing matches for this tournament, then insert new ones
      supabase.from('matches').delete().eq('tournament_id', tournamentId).then(() => {
        newMatches.forEach(m => {
          supabase.from('matches').insert({
            tournament_id: m.tournamentId,
            tournament_name: m.tournamentName,
            round_name: m.roundName,
            team_a_id: m.teamA?.id || null,
            team_b_id: m.teamB?.id || null,
            score_a: m.scoreA,
            score_b: m.scoreB,
            status: m.status,
            odds_a: m.oddsA,
            odds_b: m.oddsB,
            map: m.map,
            time: m.time,
            current_map: m.currentMap,
            map_scores: m.mapScores,
            live_logs: m.liveLogs
          }).then();
        });
      });
    }

    setMatches(prev => {
      const filtered = prev.filter(m => m.tournamentId !== tournamentId);
      return [...filtered, ...newMatches];
    });

    showToast('Турнірну сітку сформовано!', 'info');
  };

  // ─── Place Prediction ───

  const placePrediction = (predictionData: Omit<Prediction, 'id' | 'status' | 'payout' | 'date'>): boolean => {
    if (user.balance < predictionData.wager) {
      showToast('Недостатньо коштів!', 'error');
      return false;
    }

    const newPrediction: Prediction = {
      ...predictionData,
      id: `pred_${Date.now()}`,
      status: 'pending',
      payout: 0,
      date: new Date().toLocaleDateString('uk-UA', { hour: '2-digit', minute: '2-digit' })
    };

    if (useSupabase) {
      supabase.from('predictions').insert({
        user_id: user.id,
        match_id: predictionData.matchId,
        tournament_name: predictionData.tournamentName,
        team_a: predictionData.teamA,
        team_b: predictionData.teamB,
        prediction_type: predictionData.predictionType,
        predicted_value: predictionData.predictedValue,
        odds: predictionData.odds,
        wager: predictionData.wager
      }).then();

      supabase.from('profiles').update({
        balance: user.balance - predictionData.wager,
        predictions_placed: user.stats.predictionsPlaced + 1
      }).eq('id', user.id).then();
    }

    setUser(prev => ({
      ...prev,
      balance: prev.balance - predictionData.wager,
      stats: { ...prev.stats, predictionsPlaced: prev.stats.predictionsPlaced + 1 }
    }));

    setPredictions(prev => [newPrediction, ...prev]);
    showToast('Ставку прийнято! 🍀', 'success');
    return true;
  };

  // ─── Match Controls (admin) ───

  const setMatchLive = (matchId: string) => {
    if (useSupabase) {
      supabase.from('matches').update({
        status: 'live',
        score_a: 0,
        score_b: 0,
        live_logs: ['Match started LIVE! GL & HF']
      }).eq('id', matchId).then();
    }

    setMatches(prev => prev.map(m => {
      if (m.id === matchId) {
        return { ...m, status: 'live', scoreA: 0, scoreB: 0, liveLogs: ['Match started LIVE! GL & HF'] };
      }
      return m;
    }));
    showToast('Матч запущено LIVE!', 'info');
  };

  const setMatchScore = (matchId: string, scoreA: number, scoreB: number, status: 'live' | 'finished', winnerId?: string | null) => {
    setMatches(prev => prev.map(m => {
      if (m.id === matchId) {
        const finalWinnerId = status === 'finished' ? (winnerId || (scoreA > scoreB ? m.teamA?.id : m.teamB?.id) || null) : null;

        if (status === 'finished' && finalWinnerId) {
          setTimeout(() => resolveBetsForMatch(matchId, finalWinnerId, scoreA, scoreB), 200);
        }

        if (useSupabase) {
          supabase.from('matches').update({
            score_a: scoreA,
            score_b: scoreB,
            status,
            winner_id: finalWinnerId,
            live_logs: [...m.liveLogs, `Score updated to ${scoreA}:${scoreB}`]
          }).eq('id', matchId).then();
        }

        return {
          ...m, scoreA, scoreB, status,
          winnerId: finalWinnerId,
          liveLogs: [...m.liveLogs, `Score updated to ${scoreA}:${scoreB}`]
        };
      }
      return m;
    }));
  };

  // ─── Resolve Bets ───

  const resolveBetsForMatch = (matchId: string, winnerId: string, finalScoreA: number, finalScoreB: number) => {
    const targetMatch = matches.find(m => m.id === matchId);
    if (!targetMatch) return;

    const winningTeamName = targetMatch.teamA?.id === winnerId ? targetMatch.teamA?.name : targetMatch.teamB?.name;
    const totalRounds = finalScoreA + finalScoreB;

    let totalPayout = 0;
    let wonBetsCount = 0;

    setPredictions(prev => prev.map(pred => {
      if (pred.matchId === matchId && pred.status === 'pending') {
        let won = false;
        if (pred.predictionType === 'winner') {
          won = pred.predictedValue === winningTeamName;
        } else if (pred.predictionType === 'total_rounds') {
          if (pred.predictedValue === 'over' && totalRounds > 26.5) won = true;
          if (pred.predictedValue === 'under' && totalRounds < 26.5) won = true;
        }

        if (won) {
          const payoutAmount = Math.round(pred.wager * pred.odds);
          totalPayout += payoutAmount;
          wonBetsCount += 1;
          return { ...pred, status: 'won', payout: payoutAmount };
        }
        return { ...pred, status: 'lost', payout: 0 };
      }
      return pred;
    }));

    if (totalPayout > 0) {
      setUser(prev => ({
        ...prev,
        balance: prev.balance + totalPayout,
        xp: prev.xp + 150 > prev.xpNext ? (prev.xp + 150) - prev.xpNext : prev.xp + 150,
        level: prev.xp + 150 > prev.xpNext ? prev.level + 1 : prev.level,
        stats: { ...prev.stats, predictionsWon: prev.stats.predictionsWon + wonBetsCount }
      }));
      setTimeout(() => showToast(`Виграш! +${totalPayout} 🪙!`, 'success'), 1000);
    } else {
      setUser(prev => ({ ...prev, stats: { ...prev.stats, losses: prev.stats.losses + 1 } }));
    }

    // Auto-advance bracket
    if (targetMatch.roundName === 'Semifinal') {
      const winnerTeamObj = targetMatch.teamA?.id === winnerId ? targetMatch.teamA : targetMatch.teamB;
      if (winnerTeamObj) {
        setMatches(prev => prev.map(m => {
          if (m.tournamentId === targetMatch.tournamentId && m.roundName === 'Final') {
            if (targetMatch.id.endsWith('semi_1')) {
              return { ...m, teamA: winnerTeamObj };
            }
            return { ...m, teamB: winnerTeamObj };
          }
          return m;
        }));

        if (useSupabase) {
          // Update final match in Supabase
          const isSemi1 = targetMatch.id.endsWith('semi_1');
          const finalMatch = matches.find(m => m.tournamentId === targetMatch.tournamentId && m.roundName === 'Final');
          if (finalMatch) {
            supabase.from('matches').update(
              isSemi1 ? { team_a_id: winnerTeamObj.id } : { team_b_id: winnerTeamObj.id }
            ).eq('id', finalMatch.id).then();
          }
        }
      }
    }
  };

  // ─── Create Tournament ───

  const createTournament = (tourneyData: Omit<Tournament, 'id' | 'participantsCount' | 'status'>) => {
    const newId = `tour_${Date.now()}`;
    const newTourney: Tournament = {
      ...tourneyData,
      id: newId,
      participantsCount: 0,
      status: 'upcoming'
    };

    if (useSupabase) {
      supabase.from('tournaments').insert({
        name: newTourney.name,
        type: newTourney.type,
        date: newTourney.date,
        prize_pool: newTourney.prizePool,
        prize_first: newTourney.prizePlaces.first,
        prize_second: newTourney.prizePlaces.second,
        prize_third: newTourney.prizePlaces.third,
        participants_count: 0,
        max_participants: newTourney.maxParticipants,
        status: 'upcoming',
        map: newTourney.map,
        system: newTourney.system,
        rules: newTourney.rules,
        created_by: user.id
      }).then();
    }

    setTournaments(prev => [newTourney, ...prev]);
    setTeams(prev => ({ ...prev, [newId]: [] }));
    showToast(`Турнір "${tourneyData.name}" створено!`, 'success');
  };

  // ─── Reset ───

  const resetAllData = () => {
    localStorage.removeItem('volk_user');
    localStorage.removeItem('volk_tournaments');
    localStorage.removeItem('volk_teams');
    localStorage.removeItem('volk_matches');
    localStorage.removeItem('volk_predictions');
    localStorage.removeItem('volk_session');
    window.location.reload();
  };

  return (
    <AppContext.Provider value={{
      isAuthenticated,
      isLoading,
      isAdmin,
      authLogin,
      authLogout,
      user,
      tournaments,
      teams,
      matches,
      predictions,
      toast,
      showToast,
      hideToast,
      registerTeam,
      placePrediction,
      setMatchLive,
      setMatchScore,
      resetAllData,
      addFunds,
      createTournament,
      resolveBetsForMatch,
      generateBracketForTournament
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
