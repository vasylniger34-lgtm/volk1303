import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, Minus, RefreshCw, TrendingUp, Users, Coins, Award, BarChart3, ChevronUp, ChevronDown } from 'lucide-react';

interface UserRow {
  id: string;
  username: string;
  reg_num?: string | number;
  balance: number;
  wins: number;
  losses: number;
  predictions_won: number;
  level: number;
  xp: number;
  user_coins?: { registration_number?: string | number; coins?: number }[];
}

interface Stats {
  totalUsers: number;
  totalCoins: number;
  avgCoins: number;
  richest: number;
  totalBets: number;
  totalWins: number;
}

export const CoinsManagementView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Quick action panel state
  const [quickNick, setQuickNick] = useState('');
  const [quickAmount, setQuickAmount] = useState<string>('');
  const [quickResult, setQuickResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Sort
  const [sortBy, setSortBy] = useState<'username' | 'balance' | 'wins' | 'level'>('balance');
  const [sortAsc, setSortAsc] = useState(false);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('balance, wins, losses, predictions_won');
      if (error || !data) return;

      const totalCoins = data.reduce((s, u) => s + (u.balance || 0), 0);
      const totalBets = data.reduce((s, u) => s + (u.wins || 0) + (u.losses || 0), 0);
      const totalWins = data.reduce((s, u) => s + (u.wins || 0), 0);
      const richest = Math.max(...data.map(u => u.balance || 0));

      setStats({
        totalUsers: data.length,
        totalCoins,
        avgCoins: data.length ? Math.round(totalCoins / data.length) : 0,
        richest,
        totalBets,
        totalWins,
      });
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('id, username, reg_num, balance, wins, losses, predictions_won, level, xp')
        .order(sortBy === 'username' ? 'username' : sortBy === 'balance' ? 'balance' : sortBy === 'wins' ? 'wins' : 'level', { ascending: sortAsc });

      if (searchQuery.trim()) {
        query = query.ilike('username', `%${searchQuery}%`);
      } else {
        query = query.limit(60);
      }

      const { data, error } = await query;
      if (error) throw error;
      setUsers((data || []) as UserRow[]);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, sortBy, sortAsc]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Quick action: find user by nick and add/remove coins
  const handleQuickAction = async (action: 'add' | 'subtract') => {
    const nick = quickNick.trim();
    const num = Number(quickAmount);
    if (!nick || !num || isNaN(num) || num <= 0) {
      setQuickResult({ ok: false, msg: 'Введіть нік і суму' });
      return;
    }
    setActionLoading(true);
    setQuickResult(null);
    try {
      const { data: found, error: findErr } = await supabase
        .from('profiles')
        .select('id, username, balance')
        .ilike('username', nick)
        .limit(1)
        .single();

      if (findErr || !found) {
        setQuickResult({ ok: false, msg: `Гравця "${nick}" не знайдено` });
        return;
      }

      const newBalance = action === 'add'
        ? (found.balance || 0) + num
        : Math.max(0, (found.balance || 0) - num);

      const { error: updErr } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', found.id);

      if (updErr) throw updErr;

      setQuickResult({
        ok: true,
        msg: `${found.username}: ${action === 'add' ? '+' : '-'}${num} 🪙 → баланс ${newBalance}`
      });
      setQuickAmount('');
      fetchUsers();
      fetchStats();
    } catch (err) {
      setQuickResult({ ok: false, msg: 'Помилка оновлення' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetBalance = async () => {
    const nick = quickNick.trim();
    const num = Number(quickAmount);
    if (!nick || isNaN(num) || num < 0) {
      setQuickResult({ ok: false, msg: 'Введіть нік і суму' });
      return;
    }
    setActionLoading(true);
    setQuickResult(null);
    try {
      const { data: found, error: findErr } = await supabase
        .from('profiles')
        .select('id, username')
        .ilike('username', nick)
        .limit(1)
        .single();

      if (findErr || !found) {
        setQuickResult({ ok: false, msg: `Гравця "${nick}" не знайдено` });
        return;
      }

      await supabase.from('profiles').update({ balance: num }).eq('id', found.id);
      setQuickResult({ ok: true, msg: `${found.username}: баланс встановлено = ${num} 🪙` });
      setQuickAmount('');
      fetchUsers();
      fetchStats();
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortAsc(p => !p);
    else { setSortBy(col); setSortAsc(false); }
  };

  const SortIcon = ({ col }: { col: typeof sortBy }) => {
    if (sortBy !== col) return null;
    return sortAsc
      ? <ChevronUp size={11} style={{ display: 'inline', marginLeft: 3 }} />
      : <ChevronDown size={11} style={{ display: 'inline', marginLeft: 3 }} />;
  };

  const statItem = (icon: React.ReactNode, label: string, value: string | number, color = '#FF5C00') => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#8F8F9B', fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>
        {icon} {label}
      </div>
      <span style={{ fontSize: 22, fontWeight: 950, fontFamily: 'Outfit', color }}>{value}</span>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '4px 0' }}>

      {/* ── STATS GRID ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12
      }}>
        <div className="esports-card" style={{ padding: '18px 20px' }}>
          {statItem(<Users size={12} />, 'Гравців', statsLoading ? '…' : (stats?.totalUsers ?? 0))}
        </div>
        <div className="esports-card" style={{ padding: '18px 20px', gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 12 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#8F8F9B', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
              <BarChart3 size={12} /> Економіка монет
            </span>
            <button
              onClick={() => { fetchStats(); fetchUsers(); }}
              style={{ background: 'none', border: 'none', color: '#8F8F9B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}
            >
              <RefreshCw size={11} /> оновити
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {statItem(<Coins size={11} />, 'Усього монет', statsLoading ? '…' : (stats?.totalCoins ?? 0).toLocaleString())}
            {statItem(<TrendingUp size={11} />, 'Середній баланс', statsLoading ? '…' : (stats?.avgCoins ?? 0).toLocaleString(), '#10B981')}
            {statItem(<Award size={11} />, 'Найбагатший', statsLoading ? '…' : (stats?.richest ?? 0).toLocaleString(), '#F59E0B')}
          </div>
        </div>
        <div className="esports-card" style={{ padding: '18px 20px' }}>
          {statItem(<BarChart3 size={12} />, 'Усього ставок', statsLoading ? '…' : (stats?.totalBets ?? 0))}
        </div>
        <div className="esports-card" style={{ padding: '18px 20px' }}>
          {statItem(<Award size={12} />, 'Виграних ставок', statsLoading ? '…' : (stats?.totalWins ?? 0), '#10B981')}
        </div>
        <div className="esports-card" style={{ padding: '18px 20px' }}>
          {statItem(<TrendingUp size={12} />, 'Winrate', statsLoading || !stats ? '…' : stats.totalBets > 0 ? `${Math.round(stats.totalWins / stats.totalBets * 100)}%` : '—', '#3B82F6')}
        </div>
      </div>

      {/* ── QUICK ACTION PANEL ── */}
      <div className="esports-card" style={{ padding: '20px' }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: '#8F8F9B', textTransform: 'uppercase', display: 'block', marginBottom: 14 }}>
          ⚡ Швидке управління монетами
        </span>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Нікнейм гравця..."
            value={quickNick}
            onChange={e => { setQuickNick(e.target.value); setQuickResult(null); }}
            style={{
              flex: '1 1 160px', minWidth: 120, padding: '10px 14px',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, color: 'white', fontSize: 13, outline: 'none', fontFamily: 'Outfit'
            }}
          />
          <input
            type="number"
            placeholder="Кількість монет..."
            value={quickAmount}
            min={0}
            onChange={e => { setQuickAmount(e.target.value); setQuickResult(null); }}
            style={{
              flex: '1 1 130px', minWidth: 100, padding: '10px 14px',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, color: 'white', fontSize: 13, outline: 'none', fontFamily: 'Outfit'
            }}
          />
          <button
            onClick={() => handleQuickAction('add')}
            disabled={actionLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
              background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 10, color: '#10B981', fontWeight: 800, fontSize: 12, cursor: 'pointer'
            }}
          >
            <Plus size={14} /> Нарахувати
          </button>
          <button
            onClick={() => handleQuickAction('subtract')}
            disabled={actionLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 10, color: '#EF4444', fontWeight: 800, fontSize: 12, cursor: 'pointer'
            }}
          >
            <Minus size={14} /> Відняти
          </button>
          <button
            onClick={handleSetBalance}
            disabled={actionLoading}
            style={{
              padding: '10px 16px',
              background: 'rgba(255,92,0,0.12)', border: '1px solid rgba(255,92,0,0.3)',
              borderRadius: 10, color: '#FF5C00', fontWeight: 800, fontSize: 12, cursor: 'pointer'
            }}
          >
            Встановити
          </button>
        </div>
        {quickResult && (
          <div style={{
            marginTop: 10, padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            background: quickResult.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${quickResult.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: quickResult.ok ? '#10B981' : '#EF4444'
          }}>
            {quickResult.ok ? '✅' : '❌'} {quickResult.msg}
          </div>
        )}
      </div>

      {/* ── USER LIST ── */}
      <div className="esports-card" style={{ padding: '20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#8F8F9B', textTransform: 'uppercase' }}>
            👥 Гравці ({users.length})
          </span>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#8F8F9B', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Пошук за ніком..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10, color: 'white', fontSize: 12, outline: 'none', fontFamily: 'Outfit', width: 200
              }}
            />
          </div>
        </div>

        {/* Sort header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 90px 60px 60px 50px',
          gap: 8, padding: '6px 12px',
          fontSize: 10, fontWeight: 800, color: '#51515E', textTransform: 'uppercase',
          borderBottom: '1px solid rgba(255,255,255,0.03)', marginBottom: 6
        }}>
          <button onClick={() => toggleSort('username')} style={{ background: 'none', border: 'none', color: sortBy === 'username' ? '#8F8F9B' : '#51515E', cursor: 'pointer', textAlign: 'left', fontWeight: 800, fontSize: 10, textTransform: 'uppercase', padding: 0 }}>
            Гравець <SortIcon col="username" />
          </button>
          <button onClick={() => toggleSort('balance')} style={{ background: 'none', border: 'none', color: sortBy === 'balance' ? '#FF5C00' : '#51515E', cursor: 'pointer', textAlign: 'right', fontWeight: 800, fontSize: 10, textTransform: 'uppercase', padding: 0 }}>
            Монети <SortIcon col="balance" />
          </button>
          <button onClick={() => toggleSort('wins')} style={{ background: 'none', border: 'none', color: sortBy === 'wins' ? '#10B981' : '#51515E', cursor: 'pointer', textAlign: 'center', fontWeight: 800, fontSize: 10, textTransform: 'uppercase', padding: 0 }}>
            Перем <SortIcon col="wins" />
          </button>
          <button onClick={() => toggleSort('level')} style={{ background: 'none', border: 'none', color: sortBy === 'level' ? '#F59E0B' : '#51515E', cursor: 'pointer', textAlign: 'center', fontWeight: 800, fontSize: 10, textTransform: 'uppercase', padding: 0 }}>
            Рівень <SortIcon col="level" />
          </button>
          <span style={{ textAlign: 'center' }}>Winrate</span>
        </div>

        {/* Rows */}
        {loading ? (
          <div style={{ textAlign: 'center', color: '#51515E', padding: '30px 0', fontSize: 13 }}>Завантаження...</div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#51515E', padding: '30px 0', fontSize: 13 }}>Гравців не знайдено</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {users.map((user, idx) => {
              const totalBets = (user.wins || 0) + (user.losses || 0);
              const winrate = totalBets > 0 ? Math.round((user.wins || 0) / totalBets * 100) : null;
              const regNum = user.reg_num || user.user_coins?.[0]?.registration_number;

              return (
                <div
                  key={user.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 90px 60px 60px 50px',
                    gap: 8,
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,92,0,0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent')}
                  onClick={() => { setQuickNick(user.username); setQuickResult(null); }}
                >
                  {/* Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: `linear-gradient(135deg, #FF5C00, #9333ea)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 900, color: 'white', flexShrink: 0
                    }}>
                      {(user.username || '?').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user.username}
                        {regNum && <span style={{ color: '#51515E', fontSize: 10, marginLeft: 3 }}>#{regNum}</span>}
                      </div>
                      <div style={{ fontSize: 10, color: '#51515E' }}>
                        {totalBets} ставок
                      </div>
                    </div>
                  </div>

                  {/* Balance */}
                  <div style={{ textAlign: 'right', fontSize: 14, fontWeight: 900, color: '#FF5C00', fontFamily: 'Outfit' }}>
                    {(user.balance || 0).toLocaleString()}
                    <span style={{ fontSize: 10, color: '#8F8F9B', marginLeft: 2 }}>🪙</span>
                  </div>

                  {/* Wins */}
                  <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#10B981' }}>
                    {user.wins || 0}
                  </div>

                  {/* Level */}
                  <div style={{ textAlign: 'center' }}>
                    <span style={{
                      fontSize: 10, fontWeight: 900, padding: '2px 7px', borderRadius: 6,
                      background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
                      color: '#F59E0B'
                    }}>
                      Lv{user.level || 1}
                    </span>
                  </div>

                  {/* Winrate */}
                  <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: winrate !== null ? (winrate >= 50 ? '#10B981' : '#EF4444') : '#51515E' }}>
                    {winrate !== null ? `${winrate}%` : '—'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
