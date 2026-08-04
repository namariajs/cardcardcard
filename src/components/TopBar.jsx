import { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function TopBar() {
  const { unlocked, tryUnlock, lock } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (unlocked) { lock(); return; }
    if (loading) return;
    setLoading(true);
    const ok = await tryUnlock(email, password);
    setLoading(false);
    if (ok) { setEmail(''); setPassword(''); }
    else alert('Email ou senha incorretos.');
  }

  return (
    <div className="topbar">
      <div className="spacer" />
      <div className={`lock-chip${unlocked ? ' unlocked' : ''}`}>
        <span>{unlocked ? '🔓' : '🔒'}</span>
        {!unlocked && (
          <div className="lock-fields">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleClick(); }}
            />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleClick(); }}
            />
          </div>
        )}
        <button className="btn btn-primary" style={{ padding: '6px 12px' }} onClick={handleClick} disabled={loading}>
          {unlocked ? 'Sair' : loading ? '...' : 'Entrar'}
        </button>
      </div>
    </div>
  );
}
