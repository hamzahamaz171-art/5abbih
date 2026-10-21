import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

const SelectedPlayerContext = createContext(null);

function buildStorageKey(userId) {
  return `selected-player-id:${userId ?? 'anon'}`;
}

export function SelectedPlayerProvider({ children }) {
  const { user } = useAuth();
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);

  useEffect(() => {
    const key = buildStorageKey(user?.id);
    const saved = localStorage.getItem(key);
    setSelectedPlayerId(saved || null);
  }, [user?.id]);

  useEffect(() => {
    const key = buildStorageKey(user?.id);
    if (selectedPlayerId) {
      localStorage.setItem(key, selectedPlayerId);
    } else {
      localStorage.removeItem(key);
    }
  }, [selectedPlayerId, user?.id]);

  const value = useMemo(() => ({
    selectedPlayerId,
    setSelectedPlayerId,
    clearSelectedPlayer: () => setSelectedPlayerId(null),
  }), [selectedPlayerId]);

  return (
    <SelectedPlayerContext.Provider value={value}>
      {children}
    </SelectedPlayerContext.Provider>
  );
}

export function useSelectedPlayer() {
  const ctx = useContext(SelectedPlayerContext);
  if (!ctx) throw new Error('useSelectedPlayer must be used within SelectedPlayerProvider');
  return ctx;
}
