import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';

interface AuthContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  setCurrentUser: () => {},
  logout: () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUserState] = useState<User | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('agrix_user');
    if (saved) setCurrentUserState(JSON.parse(saved));
  }, []);

  const setCurrentUser = (user: User | null) => {
    setCurrentUserState(user);
    if (user) localStorage.setItem('agrix_user', JSON.stringify(user));
    else localStorage.removeItem('agrix_user');
  };

  const logout = () => {
    setCurrentUser(null);
    window.speechSynthesis?.cancel();
  };

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
