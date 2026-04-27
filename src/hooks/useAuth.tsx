import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (credentials: any) => {
    // Solve JS Challenge
    let challengeData: any = null;
    try {
      const cRes = await fetch('/api/auth/challenge');
      challengeData = await cRes.json();
    } catch (err) {
      throw new Error('Security system unreachable');
    }

    // Worker simulation to find hash
    async function solve(salt: string, diff: number) {
      const prefix = '0'.repeat(diff);
      let nonce = 0;
      
      // Fallback if crypto is not available
      if (!window.crypto || !window.crypto.subtle) {
        console.warn('Crypto subtle not available, using fallback bypass');
        return 'bypass-' + Math.random().toString(36);
      }

      while (true) {
        const str = salt + nonce;
        const msgUint8 = new TextEncoder().encode(str);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        if (hashHex.startsWith(prefix)) return nonce.toString();
        nonce++;
        if (nonce % 1000 === 0) await new Promise(r => setTimeout(r, 0)); // non-blocking
      }
    }

    const challengeNonce = await solve(challengeData.salt, challengeData.difficulty);

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        ...credentials, 
        challengeId: challengeData.id, 
        challengeNonce 
      }),
      credentials: 'include',
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Login failed');
    }
    await refreshUser();
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
