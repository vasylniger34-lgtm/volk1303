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
  imageUrl?: string;
  streamUrl?: string;
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
  matchId: string | null;
  tournamentId?: string;
  tournamentName: string;
  teamA: string;
  teamB: string;
  predictionType: 'winner' | 'total_rounds' | 'tournament_winner';
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
  avatarGradient: number;
  avatarUrl?: string | null;
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
  updateMatchOdds: (matchId: string, oddsA: number, oddsB: number) => void;
  resetAllData: () => Promise<void>;
  addFunds: (amount: number) => void;
  createTournament: (tourney: Omit<Tournament, 'id' | 'participantsCount' | 'status'> & { status?: 'upcoming' | 'active' | 'completed' }) => void;
  resolveBetsForMatch: (matchId: string, winnerId: string, finalScoreA: number, finalScoreB: number) => void;
  generateBracketForTournament: (tournamentId: string) => Promise<void>;
  updateProfile: (data: { username?: string; avatarGradient?: number; avatarUrl?: string | null }) => void;
  deleteTournament: (tournamentId: string) => void;
  updateTournament: (tournamentId: string, data: Partial<Tournament>) => void;
  fillTournamentWithBots: (tournamentId: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function generateUUID() {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ─── Default Data ───

const DEFAULT_USER: UserProfile = {
  id: 'local_user',
  username: 'volki_player',
  balance: 5000,
  level: 1,
  xp: 0,
  xpNext: 1000,
  role: 'admin', // Local dev mode = admin by default
  avatarGradient: 0,
  avatarUrl: null,
  stats: { wins: 0, losses: 0, predictionsPlaced: 0, predictionsWon: 0 }
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
    avatarGradient: 0,
    avatarUrl: row.avatar_url,
    stats: {
      wins: row.wins,
      losses: row.losses,
      predictionsPlaced: row.predictions_placed,
      predictionsWon: row.predictions_won
    }
  };
}

function dbPredictionToApp(row: any): Prediction {
  return {
    id: row.id,
    matchId: row.match_id || null,
    tournamentId: row.tournament_id,
    tournamentName: row.tournament_name || 'Турнір',
    teamA: row.team_a || 'Команда A',
    teamB: row.team_b || 'Команда B',
    predictionType: row.prediction_type as 'winner' | 'total_rounds' | 'tournament_winner',
    predictedValue: row.predicted_value,
    odds: Number(row.odds),
    wager: Number(row.wager),
    status: row.status as 'pending' | 'won' | 'lost',
    payout: Number(row.payout || 0),
    date: row.created_at
      ? new Date(row.created_at).toLocaleDateString('uk-UA', { hour: '2-digit', minute: '2-digit' })
      : new Date().toLocaleDateString('uk-UA', { hour: '2-digit', minute: '2-digit' })
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
    try {
      const saved = localStorage.getItem('volk_user');
      return saved ? JSON.parse(saved) : DEFAULT_USER;
    } catch (e) {
      console.warn('[VOLKI] Failed to parse volk_user from localStorage:', e);
      return DEFAULT_USER;
    }
  });

  const isAdmin = user.role === 'admin';

  // 2. Tournaments — starts empty, created via admin
  const [tournaments, setTournaments] = useState<Tournament[]>(() => {
    try {
      const saved = localStorage.getItem('volk_tournaments');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn('[VOLKI] Failed to parse volk_tournaments from localStorage:', e);
      return [];
    }
  });

  // 3. Teams — starts empty, registered by users
  const [teams, setTeams] = useState<Record<string, Team[]>>(() => {
    try {
      const saved = localStorage.getItem('volk_teams');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.warn('[VOLKI] Failed to parse volk_teams from localStorage:', e);
      return {};
    }
  });

  // 4. Matches — starts empty, generated via admin bracket
  const [matches, setMatches] = useState<Match[]>(() => {
    try {
      const saved = localStorage.getItem('volk_matches');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn('[VOLKI] Failed to parse volk_matches from localStorage:', e);
      return [];
    }
  });

  // 5. Predictions
  const [predictions, setPredictions] = useState<Prediction[]>(() => {
    try {
      const saved = localStorage.getItem('volk_predictions');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn('[VOLKI] Failed to parse volk_predictions from localStorage:', e);
      return [];
    }
  });

  // Refs to avoid stale closures in realtime subscriptions
  const tournamentsRef = React.useRef(tournaments);
  const teamsRef = React.useRef(teams);
  const matchesRef = React.useRef(matches);
  const userRef = React.useRef(user);

  useEffect(() => { tournamentsRef.current = tournaments; }, [tournaments]);
  useEffect(() => { teamsRef.current = teams; }, [teams]);
  useEffect(() => { matchesRef.current = matches; }, [matches]);
  useEffect(() => { userRef.current = user; }, [user]);

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
        // Always load public data (tournaments, matches) regardless of auth
        await loadSupabaseData();

        let { data: { session } } = await supabase.auth.getSession();

        const isManagerSite = typeof window !== 'undefined' && (
          window.location.pathname.startsWith('/admin') ||
          window.location.search.includes('manager=true') ||
          window.location.search.includes('admin=true')
        );

        // Auto-login for manager panel in background to guarantee a valid admin session
        if (!session?.user && isManagerSite) {
          console.log('[VOLKI] Auto-authenticating manager in background...');
          const adminEmail = '11111111@telegram.volki.app';
          const adminPassword = 'volki_tg_11111111_secure';
          
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: adminEmail,
            password: adminPassword
          });

          if (!signInError && signInData?.session) {
            session = signInData.session;
          } else {
            // Try to sign up if it doesn't exist
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
              email: adminEmail,
              password: adminPassword,
              options: {
                data: {
                  username: 'manager',
                  telegram_id: '11111111',
                  telegram_username: 'manager'
                }
              }
            });

            if (!signUpError && signUpData?.user) {
              const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
                email: adminEmail,
                password: adminPassword
              });
              if (!retryError && retryData?.session) {
                session = retryData.session;
              }
            }
          }
        }

        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            let activeProfile = profile;
            if (profile.role !== 'admin') {
              const { data: updatedProfile, error: updateError } = await supabase
                .from('profiles')
                .update({ role: 'admin' })
                .eq('id', session.user.id)
                .select()
                .single();
              
              if (!updateError && updatedProfile) {
                activeProfile = updatedProfile;
              } else {
                activeProfile = { ...profile, role: 'admin' };
              }
            }
            setUser(profileToUser(activeProfile as ProfileRow));
          }
          setIsAuthenticated(true);
          localStorage.setItem('volk_session', 'true');
        } else {
          // Check localStorage session (for manager panel / telegram users)
          const hasLocalSession = localStorage.getItem('volk_session') === 'true';
          if (hasLocalSession) {
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
          }
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
          let activeProfile = profile;
          if (profile.role !== 'admin') {
            const { data: updatedProfile, error: updateError } = await supabase
              .from('profiles')
              .update({ role: 'admin' })
              .eq('id', session.user.id)
              .select()
              .single();
            
            if (!updateError && updatedProfile) {
              activeProfile = updatedProfile;
            } else {
              activeProfile = { ...profile, role: 'admin' };
            }
          }
          setUser(profileToUser(activeProfile as ProfileRow));
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

      if (tourneysData) {
        if (tourneysData.length > 0) {
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
            rules: t.rules || [],
            imageUrl: t.image_url || '',
            streamUrl: t.stream_url || ''
          })));
        } else {
          setTournaments([]);
        }
      }

      // Load teams
      const { data: teamsData } = await supabase.from('teams').select('*');
      if (teamsData) {
        if (teamsData.length > 0) {
          const grouped: Record<string, Team[]> = {};
          teamsData.forEach(t => {
            const team = dbTeamToApp(t as TeamRow);
            if (!grouped[t.tournament_id]) grouped[t.tournament_id] = [];
            grouped[t.tournament_id].push(team);
          });
          setTeams(grouped);
        } else {
          setTeams({});
        }
      }

      // Load matches (with team data)
      const { data: matchesData } = await supabase.from('matches').select('*');
      if (matchesData) {
        if (matchesData.length > 0) {
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
        } else {
          setMatches([]);
        }
      }

      // Load predictions for current user
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession?.user?.id) {
        const { data: predictionsData } = await supabase
          .from('predictions')
          .select('*')
          .eq('user_id', currentSession.user.id)
          .order('created_at', { ascending: false });

        if (predictionsData) {
          setPredictions(predictionsData.map(dbPredictionToApp));
        }
      }
    } catch (err) {
      console.error('[VOLKI] Data load error:', err);
    }
  }, [useSupabase]);

  // ─── 5-Second Background Sync Polling ───
  useEffect(() => {
    if (!useSupabase) return;

    const interval = setInterval(async () => {
      // 1. Refresh tournaments, matches, teams quietly in background
      await loadSupabaseData();

      // 2. Refresh current user's profile (balance, XP, level, wins, losses)
      if (isAuthenticated && user.id && user.id !== 'local_user') {
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profile && !error) {
            setUser(profileToUser(profile as ProfileRow));
          }
        } catch (e) {
          console.warn('[VOLKI] Quiet background profile sync failed:', e);
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [useSupabase, isAuthenticated, user.id, loadSupabaseData]);

  // ─── Supabase Realtime: subscribe to match updates ───

  useEffect(() => {
    if (!useSupabase) return;

    const channelName = `volk-realtime-${user.id}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'matches'
      }, (payload) => {
        const { eventType, new: newRow, old: oldRow } = payload;
        
        if (eventType === 'UPDATE' && newRow) {
          setMatches(prev => prev.map(m => {
            if (m.id === newRow.id) {
              const tourneyTeams = teamsRef.current[newRow.tournament_id] || [];
              let teamA = m.teamA;
              let teamB = m.teamB;

              // Hydrate teams dynamically if team_a_id/team_b_id changed or was set (fixes Blank Finals bug)
              if (newRow.team_a_id !== (m.teamA?.id || null)) {
                teamA = tourneyTeams.find(t => t.id === newRow.team_a_id) || null;
                if (!teamA && newRow.team_a_id) {
                  for (const key of Object.keys(teamsRef.current)) {
                    const found = teamsRef.current[key].find(t => t.id === newRow.team_a_id);
                    if (found) { teamA = found; break; }
                  }
                }
              }
              if (newRow.team_b_id !== (m.teamB?.id || null)) {
                teamB = tourneyTeams.find(t => t.id === newRow.team_b_id) || null;
                if (!teamB && newRow.team_b_id) {
                  for (const key of Object.keys(teamsRef.current)) {
                    const found = teamsRef.current[key].find(t => t.id === newRow.team_b_id);
                    if (found) { teamB = found; break; }
                  }
                }
              }

              return {
                ...m,
                teamA,
                teamB,
                scoreA: newRow.score_a,
                scoreB: newRow.score_b,
                status: newRow.status as 'scheduled' | 'live' | 'finished',
                winnerId: newRow.winner_id,
                oddsA: Number(newRow.odds_a),
                oddsB: Number(newRow.odds_b),
                map: newRow.map,
                time: newRow.time || '',
                currentMap: newRow.current_map,
                mapScores: (newRow.map_scores || []) as { scoreA: number; scoreB: number }[],
                liveLogs: newRow.live_logs || []
              };
            }
            return m;
          }));
        } else if (eventType === 'INSERT' && newRow) {
          const tourneyTeams = teamsRef.current[newRow.tournament_id] || [];
          let teamA = tourneyTeams.find(t => t.id === newRow.team_a_id) || null;
          let teamB = tourneyTeams.find(t => t.id === newRow.team_b_id) || null;

          if (!teamA && newRow.team_a_id) {
            for (const key of Object.keys(teamsRef.current)) {
              const found = teamsRef.current[key].find(t => t.id === newRow.team_a_id);
              if (found) { teamA = found; break; }
            }
          }
          if (!teamB && newRow.team_b_id) {
            for (const key of Object.keys(teamsRef.current)) {
              const found = teamsRef.current[key].find(t => t.id === newRow.team_b_id);
              if (found) { teamB = found; break; }
            }
          }

          const mappedMatch: Match = {
            id: newRow.id,
            tournamentId: newRow.tournament_id,
            tournamentName: newRow.tournament_name,
            roundName: newRow.round_name,
            teamA,
            teamB,
            scoreA: newRow.score_a,
            scoreB: newRow.score_b,
            status: newRow.status as 'scheduled' | 'live' | 'finished',
            winnerId: newRow.winner_id,
            oddsA: Number(newRow.odds_a),
            oddsB: Number(newRow.odds_b),
            map: newRow.map,
            time: newRow.time || '',
            currentMap: newRow.current_map,
            mapScores: (newRow.map_scores || []) as { scoreA: number; scoreB: number }[],
            liveLogs: newRow.live_logs || []
          };

          setMatches(prev => {
            if (prev.some(m => m.id === mappedMatch.id)) return prev;
            return [...prev, mappedMatch];
          });
        } else if (eventType === 'DELETE' && oldRow) {
          setMatches(prev => prev.filter(m => m.id !== oldRow.id));
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tournaments'
      }, (payload) => {
        const { eventType, new: newRow, old: oldRow } = payload;

        if (eventType === 'INSERT' && newRow) {
          const mapped: Tournament = {
            id: newRow.id,
            name: newRow.name,
            type: newRow.type as '2X2' | '4X4' | 'BCI',
            date: newRow.date,
            prizePool: newRow.prize_pool,
            prizePlaces: {
              first: newRow.prize_first || '',
              second: newRow.prize_second || '',
              third: newRow.prize_third || ''
            },
            participantsCount: newRow.participants_count,
            maxParticipants: newRow.max_participants,
            status: newRow.status as 'upcoming' | 'active' | 'completed',
            map: newRow.map,
            system: newRow.system,
            rules: newRow.rules || [],
            imageUrl: newRow.image_url || '',
            streamUrl: newRow.stream_url || ''
          };
          setTournaments(prev => {
            if (prev.some(t => t.id === mapped.id)) return prev;
            return [mapped, ...prev];
          });
        } else if (eventType === 'UPDATE' && newRow) {
          setTournaments(prev => prev.map(t => {
            if (t.id === newRow.id) {
              return {
                ...t,
                name: newRow.name,
                type: newRow.type as '2X2' | '4X4' | 'BCI',
                date: newRow.date,
                prizePool: newRow.prize_pool,
                prizePlaces: {
                  first: newRow.prize_first || '',
                  second: newRow.prize_second || '',
                  third: newRow.prize_third || ''
                },
                participantsCount: newRow.participants_count,
                maxParticipants: newRow.max_participants,
                status: newRow.status as 'upcoming' | 'active' | 'completed',
                map: newRow.map,
                system: newRow.system,
                rules: newRow.rules || [],
                imageUrl: newRow.image_url || '',
                streamUrl: newRow.stream_url || ''
              };
            }
            return t;
          }));
        } else if (eventType === 'DELETE' && oldRow) {
          setTournaments(prev => prev.filter(t => t.id !== oldRow.id));
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'teams'
      }, (payload) => {
        const { eventType, new: newRow, old: oldRow } = payload;

        if (eventType === 'INSERT' && newRow) {
          const mappedTeam: Team = {
            id: newRow.id,
            name: newRow.name,
            tag: newRow.tag,
            captain: newRow.captain,
            players: (newRow.players || []) as Player[],
            logoText: newRow.logo_text || newRow.tag.substring(0, 2).toUpperCase(),
            logoBg: newRow.logo_bg || '#1E293B'
          };
          setTeams(prev => {
            const tourneyId = newRow.tournament_id;
            const copy = { ...prev };
            if (!copy[tourneyId]) copy[tourneyId] = [];
            if (copy[tourneyId].some(t => t.id === mappedTeam.id)) return prev;
            copy[tourneyId] = [...copy[tourneyId], mappedTeam];
            return copy;
          });
        } else if (eventType === 'UPDATE' && newRow) {
          setTeams(prev => {
            const tourneyId = newRow.tournament_id;
            const copy = { ...prev };
            if (copy[tourneyId]) {
              copy[tourneyId] = copy[tourneyId].map(t => {
                if (t.id === newRow.id) {
                  return {
                    ...t,
                    name: newRow.name,
                    tag: newRow.tag,
                    captain: newRow.captain,
                    players: (newRow.players || []) as Player[],
                    logoText: newRow.logo_text || newRow.tag.substring(0, 2).toUpperCase(),
                    logoBg: newRow.logo_bg || '#1E293B'
                  };
                }
                return t;
              });
            }
            return copy;
          });
        } else if (eventType === 'DELETE' && oldRow) {
          setTeams(prev => {
            const copy = { ...prev };
            Object.keys(copy).forEach(k => {
              copy[k] = copy[k].filter(t => t.id !== oldRow.id);
            });
            return copy;
          });
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.id}`
      }, (payload) => {
        const { new: newRow } = payload;
        if (newRow) {
          setUser(profileToUser(newRow as ProfileRow));
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'predictions',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const { eventType, new: newRow, old: oldRow } = payload;
        if (eventType === 'INSERT' && newRow) {
          const mapped = dbPredictionToApp(newRow);
          setPredictions(prev => prev.some(p => p.id === mapped.id) ? prev : [mapped, ...prev]);
        } else if (eventType === 'UPDATE' && newRow) {
          const mapped = dbPredictionToApp(newRow);
          setPredictions(prev => prev.map(p => p.id === mapped.id ? mapped : p));
        } else if (eventType === 'DELETE' && oldRow) {
          setPredictions(prev => prev.filter(p => p.id !== oldRow.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [useSupabase, user.id, loadSupabaseData]);

  // ─── localStorage sync (offline mode) ───

  useEffect(() => { localStorage.setItem('volk_user', JSON.stringify(user)); }, [user]);
  useEffect(() => { localStorage.setItem('volk_tournaments', JSON.stringify(tournaments)); }, [tournaments]);
  useEffect(() => { localStorage.setItem('volk_teams', JSON.stringify(teams)); }, [teams]);
  useEffect(() => { localStorage.setItem('volk_matches', JSON.stringify(matches)); }, [matches]);
  useEffect(() => { localStorage.setItem('volk_predictions', JSON.stringify(predictions)); }, [predictions]);

  // ─── LIVE scores simulator ───
  // DISABLED: User requested to only change scores manually.
  /*
  useEffect(() => {
    const isManagerSite = typeof window !== 'undefined' && (
      window.location.pathname.startsWith('/admin') ||
      window.location.search.includes('manager=true') ||
      window.location.search.includes('admin=true')
    );

    // If using Supabase, only run simulation if the manager is active on the admin panel
    if (useSupabase && (!isManagerSite || user.role !== 'admin')) return;

    const interval = setInterval(() => {
      if (useSupabase) {
        // Supabase mode: simulate and write directly to Supabase
        const liveMatches = matches.filter(m => m.status === 'live');
        if (liveMatches.length === 0) return;

        liveMatches.forEach(match => {
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

          const isFinishedA = newScoreA >= 16 && newScoreA - newScoreB >= 2;
          const isFinishedB = newScoreB >= 16 && newScoreB - newScoreA >= 2;

          if (isFinishedA || isFinishedB) {
            const winnerId = isFinishedA ? (match.teamA?.id || '') : (match.teamB?.id || '');
            const winnerName = isFinishedA ? (match.teamA?.name || '') : (match.teamB?.name || '');
            const finalLogs = [...newLogs, `${winnerName} wins ${newScoreA}:${newScoreB}!`];

            supabase.from('matches').update({
              score_a: newScoreA,
              score_b: newScoreB,
              status: 'finished',
              winner_id: winnerId,
              live_logs: finalLogs
            }).eq('id', match.id).then(({ error }) => {
              if (!error) {
                resolveBetsForMatch(match.id, winnerId, newScoreA, newScoreB);
              }
            });
          } else {
            supabase.from('matches').update({
              score_a: newScoreA,
              score_b: newScoreB,
              live_logs: newLogs
            }).eq('id', match.id).then();
          }
        });
      } else {
        // Offline / localStorage mode: simulate and save to state
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
      }
    }, 9000);

    return () => clearInterval(interval);
  }, [matches, useSupabase, user.role]);
  */

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
              let activeProfile = profile;
              // Update role and Telegram metadata in one shot
              const needsUpdate =
                profile.role !== 'admin' ||
                !profile.telegram_id ||
                String(profile.telegram_id) !== String(telegramData.id) ||
                profile.telegram_username !== telegramData.username;

              if (needsUpdate) {
                const { data: updatedProfile, error: updateError } = await supabase
                  .from('profiles')
                  .update({
                    role: 'admin',
                    telegram_id: telegramData.id,
                    telegram_username: telegramData.username
                  })
                  .eq('id', session.user.id)
                  .select()
                  .single();

                if (!updateError && updatedProfile) {
                  activeProfile = updatedProfile;
                } else {
                  activeProfile = {
                    ...profile,
                    role: 'admin',
                    telegram_id: telegramData.id,
                    telegram_username: telegramData.username
                  };
                }
              }
              setUser(profileToUser(activeProfile as ProfileRow));

              // Fetch this user's predictions from Supabase
              const { data: predictionsData } = await supabase
                .from('predictions')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });

              if (predictionsData) {
                setPredictions(predictionsData.map(dbPredictionToApp));
              }
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
    setPredictions([]);
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

  const generateBracketForTournament = async (tournamentId: string) => {
    const list = teams[tournamentId] || [];
    if (list.length < 2) {
      showToast('Потрібно мінімум 2 команди!', 'error');
      return;
    }

    const tourney = tournaments.find(t => t.id === tournamentId);
    const tournamentName = tourney?.name || 'Tournament';
    const shuffled = [...list].sort(() => Math.random() - 0.5);

    // Build match definitions (no id yet — will get from Supabase or generate)
    type MatchDef = {
      roundName: 'Semifinal' | 'Final' | '1/8' | 'Quarterfinal';
      teamA: (typeof list)[0] | null;
      teamB: (typeof list)[0] | null;
      oddsA: number;
      oddsB: number;
      time: string;
      isFinal?: boolean;
    };

    const matchDefs: MatchDef[] = [];

    if (shuffled.length >= 8) {
      matchDefs.push({ roundName: 'Semifinal', teamA: shuffled[0], teamB: shuffled[1], oddsA: parseFloat((1.3 + Math.random() * 0.9).toFixed(2)), oddsB: parseFloat((1.3 + Math.random() * 0.9).toFixed(2)), time: '18:00' });
      matchDefs.push({ roundName: 'Semifinal', teamA: shuffled[2], teamB: shuffled[3], oddsA: parseFloat((1.3 + Math.random() * 0.9).toFixed(2)), oddsB: parseFloat((1.3 + Math.random() * 0.9).toFixed(2)), time: '18:45' });
      matchDefs.push({ roundName: 'Final', teamA: null, teamB: null, oddsA: 1.85, oddsB: 1.85, time: '20:00', isFinal: true });
    } else {
      matchDefs.push({ roundName: 'Final', teamA: shuffled[0], teamB: shuffled[1], oddsA: 1.85, oddsB: 1.85, time: '18:00' });
    }

    if (useSupabase) {
      // 1. Delete existing matches for this tournament
      await supabase.from('matches').delete().eq('tournament_id', tournamentId);

      // 2. Perform a bulk insert of all matches
      const matchesToInsert = matchDefs.map(def => ({
        tournament_id: tournamentId,
        tournament_name: tournamentName,
        round_name: def.roundName,
        team_a_id: def.teamA?.id || null,
        team_b_id: def.teamB?.id || null,
        score_a: 0,
        score_b: 0,
        status: 'scheduled',
        odds_a: def.oddsA,
        odds_b: def.oddsB,
        map: tourney?.map || 'de_dust2',
        time: def.time,
        current_map: 1,
        map_scores: [],
        live_logs: []
      }));

      const { data: insertedRows, error } = await supabase
        .from('matches')
        .insert(matchesToInsert)
        .select();

      if (error) {
        console.error('[VOLKI] Failed to insert matches to Supabase:', error);
        // Fall back to local UUID generation
        const fallbackMatches = matchDefs.map(def => ({
          id: generateUUID(),
          tournamentId, tournamentName,
          roundName: def.roundName,
          teamA: def.teamA || null,
          teamB: def.teamB || null,
          scoreA: 0, scoreB: 0,
          status: 'scheduled' as const, winnerId: null,
          oddsA: def.oddsA, oddsB: def.oddsB,
          map: tourney?.map || 'de_dust2',
          time: def.time, currentMap: 1, mapScores: [], liveLogs: []
        }));
        setMatches(prev => {
          const filtered = prev.filter(m => m.tournamentId !== tournamentId);
          return [...filtered, ...fallbackMatches];
        });
      } else if (insertedRows) {
        const mapped = insertedRows.map((row: any) => {
          // Find matching definition to get the full team objects
          const def = matchDefs.find(d => 
            d.roundName === row.round_name && 
            (d.teamA?.id || null) === row.team_a_id && 
            (d.teamB?.id || null) === row.team_b_id
          ) || matchDefs[0];

          return {
            id: row.id,
            tournamentId,
            tournamentName,
            roundName: row.round_name,
            teamA: def?.teamA || null,
            teamB: def?.teamB || null,
            scoreA: row.score_a,
            scoreB: row.score_b,
            status: row.status as 'scheduled' | 'live' | 'finished',
            winnerId: row.winner_id,
            oddsA: Number(row.odds_a),
            oddsB: Number(row.odds_b),
            map: row.map,
            time: row.time || '',
            currentMap: row.current_map,
            mapScores: (row.map_scores || []) as { scoreA: number; scoreB: number }[],
            liveLogs: row.live_logs || []
          };
        });

        setMatches(prev => {
          const filtered = prev.filter(m => m.tournamentId !== tournamentId);
          return [...filtered, ...mapped];
        });
      }
    } else {
      // Offline mode — generate local UUIDs
      const newMatches: Match[] = matchDefs.map(def => ({
        id: generateUUID(),
        tournamentId, tournamentName,
        roundName: def.roundName,
        teamA: def.teamA || null,
        teamB: def.teamB || null,
        scoreA: 0, scoreB: 0,
        status: 'scheduled' as const, winnerId: null,
        oddsA: def.oddsA, oddsB: def.oddsB,
        map: tourney?.map || 'de_dust2',
        time: def.time, currentMap: 1, mapScores: [], liveLogs: []
      }));

      setMatches(prev => {
        const filtered = prev.filter(m => m.tournamentId !== tournamentId);
        return [...filtered, ...newMatches];
      });
    }

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
      const isTournamentBet = predictionData.predictionType === 'tournament_winner';
      
      const insertData: any = {
        user_id: user.id,
        match_id: isTournamentBet ? null : predictionData.matchId,
        tournament_name: predictionData.tournamentName,
        team_a: predictionData.teamA,
        team_b: predictionData.teamB,
        prediction_type: predictionData.predictionType,
        predicted_value: predictionData.predictedValue,
        odds: predictionData.odds,
        wager: predictionData.wager
      };

      if (isTournamentBet && predictionData.tournamentId) {
        insertData.tournament_id = predictionData.tournamentId;
      }

      const attemptInsert = (payload: any) => {
        supabase.from('predictions').insert(payload).then(({ error }) => {
          if (error) {
            console.warn('[VOLKI] Failed to save prediction to Supabase. Falling back to state/localStorage:', error);
            
            // If the failure is due to missing tournament_id column in database
            const errorMsg = error.message || '';
            const isMissingTournamentIdCol = error.code === 'PGRST204' || errorMsg.includes('tournament_id');
            if (isMissingTournamentIdCol && 'tournament_id' in payload) {
              console.log('[VOLKI] Retrying prediction insert without tournament_id...');
              const cleaned = { ...payload };
              delete cleaned.tournament_id;
              attemptInsert(cleaned);
            }
          } else {
            console.log('[VOLKI] Prediction saved to Supabase successfully!');
          }
        });
      };

      attemptInsert(insertData);

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
    showToast('Ставку на монетки прийнято! 🍀', 'success');
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

  const updateMatchOdds = (matchId: string, oddsA: number, oddsB: number) => {
    setMatches(prev => prev.map(m => {
      if (m.id === matchId) {
        if (useSupabase) {
          supabase.from('matches').update({
            odds_a: oddsA,
            odds_b: oddsB
          }).eq('id', matchId).then();
        }
        return { ...m, oddsA, oddsB };
      }
      return m;
    }));
    showToast('Коефіцієнти матчу оновлено!', 'success');
  };

  // ─── Resolve Bets ───

  const resolveBetsForMatch = (matchId: string, winnerId: string, finalScoreA: number, finalScoreB: number) => {
    const targetMatch = matches.find(m => m.id === matchId);
    if (!targetMatch) return;

    const winningTeamName = targetMatch.teamA?.id === winnerId ? targetMatch.teamA?.name : targetMatch.teamB?.name;
    const totalRounds = finalScoreA + finalScoreB;

    let totalPayout = 0;
    let wonBetsCount = 0;

    const isFinalMatch = targetMatch.roundName === 'Final';

    // Offline / Local state update first
    setPredictions(prev => prev.map(pred => {
      // 1. Resolve match bets
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

      // 2. Resolve tournament outright bets (when Final match finishes)
      if (isFinalMatch && 
          pred.predictionType === 'tournament_winner' && 
          pred.status === 'pending' &&
          (pred.tournamentName === targetMatch.tournamentName || pred.tournamentId === targetMatch.tournamentId)) {
        
        const won = pred.predictedValue === winningTeamName;
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

    if (!useSupabase) {
      if (totalPayout > 0) {
        setUser(prev => ({
          ...prev,
          balance: prev.balance + totalPayout,
          xp: prev.xp + 150 > prev.xpNext ? (prev.xp + 150) - prev.xpNext : prev.xp + 150,
          level: prev.xp + 150 > prev.xpNext ? prev.level + 1 : prev.level,
          stats: { 
            ...prev.stats, 
            predictionsWon: prev.stats.predictionsWon + wonBetsCount,
            wins: prev.stats.wins + wonBetsCount
          }
        }));
        setTimeout(() => showToast(`Виграш! +${totalPayout} 🪙!`, 'success'), 1000);
      } else {
        setUser(prev => ({ ...prev, stats: { ...prev.stats, losses: prev.stats.losses + 1 } }));
      }
    }

    // Supabase DB update
    if (useSupabase) {
      // 1. Resolve match bets
      supabase.from('predictions')
        .select('*')
        .eq('match_id', matchId)
        .eq('status', 'pending')
        .then(({ data: preds, error }) => {
          if (error || !preds) return;

          preds.forEach(async (pred) => {
            let won = false;
            if (pred.prediction_type === 'winner') {
              won = pred.predicted_value === winningTeamName;
            } else if (pred.prediction_type === 'total_rounds') {
              if (pred.predicted_value === 'over' && totalRounds > 26.5) won = true;
              if (pred.predicted_value === 'under' && totalRounds < 26.5) won = true;
            }

            const status = won ? 'won' : 'lost';
            const payout = won ? Math.round(pred.wager * pred.odds) : 0;

            // Update prediction status
            await supabase.from('predictions').update({ status, payout }).eq('id', pred.id);

            // Update user profile statistics and coins
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', pred.user_id).single();
            if (profile) {
              const newBalance = profile.balance + payout;
              const newWins = won ? profile.wins + 1 : profile.wins;
              const newLosses = won ? profile.losses : profile.losses + 1;
              const newPredsWon = won ? profile.predictions_won + 1 : profile.predictions_won;
              const xpGain = won ? 150 : 50;
              let newXp = profile.xp + xpGain;
              let newLevel = profile.level;
              let newXpNext = profile.xp_next;

              if (newXp >= newXpNext) {
                newXp = newXp - newXpNext;
                newLevel += 1;
                newXpNext = Math.round(newXpNext * 1.5);
              }

              await supabase.from('profiles').update({
                balance: newBalance,
                wins: newWins,
                losses: newLosses,
                predictions_won: newPredsWon,
                xp: newXp,
                level: newLevel,
                xp_next: newXpNext
              }).eq('id', pred.user_id);

              // Update state if it's the current user
              if (pred.user_id === user.id) {
                setUser(prev => ({
                  ...prev,
                  balance: newBalance,
                  xp: newXp,
                  level: newLevel,
                  xpNext: newXpNext,
                  stats: {
                    ...prev.stats,
                    wins: newWins,
                    losses: newLosses,
                    predictionsWon: newPredsWon
                  }
                }));
                if (won) {
                  showToast(`Виграш! +${payout} 🪙!`, 'success');
                }
              }
            }
          });
        });

      // 2. Resolve tournament outright bets (if Final match)
      if (isFinalMatch) {
        supabase.from('predictions')
          .select('*')
          .eq('prediction_type', 'tournament_winner')
          .eq('status', 'pending')
          .eq('tournament_name', targetMatch.tournamentName)
          .then(({ data: tourneyPreds, error: tourneyError }) => {
            if (tourneyError || !tourneyPreds) return;

            tourneyPreds.forEach(async (pred) => {
              const won = pred.predicted_value === winningTeamName;
              const status = won ? 'won' : 'lost';
              const payout = won ? Math.round(pred.wager * pred.odds) : 0;

              // Update prediction status
              await supabase.from('predictions').update({ status, payout }).eq('id', pred.id);

              // Update user profile statistics and coins
              const { data: profile } = await supabase.from('profiles').select('*').eq('id', pred.user_id).single();
              if (profile) {
                const newBalance = profile.balance + payout;
                const newWins = won ? profile.wins + 1 : profile.wins;
                const newLosses = won ? profile.losses : profile.losses + 1;
                const newPredsWon = won ? profile.predictions_won + 1 : profile.predictions_won;
                const xpGain = won ? 150 : 50;
                let newXp = profile.xp + xpGain;
                let newLevel = profile.level;
                let newXpNext = profile.xp_next;

                if (newXp >= newXpNext) {
                  newXp = newXp - newXpNext;
                  newLevel += 1;
                  newXpNext = Math.round(newXpNext * 1.5);
                }

                await supabase.from('profiles').update({
                  balance: newBalance,
                  wins: newWins,
                  losses: newLosses,
                  predictions_won: newPredsWon,
                  xp: newXp,
                  level: newLevel,
                  xp_next: newXpNext
                }).eq('id', pred.user_id);

                // Update state if it's the current user
                if (pred.user_id === user.id) {
                  setUser(prev => ({
                    ...prev,
                    balance: newBalance,
                    xp: newXp,
                    level: newLevel,
                    xpNext: newXpNext,
                    stats: {
                      ...prev.stats,
                      wins: newWins,
                      losses: newLosses,
                      predictionsWon: newPredsWon
                    }
                  }));
                  if (won) {
                    showToast(`Виграш! +${payout} 🪙!`, 'success');
                  }
                }
              }
            });
          });
      }
    }

    // Auto-advance bracket or complete tournament
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
    } else if (targetMatch.roundName === 'Final') {
      // 1. Mark tournament as completed
      setTournaments(prev => prev.map(t => {
        if (t.id === targetMatch.tournamentId) {
          return { ...t, status: 'completed' };
        }
        return t;
      }));

      if (useSupabase) {
        supabase.from('tournaments')
          .update({ status: 'completed' })
          .eq('id', targetMatch.tournamentId)
          .then();
      }

      // 2. Give tournament completion bonus to all users who participated
      const bonusCoins = 1000;
      if (useSupabase) {
        supabase.from('predictions')
          .select('user_id')
          .eq('tournament_name', targetMatch.tournamentName)
          .then(({ data: participants }) => {
            if (!participants) return;
            const uniqueUserIds = Array.from(new Set(participants.map(p => p.user_id)));

            uniqueUserIds.forEach(async (uId) => {
              const { data: profile } = await supabase.from('profiles').select('*').eq('id', uId).single();
              if (profile) {
                await supabase.from('profiles').update({
                  balance: profile.balance + bonusCoins,
                  wins: profile.wins + 1
                }).eq('id', uId);

                if (uId === user.id) {
                  setUser(prev => ({
                    ...prev,
                    balance: prev.balance + bonusCoins,
                    stats: { ...prev.stats, wins: prev.stats.wins + 1 }
                  }));
                  setTimeout(() => showToast(`Бонус за закриття турніру! +${bonusCoins} 🪙!`, 'success'), 2000);
                }
              }
            });
          });
      } else {
        const hasBets = predictions.some(p => p.tournamentName === targetMatch.tournamentName);
        if (hasBets) {
          setUser(prev => ({
            ...prev,
            balance: prev.balance + bonusCoins,
            stats: { ...prev.stats, wins: prev.stats.wins + 1 }
          }));
          setTimeout(() => showToast(`Бонус за закриття турніру! +${bonusCoins} 🪙!`, 'success'), 2000);
        }
      }
    }
  };

  // ─── Create Tournament ───

  const createTournament = (tourneyData: Omit<Tournament, 'id' | 'participantsCount' | 'status'> & { status?: 'upcoming' | 'active' | 'completed' }) => {
    const newId = generateUUID();
    const newTourney: Tournament = {
      ...tourneyData,
      id: newId,
      participantsCount: 0,
      status: tourneyData.status || 'upcoming'
    };

    const isValidUUID = (str: string) => {
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    };

    if (useSupabase) {
      const insertData: any = {
        id: newId,
        name: newTourney.name,
        type: newTourney.type,
        date: newTourney.date,
        prize_pool: newTourney.prizePool,
        prize_first: newTourney.prizePlaces.first,
        prize_second: newTourney.prizePlaces.second,
        prize_third: newTourney.prizePlaces.third,
        participants_count: 0,
        max_participants: newTourney.maxParticipants,
        status: newTourney.status,
        map: newTourney.map,
        system: newTourney.system,
        rules: newTourney.rules,
        image_url: newTourney.imageUrl || null,
        stream_url: newTourney.streamUrl || null,
        created_by: isValidUUID(user.id) ? user.id : null
      };

      const attemptInsert = (data: any) => {
        supabase.from('tournaments').insert(data).then(({ error }) => {
          if (error) {
            console.error('[VOLKI] Error inserting tournament to Supabase:', error);
            
            // Case 1: Foreign key constraint violation on created_by (code 23503)
            if (error.code === '23503' && data.created_by) {
              console.log('[VOLKI] Stale user session / foreign key violation detected. Retrying insert with created_by: null...');
              attemptInsert({
                ...data,
                created_by: null
              });
              return;
            }
            
            // Case 2: Missing image_url or stream_url column in the schema cache (code PGRST204)
            const errorMsg = error.message || '';
            const isMissingColumnError = error.code === 'PGRST204' || 
                                         errorMsg.includes('image_url') || 
                                         errorMsg.includes('stream_url');
            
            if (isMissingColumnError && ('image_url' in data || 'stream_url' in data)) {
              console.log('[VOLKI] Missing image_url or stream_url column in DB. Retrying insert without them...');
              const cleanedData = { ...data };
              delete cleanedData.image_url;
              delete cleanedData.stream_url;
              attemptInsert(cleanedData);
              return;
            }
            
            showToast('❌ Помилка збереження турніру в базі даних!', 'error');
          } else {
            console.log('[VOLKI] Tournament successfully saved to Supabase!');
          }
        });
      };

      attemptInsert(insertData);
    }

    setTournaments(prev => [newTourney, ...prev]);
    setTeams(prev => ({ ...prev, [newId]: [] }));
    showToast(`Турнір "${tourneyData.name}" створено!`, 'success');
  };

  // ─── Reset ───

  // ─── Update Profile (avatar + username) ───

  const updateProfile = (data: { username?: string; avatarGradient?: number; avatarUrl?: string | null }) => {
    setUser(prev => ({
      ...prev,
      ...(data.username !== undefined ? { username: data.username } : {}),
      ...(data.avatarGradient !== undefined ? { avatarGradient: data.avatarGradient } : {}),
      ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {})
    }));
    if (data.username) {
      showToast('Нікнейм змінено!', 'success');
      if (useSupabase) {
        supabase.from('profiles').update({ username: data.username }).eq('id', user.id).then();
      }
    }
    if (data.avatarGradient !== undefined) {
      showToast('Аватар оновлено!', 'success');
    }
    if (data.avatarUrl !== undefined) {
      showToast('Аватар оновлено!', 'success');
      if (useSupabase) {
        supabase.from('profiles').update({ avatar_url: data.avatarUrl }).eq('id', user.id).then();
      }
    }
  };

  // ─── Tournament Management ───

  const deleteTournament = (tournamentId: string) => {
    const tourneyObj = tournaments.find(t => t.id === tournamentId);
    const matchIds = matches.filter(m => m.tournamentId === tournamentId).map(m => m.id);

    if (useSupabase) {
      if (matchIds.length > 0) {
        supabase.from('predictions').delete().in('match_id', matchIds).then();
      }
      if (tourneyObj) {
        supabase.from('predictions').delete().eq('tournament_name', tourneyObj.name).then();
      }
      supabase.from('matches').delete().eq('tournament_id', tournamentId).then();
      supabase.from('teams').delete().eq('tournament_id', tournamentId).then();
      supabase.from('tournaments').delete().eq('id', tournamentId).then(({ error }) => {
        if (error) {
          console.error('[VOLKI] Error deleting tournament in Supabase:', error);
        }
      });
    }

    setTournaments(prev => prev.filter(t => t.id !== tournamentId));
    setTeams(prev => {
      const copy = { ...prev };
      delete copy[tournamentId];
      return copy;
    });
    setMatches(prev => prev.filter(m => m.tournamentId !== tournamentId));
    
    // Clean up local predictions state as well
    setPredictions(prev => prev.filter(pred => {
      const isRelatedToMatch = matchIds.includes(pred.matchId || '');
      const isRelatedToTourneyName = pred.tournamentName === tourneyObj?.name;
      return !isRelatedToMatch && !isRelatedToTourneyName;
    }));

    showToast('Турнір видалено', 'info');
  };

  const updateTournament = (tournamentId: string, data: Partial<Tournament>) => {
    if (useSupabase) {
      const dbUpdate: any = {};
      if (data.name !== undefined) dbUpdate.name = data.name;
      if (data.type !== undefined) dbUpdate.type = data.type;
      if (data.date !== undefined) dbUpdate.date = data.date;
      if (data.prizePool !== undefined) dbUpdate.prize_pool = data.prizePool;
      if (data.prizePlaces !== undefined) {
        if (data.prizePlaces.first !== undefined) dbUpdate.prize_first = data.prizePlaces.first;
        if (data.prizePlaces.second !== undefined) dbUpdate.prize_second = data.prizePlaces.second;
        if (data.prizePlaces.third !== undefined) dbUpdate.prize_third = data.prizePlaces.third;
      }
      if (data.maxParticipants !== undefined) dbUpdate.max_participants = data.maxParticipants;
      if (data.status !== undefined) dbUpdate.status = data.status;
      if (data.map !== undefined) dbUpdate.map = data.map;
      if (data.system !== undefined) dbUpdate.system = data.system;
      if (data.rules !== undefined) dbUpdate.rules = data.rules;
      if (data.imageUrl !== undefined) dbUpdate.image_url = data.imageUrl;
      if (data.streamUrl !== undefined) dbUpdate.stream_url = data.streamUrl;

      const attemptUpdate = (updatePayload: any) => {
        supabase.from('tournaments').update(updatePayload).eq('id', tournamentId).then(({ error }) => {
          if (error) {
            console.error('[VOLKI] Error updating tournament in Supabase:', error);
            
            const errorMsg = error.message || '';
            const isMissingColumnError = error.code === 'PGRST204' || 
                                         errorMsg.includes('image_url') || 
                                         errorMsg.includes('stream_url');
            
            if (isMissingColumnError && ('image_url' in updatePayload || 'stream_url' in updatePayload)) {
              console.log('[VOLKI] Missing image_url or stream_url column in DB. Retrying update without them...');
              const cleanedUpdate = { ...updatePayload };
              delete cleanedUpdate.image_url;
              delete cleanedUpdate.stream_url;
              attemptUpdate(cleanedUpdate);
            }
          }
        });
      };

      attemptUpdate(dbUpdate);
    }

    setTournaments(prev => prev.map(t => 
      t.id === tournamentId ? { ...t, ...data } : t
    ));
    showToast('Турнір оновлено', 'success');
  };

  const fillTournamentWithBots = async (tournamentId: string) => {
    const tourney = tournaments.find(t => t.id === tournamentId);
    if (!tourney) return;
    const currentTeams = teams[tournamentId] || [];
    const countNeeded = tourney.maxParticipants - currentTeams.length;
    if (countNeeded <= 0) return;

    const botTeamNames = [
      'NaVi', 'FaZe Clan', 'G2 Esports', 'Virtus.pro', 
      'Team Vitality', 'Team Spirit', 'MOUZ', 'Astralis',
      'Heroic', 'Team Liquid', 'Cloud9', 'FURIA Esports',
      'Complexity', 'Fnatic', 'NIP', 'BIG Clan',
      'AMKAL Esports', 'Eternal Fire', 'MIBR', 'KOI',
      'ENCE', '9INE', '9z Team', 'Lynn Vision'
    ];

    const shuffledNames = [...botTeamNames].sort(() => Math.random() - 0.5);
    const newTeamsList: Team[] = [];

    const teamsToInsert: any[] = [];

    for (let i = 0; i < countNeeded; i++) {
      const name = shuffledNames[i % shuffledNames.length] + ` #${Math.floor(Math.random() * 90 + 10)}`;
      const tag = name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();
      const cap = `@bot_${tag.toLowerCase()}`;
      
      const newTeam: Team = {
        name,
        tag,
        captain: cap,
        players: [
          { username: cap },
          { username: `@bot_${tag.toLowerCase()}_player2` }
        ],
        id: `team_${Date.now()}_${i}`,
        logoText: tag,
        logoBg: ['#FF5C00', '#8B5CF6', '#10B981', '#3B82F6', '#EF4444', '#EC4899'][Math.floor(Math.random() * 6)]
      };
      
      newTeamsList.push(newTeam);

      teamsToInsert.push({
        tournament_id: tournamentId,
        name: newTeam.name,
        tag: newTeam.tag,
        captain: newTeam.captain,
        players: newTeam.players as unknown as { username: string }[],
        logo_text: newTeam.logoText,
        logo_bg: newTeam.logoBg
      });
    }

    if (useSupabase && teamsToInsert.length > 0) {
      const { data: insertedTeams, error } = await supabase
        .from('teams')
        .insert(teamsToInsert)
        .select();

      if (!error && insertedTeams) {
        insertedTeams.forEach((inserted: any, idx: number) => {
          newTeamsList[idx].id = inserted.id;
        });
      }
    }

    const finalCount = currentTeams.length + countNeeded;

    if (useSupabase) {
      await supabase.from('tournaments')
        .update({ participants_count: finalCount })
        .eq('id', tournamentId);
    }

    setTeams(prev => ({ ...prev, [tournamentId]: [...(prev[tournamentId] || []), ...newTeamsList] }));
    setTournaments(prev => prev.map(t => {
      if (t.id === tournamentId) {
        return { ...t, participantsCount: finalCount };
      }
      return t;
    }));

    showToast(`Зареєстровано ${countNeeded} бот-команд для турніру!`, 'success');
  };

  // ─── Reset ───

  const resetAllData = async () => {
    if (useSupabase) {
      try {
        // Delete all predictions, matches, teams, tournaments
        await supabase.from('predictions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('teams').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('tournaments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      } catch (e) {
        console.error('[VOLKI] Failed to clear Supabase database:', e);
      }
    }

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
      updateMatchOdds,
      resetAllData,
      addFunds,
      createTournament,
      resolveBetsForMatch,
      generateBracketForTournament,
      updateProfile,
      deleteTournament,
      updateTournament,
      fillTournamentWithBots
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
