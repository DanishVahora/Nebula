import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { authAPI, userAPI } from "@/lib/api";

export interface ConnectedAccount {
  id: string;
  provider: string;
  username: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  role: "STUDENT" | "TEACHER" | "ADMIN";
  provider: string;
  createdAt: string;
  connectedAccounts: ConnectedAccount[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (provider: "google" | "github") => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateRole: (role: "STUDENT" | "TEACHER") => Promise<void>;
  hasGitHubConnected: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      setError(null);
      const { data } = await authAPI.getMe();
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = (provider: "google" | "github") => {
    const url =
      provider === "google"
        ? authAPI.googleLoginUrl
        : authAPI.githubLoginUrl;
    window.location.href = url;
  };

  const logout = async () => {
    try {
      await authAPI.logout();
      setUser(null);
    } catch {
      // Clear local state even if request fails
      setUser(null);
    }
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  const updateRole = async (role: "STUDENT" | "TEACHER") => {
    await userAPI.updateRole(role);
    await fetchUser();
  };

  const hasGitHubConnected =
    user?.connectedAccounts?.some((a) => a.provider === "github") ?? false;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
        updateRole,
        hasGitHubConnected,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
