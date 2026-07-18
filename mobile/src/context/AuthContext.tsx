import React, { createContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Session } from '@supabase/supabase-js';

type AppMode = 'customer' | 'provider';

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
}

export const AuthContext = createContext<AuthContextType>({ 
  session: null, 
  loading: true,
  appMode: 'customer',
  setAppMode: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [appMode, setAppMode] = useState<AppMode>('customer');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading, appMode, setAppMode }}>
      {children}
    </AuthContext.Provider>
  );
};
