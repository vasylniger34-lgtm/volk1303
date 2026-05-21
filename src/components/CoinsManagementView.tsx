import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, Minus } from 'lucide-react';

export const CoinsManagementView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [amount, setAmount] = useState<number | string>('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [searchQuery]);

  const fetchUsers = async () => {
    if (!searchQuery.trim()) {
      setUsers([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, user_coins(registration_number, coins)')
        .ilike('username', `%${searchQuery}%`)
        .limit(10);
      
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'add' | 'subtract' | 'set') => {
    if (!selectedUser || !amount || isNaN(Number(amount))) return;
    
    setActionLoading(true);
    const numAmount = Number(amount);
    try {
      let rpcName = '';
      if (action === 'add') rpcName = 'increment_coins';
      if (action === 'subtract') rpcName = 'decrement_coins';
      if (action === 'set') rpcName = 'set_coins';

      const { error } = await supabase.rpc(rpcName, {
        target_user_id: selectedUser.id,
        amount: numAmount
      });

      if (error) throw error;
      
      // Refresh the specific user's balance locally
      setUsers(users.map(u => {
        if (u.id === selectedUser.id) {
          const currentCoins = u.user_coins?.[0]?.coins || 0;
          let newCoins = currentCoins;
          if (action === 'add') newCoins += numAmount;
          if (action === 'subtract') newCoins -= numAmount;
          if (action === 'set') newCoins = numAmount;
          
          return {
            ...u,
            user_coins: [{ ...u.user_coins?.[0], coins: newCoins }]
          };
        }
        return u;
      }));
      setAmount('');
      setSelectedUser(null);
      alert('Success!');
    } catch (err) {
      console.error('Action failed:', err);
      alert('Error updating coins');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', color: '#fff' }}>
      <h2>Coins Management</h2>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={20} style={{ position: 'absolute', left: '10px', top: '10px', color: '#666' }} />
          <input
            type="text"
            placeholder="Search by username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '10px 10px 10px 40px',
              background: '#222', border: '1px solid #333', borderRadius: '8px', color: '#fff'
            }}
          />
        </div>
      </div>

      {loading && <p>Loading...</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {users.map(user => (
          <div key={user.id} style={{
            background: '#1a1a1a', padding: '15px', borderRadius: '8px',
            border: selectedUser?.id === user.id ? '1px solid #FF5C00' : '1px solid #333',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }} onClick={() => setSelectedUser(user)}>
            <div>
              <h3 style={{ margin: '0 0 5px 0' }}>{user.username}</h3>
              <p style={{ margin: 0, color: '#888', fontSize: '14px' }}>
                Reg #: {user.user_coins?.[0]?.registration_number || 'N/A'}
              </p>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#FF5C00' }}>
              {user.user_coins?.[0]?.coins || 0}
            </div>
          </div>
        ))}
      </div>

      {selectedUser && (
        <div style={{ marginTop: '20px', background: '#222', padding: '20px', borderRadius: '8px' }}>
          <h3>Manage Coins for {selectedUser.username}</h3>
          <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
            <input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{
                flex: 1, padding: '10px', background: '#111',
                border: '1px solid #333', borderRadius: '8px', color: '#fff'
              }}
            />
            <button onClick={() => handleAction('add')} disabled={actionLoading} style={{ padding: '10px 15px', background: '#28a745', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}><Plus size={20} /></button>
            <button onClick={() => handleAction('subtract')} disabled={actionLoading} style={{ padding: '10px 15px', background: '#dc3545', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}><Minus size={20} /></button>
            <button onClick={() => handleAction('set')} disabled={actionLoading} style={{ padding: '10px 15px', background: '#FF5C00', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>Set</button>
          </div>
        </div>
      )}
    </div>
  );
};
