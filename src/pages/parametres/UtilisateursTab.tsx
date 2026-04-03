import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Search, UserPlus, Shield, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface UserInfo {
  user_id: string;
  nom: string;
  prenom: string;
  telephone: string | null;
  role: string | null;
}

const ROLE_COLORS: Record<string, string> = {
  DG: "bg-primary/10 text-primary",
  COMMERCIAL: "bg-info/10 text-info",
  LOGISTIQUE: "bg-warning/10 text-warning",
  FINANCE: "bg-success/10 text-success",
  ACHATS: "bg-accent/50 text-accent-foreground",
  ASSISTANTE: "bg-muted text-muted-foreground",
  MAINTENANCE: "bg-warning/10 text-warning",
  ADMIN: "bg-destructive/10 text-destructive",
};

export default function UtilisateursTab() {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    // Get profiles
    const { data: profiles } = await supabase.from("profiles").select("user_id, nom, prenom, telephone");
    // Get roles
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");

    const roleMap = new Map((roles || []).map(r => [r.user_id, r.role]));
    const merged: UserInfo[] = (profiles || []).map(p => ({
      ...p,
      role: roleMap.get(p.user_id) || null,
    }));
    setUsers(merged);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = users.filter(u => {
    const term = search.toLowerCase();
    return u.nom.toLowerCase().includes(term) || u.prenom.toLowerCase().includes(term) || (u.role || "").toLowerCase().includes(term);
  });

  if (loading) return <div className="flex items-center justify-center h-40 text-muted-foreground">Chargement...</div>;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border border-border shadow-none">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{users.length}</p>
              <p className="text-xs text-muted-foreground">Utilisateurs</p>
            </div>
          </CardContent>
        </Card>
        {["DG", "COMMERCIAL", "LOGISTIQUE", "FINANCE"].map(role => (
          <Card key={role} className="border border-border shadow-none">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", ROLE_COLORS[role]?.split(" ")[0] || "bg-muted")}>
                <Shield className={cn("h-5 w-5", ROLE_COLORS[role]?.split(" ")[1] || "text-muted-foreground")} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{users.filter(u => u.role === role).length}</p>
                <p className="text-xs text-muted-foreground">{role}</p>
              </div>
            </CardContent>
          </Card>
        )).slice(0, 3)}
      </div>

      {/* Search */}
      <Card className="border border-border shadow-none">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Rechercher un utilisateur..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <p className="text-sm text-muted-foreground">
              La création d'utilisateurs se fait via l'inscription
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border border-border shadow-none">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Prénom</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Rôle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(u => (
                <TableRow key={u.user_id}>
                  <TableCell className="font-medium">{u.nom}</TableCell>
                  <TableCell>{u.prenom}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.telephone || "—"}</TableCell>
                  <TableCell>
                    {u.role ? (
                      <Badge variant="outline" className={cn("border-0 text-xs font-medium", ROLE_COLORS[u.role] || "bg-muted text-muted-foreground")}>
                        {u.role}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Non défini</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Aucun utilisateur trouvé</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
