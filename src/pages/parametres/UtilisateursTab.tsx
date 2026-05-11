import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Search, UserPlus, Shield, MoreVertical, KeyRound, Ban, CheckCircle2, RefreshCw, Copy, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface UserInfo {
  user_id: string;
  nom: string;
  prenom: string;
  telephone: string | null;
  role: string | null;
}

const ROLES = ["SUPER_ADMIN", "DG", "COMMERCIAL", "LOGISTIQUE", "FINANCE", "ACHATS", "ASSISTANTE", "MAINTENANCE", "ADMIN_VENTES", "ADMIN"] as const;

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-[hsl(263_70%_50%)]/10 text-[hsl(263_70%_50%)]",
  DG: "bg-primary/10 text-primary",
  COMMERCIAL: "bg-info/10 text-info",
  LOGISTIQUE: "bg-warning/10 text-warning",
  FINANCE: "bg-success/10 text-success",
  ACHATS: "bg-accent/50 text-accent-foreground",
  ASSISTANTE: "bg-muted text-muted-foreground",
  MAINTENANCE: "bg-warning/10 text-warning",
  ADMIN_VENTES: "bg-info/10 text-info",
  ADMIN: "bg-destructive/10 text-destructive",
};

export default function UtilisateursTab() {
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  const generatePassword = (length = 14) => {
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lower = "abcdefghijkmnpqrstuvwxyz";
    const digits = "23456789";
    const symbols = "!@#$%&*?";
    const all = upper + lower + digits + symbols;
    const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
    let pwd = pick(upper) + pick(lower) + pick(digits) + pick(symbols);
    for (let i = pwd.length; i < length; i++) pwd += pick(all);
    return pwd.split("").sort(() => Math.random() - 0.5).join("");
  };

  const copyToClipboard = async (value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Mot de passe copié");
    } catch {
      toast.error("Impossible de copier");
    }
  };

  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [resetPwdOpen, setResetPwdOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Create form
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newNom, setNewNom] = useState("");
  const [newPrenom, setNewPrenom] = useState("");
  const [newRole, setNewRole] = useState<string>("COMMERCIAL");

  // Role change
  const [editRole, setEditRole] = useState<string>("");

  // Reset password
  const [newPwd, setNewPwd] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from("profiles").select("user_id, nom, prenom, telephone");
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

  const callAdminFn = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("admin-manage-user", { body });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const handleCreate = async () => {
    if (!newEmail || !newPassword || !newNom || !newPrenom) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    setActionLoading(true);
    try {
      await callAdminFn({ action: "create", email: newEmail, password: newPassword, nom: newNom, prenom: newPrenom, role: newRole });
      toast.success("Utilisateur créé avec succès");
      setCreateOpen(false);
      setNewEmail(""); setNewPassword(""); setNewNom(""); setNewPrenom(""); setNewRole("COMMERCIAL");
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la création");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRoleChange = async () => {
    if (!selectedUser || !editRole) return;
    setActionLoading(true);
    try {
      await callAdminFn({ action: "update_role", user_id: selectedUser.user_id, role: editRole });
      toast.success("Rôle modifié avec succès");
      setRoleDialogOpen(false);
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisable = async (u: UserInfo) => {
    if (!confirm(`Désactiver le compte de ${u.prenom} ${u.nom} ?`)) return;
    try {
      await callAdminFn({ action: "disable", user_id: u.user_id });
      toast.success("Compte désactivé");
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    }
  };

  const handleEnable = async (u: UserInfo) => {
    try {
      await callAdminFn({ action: "enable", user_id: u.user_id });
      toast.success("Compte réactivé");
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPwd) return;
    if (newPwd.length < 6) { toast.error("Le mot de passe doit faire au moins 6 caractères"); return; }
    setActionLoading(true);
    try {
      await callAdminFn({ action: "reset_password", user_id: selectedUser.user_id, new_password: newPwd });
      toast.success("Mot de passe réinitialisé");
      setResetPwdOpen(false);
      setNewPwd("");
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setActionLoading(false);
    }
  };

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
        {["DG", "COMMERCIAL", "LOGISTIQUE"].map(role => (
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
        ))}
      </div>

      {/* Search + Create */}
      <Card className="border border-border shadow-none">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Rechercher un utilisateur..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
              <UserPlus className="h-4 w-4" /> Nouvel utilisateur
            </Button>
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
                <TableHead className="w-12"></TableHead>
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
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => { setSelectedUser(u); setEditRole(u.role || "COMMERCIAL"); setRoleDialogOpen(true); }}>
                          <Shield className="h-4 w-4" /> Modifier le rôle
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => { setSelectedUser(u); setNewPwd(""); setResetPwdOpen(true); }}>
                          <KeyRound className="h-4 w-4" /> Réinitialiser mot de passe
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 cursor-pointer text-destructive focus:text-destructive" onClick={() => handleDisable(u)}>
                          <Ban className="h-4 w-4" /> Désactiver
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 cursor-pointer text-success focus:text-success" onClick={() => handleEnable(u)}>
                          <CheckCircle2 className="h-4 w-4" /> Réactiver
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun utilisateur trouvé</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog: Create User */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-primary" /> Nouvel utilisateur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nom</Label>
                <Input value={newNom} onChange={e => setNewNom(e.target.value)} placeholder="Koné" />
              </div>
              <div className="space-y-1.5">
                <Label>Prénom</Label>
                <Input value={newPrenom} onChange={e => setNewPrenom(e.target.value)} placeholder="Amadou" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@civotech.ci" />
            </div>
            <div className="space-y-1.5">
              <Label>Mot de passe</Label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 6 caractères" />
            </div>
            <div className="space-y-1.5">
              <Label>Rôle</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={actionLoading}>
              {actionLoading ? "Création..." : "Créer l'utilisateur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Change Role */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Modifier le rôle</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Utilisateur : <span className="font-medium text-foreground">{selectedUser?.prenom} {selectedUser?.nom}</span>
          </p>
          <div className="space-y-1.5">
            <Label>Nouveau rôle</Label>
            <Select value={editRole} onValueChange={setEditRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleRoleChange} disabled={actionLoading}>
              {actionLoading ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Reset Password */}
      <Dialog open={resetPwdOpen} onOpenChange={setResetPwdOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary" /> Réinitialiser le mot de passe</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Utilisateur : <span className="font-medium text-foreground">{selectedUser?.prenom} {selectedUser?.nom}</span>
          </p>
          <div className="space-y-1.5">
            <Label>Nouveau mot de passe</Label>
            <Input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Min. 6 caractères" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPwdOpen(false)}>Annuler</Button>
            <Button onClick={handleResetPassword} disabled={actionLoading}>
              {actionLoading ? "Réinitialisation..." : "Réinitialiser"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
