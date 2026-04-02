import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { UserRole } from "./roles";

interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Mock users for now - will be replaced with Supabase auth
const MOCK_USERS: (User & { password: string })[] = [
  { id: "1", nom: "Koné", prenom: "Amadou", email: "dg@civotech.ci", password: "admin123", role: "DG" },
  { id: "2", nom: "Diallo", prenom: "Fatou", email: "commercial@civotech.ci", password: "admin123", role: "COMMERCIAL" },
  { id: "3", nom: "Touré", prenom: "Ibrahim", email: "logistique@civotech.ci", password: "admin123", role: "LOGISTIQUE" },
  { id: "4", nom: "Bamba", prenom: "Aïcha", email: "finance@civotech.ci", password: "admin123", role: "FINANCE" },
  { id: "5", nom: "Coulibaly", prenom: "Moussa", email: "achats@civotech.ci", password: "admin123", role: "ACHATS" },
  { id: "6", nom: "Yao", prenom: "Marie", email: "assistante@civotech.ci", password: "admin123", role: "ASSISTANTE" },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("civotech_user");
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback(async (email: string, password: string) => {
    const found = MOCK_USERS.find((u) => u.email === email && u.password === password);
    if (!found) throw new Error("Identifiants incorrects");
    const { password: _, ...userData } = found;
    setUser(userData);
    localStorage.setItem("civotech_user", JSON.stringify(userData));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("civotech_user");
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
