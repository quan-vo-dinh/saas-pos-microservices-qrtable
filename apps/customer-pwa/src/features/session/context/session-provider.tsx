import { createContext, useContext, useState, type ReactNode } from 'react';

type SessionInfo = {
  sessionId: string;
  tableId: string;
  tableName: string;
  restaurantName: string;
};

type SessionContextValue = {
  session: SessionInfo | null;
  isActive: boolean;
  startSession: (info: SessionInfo) => void;
  endSession: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionInfo | null>(null);

  const startSession = (info: SessionInfo) => setSession(info);
  const endSession = () => setSession(null);

  return (
    <SessionContext.Provider value={{ session, isActive: session !== null, startSession, endSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
