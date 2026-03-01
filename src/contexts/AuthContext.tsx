import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import {
  type User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  getAdditionalUserInfo,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { api } from '../lib/api';
import type { UserProfile } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  /** null = still loading; true = profile complete; false = needs /setup */
  profileComplete: boolean | null;
  markProfileComplete: () => void;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  /** Returns true if the Google sign-in created a brand-new account. */
  signInWithGoogle: () => Promise<boolean>;
  logOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (!currentUser) {
        // Logged out — reset profile state
        setProfileComplete(null);
        return;
      }

      // Fetch profile to check if native language + accent are set
      api
        .get<UserProfile>('/auth/me')
        .then((r) => {
          const p = r.data;
          setProfileComplete(
            Boolean(p.nativeLanguage && p.targetAccent),
          );
        })
        .catch(() => {
          // If fetch fails, don't block the user — treat as complete
          setProfileComplete(true);
        });
    });
    return unsubscribe;
  }, []);

  const markProfileComplete = useCallback(() => {
    setProfileComplete(true);
  }, []);

  const signUp = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signInWithGoogle = async (): Promise<boolean> => {
    const result = await signInWithPopup(auth, googleProvider);
    const info = getAdditionalUserInfo(result);
    return info?.isNewUser ?? false;
  };

  const logOut = async () => {
    await signOut(auth);
  };

  const getIdToken = async (): Promise<string | null> => {
    if (!user) return null;
    return user.getIdToken();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        profileComplete,
        markProfileComplete,
        signUp,
        signIn,
        signInWithGoogle,
        logOut,
        getIdToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
