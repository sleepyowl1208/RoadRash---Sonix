
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import * as firebaseAuth from "firebase/auth";
import { auth } from "@/lib/firebase";

// Workaround for TypeScript error: "Module 'firebase/auth' has no exported member..."
const { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } = firebaseAuth as any;

interface AuthContextType {
  user: any | null; // Relaxed type from User to any
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      // If auth is not initialized (missing keys), stop loading and remain in guest mode
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user: any) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!auth) {
      alert("Login unavailable: Firebase configuration is missing.");
      return;
    }
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const logout = async () => {
    if (auth) {
      await signOut(auth);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
