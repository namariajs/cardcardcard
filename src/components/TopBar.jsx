import { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function TopBar() {
  const { unlocked, tryUnlock, lock } = useApp();
  const [pin, setPin] = useState('');

  function handleClick() {
    if (unlocked) { lock(); return; }
    if (tryUnlock(pin)) setPin('');
    else alert('PIN incorreto.');
  }

  return (
    <div className="topbar">
      <div className="spacer" />
      <div className={`lock-chip${unlocked ? ' unlocked' : ''}`}>
        <span>{unlocked ? '🔓' : '🔒'}</span>
        {!unlocked && (
          <input
            type="text"
            placeholder="PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleClick(); }}
          />
        )}
        <button className="btn btn-primary" style={{ padding: '6px 12px' }} onClick={handleClick}>
          {unlocked ? 'Sair' : 'Entrar'}
        </button>
      </div>
    </div>
  );
}
