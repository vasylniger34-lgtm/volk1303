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
  avatarGradient: number;
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
  createTournament: (tourney: Omit<Tournament, 'id' | 'participantsCount' | 'status'>) => void;
  resolveBetsForMatch: (matchId: string, winnerId: string, finalScoreA: number, finalScoreB: number) => void;
  generateBracketForTournament: (tournamentId: string) => void;
  updateProfile: (data: { username?: string; avatarGradient?: number }) => void;
  deleteTournament: (tournamentId: string) => void;
  updateTournament: (tournamentId: string, data: Partial<Tournament>) => void;
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
  balance: 12450,
  level: 4,
  xp: 450,
  xpNext: 1000,
  role: 'admin', // Local dev mode = admin by default
  avatarGradient: 0,
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
    avatarGradient: 0,
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
            imageUrl: t.image_url || ''
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
          setPredictions([]);
        }
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
    const newId = generateUUID();
    const newTourney: Tournament = {
      ...tourneyData,
      id: newId,
      participantsCount: 0,
      status: 'upcoming'
    };

    if (useSupabase) {
      supabase.from('tournaments').insert({
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
        status: 'upcoming',
        map: newTourney.map,
        system: newTourney.system,
        rules: newTourney.rules,
        image_url: newTourney.imageUrl || null,
        created_by: user.id
      }).then(({ error }) => {
        if (error) {
          console.error('[VOLKI] Error inserting tournament to Supabase:', error);
        }
      });
    }

    setTournaments(prev => [newTourney, ...prev]);
    setTeams(prev => ({ ...prev, [newId]: [] }));
    showToast(`Турнір "${tourneyData.name}" створено!`, 'success');
  };

  // ─── Reset ───

  // ─── Update Profile (avatar + username) ───

  const updateProfile = (data: { username?: string; avatarGradient?: number }) => {
    setUser(prev => ({
      ...prev,
      ...(data.username !== undefined ? { username: data.username } : {}),
      ...(data.avatarGradient !== undefined ? { avatarGradient: data.avatarGradient } : {})
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
  };

  // ─── Tournament Management ───

  const deleteTournament = (tournamentId: string) => {
    if (useSupabase) {
      const matchIds = matches.filter(m => m.tournamentId === tournamentId).map(m => m.id);
      if (matchIds.length > 0) {
        supabase.from('predictions').delete().in('match_id', matchIds).then();
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

      supabase.from('tournaments').update(dbUpdate).eq('id', tournamentId).then(({ error }) => {
        if (error) {
          console.error('[VOLKI] Error updating tournament in Supabase:', error);
        }
      });
    }

    setTournaments(prev => prev.map(t => 
      t.id === tournamentId ? { ...t, ...data } : t
    ));
    showToast('Турнір оновлено', 'success');
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
      updateTournament
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
