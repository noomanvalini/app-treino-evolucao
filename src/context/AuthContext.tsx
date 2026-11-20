'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export interface UserProfile {
  nome: string;
  email: string;
  idade: number;
  altura: number; // in cm
  sexo: string;
  pesoAtual: number; // in kg
  dataCriacao: any;
  objetivo?: 'hipertrofia' | 'forca' | 'definicao' | 'condicionamento';
  frequenciaSemanal?: '2-3' | '4-5' | '6' | 'flexivel';
  diasAtivos?: string[];
  focoMuscularGrupo?: 'corpo_inteiro' | 'superiores' | 'inferiores';
  focoMuscularLista?: string[];
  onboardingCompleted?: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isOnboarding: boolean;
  firestoreError: string | null;
  isPreviewMode: boolean;
  enterPreviewMode: () => void;
  logout: () => Promise<void>;
  updateProfile: (profileData: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const PREVIEW_PROFILE: UserProfile = {
  nome: 'Lucas Valini',
  email: 'preview@clipzbody.app',
  idade: 28,
  altura: 178,
  sexo: 'M',
  pesoAtual: 78.4,
  dataCriacao: new Date()
};

const PREVIEW_USER = {
  uid: 'preview_user_uid',
  email: 'preview@clipzbody.app',
  displayName: 'Lucas Valini'
} as unknown as User;

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isOnboarding: false,
  firestoreError: null,
  isPreviewMode: false,
  enterPreviewMode: () => {},
  logout: async () => {},
  updateProfile: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isOnboarding, setIsOnboarding] = useState<boolean>(false);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);

  const fetchProfile = async (uid: string) => {
    setFirestoreError(null);
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
        setIsOnboarding(false);
      } else {
        setProfile(null);
        setIsOnboarding(true);
      }
    } catch (error: any) {
      console.error('Error fetching user profile:', error);
      setFirestoreError(error.message || String(error));
      setIsOnboarding(false); // prevent redirects loops
    }
  };

  useEffect(() => {
    // Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(
        (reg) => console.log('ServiceWorker registered with scope:', reg.scope),
        (err) => console.error('ServiceWorker registration failed:', err)
      );
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('clipzbody_preview_mode');
        }
        setIsPreviewMode(false);
        setUser(currentUser);
        await fetchProfile(currentUser.uid);
        setLoading(false);
        return;
      }

      // Check if preview mode is active in sessionStorage
      if (typeof window !== 'undefined' && sessionStorage.getItem('clipzbody_preview_mode') === 'true') {
        setIsPreviewMode(true);
        setUser(PREVIEW_USER);
        setProfile(PREVIEW_PROFILE);
        setIsOnboarding(false);
        setLoading(false);
        return;
      }

      setUser(null);
      setProfile(null);
      setIsOnboarding(false);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const enterPreviewMode = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('clipzbody_preview_mode', 'true');
    }
    setIsPreviewMode(true);
    setUser(PREVIEW_USER);
    setProfile(PREVIEW_PROFILE);
    setIsOnboarding(false);
    setLoading(false);
  };

  const logout = async () => {
    setLoading(true);
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('clipzbody_preview_mode');
      }
      setIsPreviewMode(false);
      await signOut(auth);
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (profileData: Partial<UserProfile>) => {
    if (!user) return;
    if (isPreviewMode) {
      setProfile((prev) => ({ ...(prev || PREVIEW_PROFILE), ...profileData } as UserProfile));
      setIsOnboarding(false);
      return;
    }
    try {
      const docRef = doc(db, 'users', user.uid);
      const updated = {
        ...profile,
        ...profileData,
        email: user.email || '',
      } as UserProfile;

      await setDoc(docRef, updated, { merge: true });
      setProfile(updated);
      setIsOnboarding(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const refreshProfile = async () => {
    if (user && !isPreviewMode) {
      await fetchProfile(user.uid);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isOnboarding,
        firestoreError,
        isPreviewMode,
        enterPreviewMode,
        logout,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
