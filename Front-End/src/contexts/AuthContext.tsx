import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "@/components/MatchDashboard/types";

type League = string;

interface LeagueInfo {
  _id?: string;
  league: string;
  name: string;
  knownName?: string;
  arabicName?: string;
  isHidden: boolean;
  competitionCode?: string;
  iconUrl?: string;
  [key: string]: any;
}

interface User {
  id: string;
  username: string;
  email: string;
  role?: "superAdmin" | "viewer" | "employee";
  leagues?: League[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  leagues: LeagueInfo[];
  loadingLeagues: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  verifyAuth: () => Promise<void>;
  fetchLeagues: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [leagues, setLeagues] = useState<LeagueInfo[]>([]);
  const [loadingLeagues, setLoadingLeagues] = useState(false);
  const navigate = useNavigate();

  // Verify authentication on mount
  useEffect(() => {
    verifyAuth();
  }, []);

  // Fetch leagues when user is authenticated
  useEffect(() => {
    if (user) {
      fetchLeagues();
    } else {
      setLeagues([]);
    }
  }, [user]);

  const fetchLeagues = async () => {
    setLoadingLeagues(true);
    try {
      const response = await fetch(`${API_URL}/leagues`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setLeagues(data || []);
      }
    } catch (error) {
      console.error("Error fetching leagues:", error);
      setLeagues([]);
    } finally {
      setLoadingLeagues(false);
    }
  };

  const verifyAuth = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/auth/verify`, {
        method: "GET",
        credentials: "include", // Include cookies
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Auth verification error:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Login failed");
      }

      const data = await response.json();
      setUser(data.user);
      navigate("/");
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include", // Include cookies
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      navigate("/login");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        leagues,
        loadingLeagues,
        login,
        logout,
        verifyAuth,
        fetchLeagues,
      }}>
      {children}
    </AuthContext.Provider>
  );
};
