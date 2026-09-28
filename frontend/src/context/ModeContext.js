import React, { createContext, useContext, useState } from 'react';

// 'club'  = Club Manager workspace (long-term community)
// 'event' = Xe Ve Manager workspace (pick-up game / event organizer)
const ModeContext = createContext(null);

export function ModeProvider({ children }) {
  const [mode, setMode] = useState(null); // null = show the switcher

  return (
    <ModeContext.Provider value={{ mode, setMode }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error('useMode must be used within a ModeProvider');
  return ctx;
}
