import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 'club'  = Club Manager workspace
// 'event' = Xé Vé Manager workspace
//
// Besides the current workspace this also carries an "intent": a one-shot request to
// open something in the OTHER workspace (e.g. from a club's Events tab, open an event).
// The workspace's first screen consumes the intent as soon as it mounts.
const MODE_KEY = 'app.mode';
const ModeContext = createContext(null);

export function ModeProvider({ children }) {
  const [mode, setModeState] = useState(null);
  const [ready, setReady] = useState(false);
  const [intent, setIntent] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem(MODE_KEY)
      .then((saved) => { if (saved === 'club' || saved === 'event') setModeState(saved); })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const setMode = useCallback((next) => {
    setModeState(next);
    if (next) AsyncStorage.setItem(MODE_KEY, next).catch(() => {});
    else AsyncStorage.removeItem(MODE_KEY).catch(() => {});
  }, []);

  const value = useMemo(() => ({
    mode, setMode, ready, intent,
    clearIntent: () => setIntent(null),
    // Cross-workspace navigation
    openEvent: (eventId, eventTitle) => { setIntent({ type: 'event', eventId, eventTitle }); setMode('event'); },
    openNewEvent: (clubId, clubName) => { setIntent({ type: 'newEvent', clubId, clubName }); setMode('event'); },
    openClub: (clubId, clubName) => { setIntent({ type: 'club', clubId, clubName }); setMode('club'); },
  }), [mode, setMode, ready, intent]);

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export function useMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error('useMode must be used within a ModeProvider');
  return ctx;
}
