import { useState } from "react";
import { Shield, Plus, Trash2, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useRolePermissionsStore } from "@/hooks/use-role-permissions-store";
import { toast } from "sonner";

const BUILT_IN_ROLES = ["DG", "COMMERCIAL", "LOGISTIQUE", "FINANCE", "ACHATS", "ASSISTANTE", "MAINTENANCE", "ADMIN"];

type Permission = "lecture" | "creation" | "modification" | "validation" | "suppression";

const PERM_LABELS: Record<Permission, { label: string; abbr: string; color: string }> = {
  lecture: { label: "Lecture", abbr: "L", color: "bg-info/10 text-info" },
  creation: { label: "Création", abbr: "C", color: "bg-success/10 text-success" },
  modification: { label: "Modification", abbr: "M", color: "bg-warning/10 text-warning" },
  validation: { label: "Validation", abbr: "V", color: "bg-primary/10 text-primary" },
  suppression: { label: "Suppression", abbr: "S", color: "bg-destructive/10 text-destructive" },
};

export default function RolesTab() {
  const {
    customRoles, loading, getPermissions, updatePermissions,
    createCustomRole, deleteCustomRole, MODULES, ALL_PERMISSIONS,
  } = useRolePermissionsStore();

  const [showCreate, setShowCreate] = useState(false);
  const [newRole, setNewRole] = useState({ nom: "", description: "", role_base: "COMMERCIAL" });
  const [creating, setCreating] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Record<string, Record<string, string[]>>>({});
  const [saving, setSaving] = useState(false);

  const allRoles = [...BUILT_IN_ROLES, ...customRoles.map(r => r.nom)];

  const getCurrentPerms = (role: string, module: string): string[] => {
    return pendingChanges[role]?.[module] ?? getPermissions(role, module);
  };

  const togglePerm = (role: string, module: string, perm: string) => {
    const current = getCurrentPerms(role, module);
    const next = current.includes(perm) ? current.filter(p => p !== perm) : [...current, perm];
    setPendingChanges(prev => ({
      ...prev,
      [role]: { ...(prev[role] || {}), [module]: next },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const promises: Promise<void>[] = [];
    for (const [role, modules] of Object.entries(pendingChanges)) {
      for (const [module, perms] of Object.entries(modules)) {
        promises.push(updatePermissions(role, module, perms));
      }
    }
    await Promise.all(promises);
    setPendingChanges({});
    setSaving(false);
    toast.success("Permissions sauvegardées");
  };

  const handleCreateRole = async () => {
    if (!newRole.nom.trim()) return;
    setCreating(true);
    const result = await createCustomRole({
      nom: newRole.nom.trim().toUpperCase().replace(/\s+/g, "_"),
      description: newRole.description,
      role_base: newRole.role_base,
    });
    if (result) {
      setShowCreate(false);
      setNewRole({ nom: "", description: "", role_base: "COMMERCIAL" });
    }
    setCreating(false);
  };

  const hasPending = Object.keys(pendingChanges).length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="text-sm font-medium text-foreground">Légende :</span>
          {Object.entries(PERM_LABELS).map(([, p]) => (
            <div key={p.abbr} className="flex items-center gap-1.5">
              <Badge variant="outline" className={cn("border-0 text-xs font-bold w-6 h-6 flex items-center justify-center p-0", p.color)}>
                {p.abbr}
              </Badge>
              <span className="text-xs text-muted-foreground">{p.label}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          {hasPending && (
            <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Sauvegarder
            </Button>
          )}
          <Button onClick={() => setShowCreate(true)} size="sm" variant="outline" className="gap-1.5">
            <Plus className="h-4 w-4" /> Nouveau rôle
          </Button>
        </div>
      </div>

      {/* Permissions matrix */}
      <Card className="border border-border shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" /> Matrice des permissions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[140px]">Module</TableHead>
                {allRoles.map(role => (
                  <TableHead key={role} className="text-center text-xs min-w-[120px]">
                    <div className="flex items-center justify-center gap-1">
                      {role}
                      {!BUILT_IN_ROLES.includes(role) && (
                        <Badge variant="secondary" className="text-[9px] px-1 py-0">custom</Badge>
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {MODULES.map(module => (
                <TableRow key={module}>
                  <TableCell className="font-medium text-sm">{module}</TableCell>
                  {allRoles.map(role => {
                    const perms = getCurrentPerms(role, module);
                    return (
                      <TableCell key={role} className="text-center">
                        <div className="flex items-center justify-center gap-0.5 flex-wrap">
                          {ALL_PERMISSIONS.map(p => {
                            const active = perms.includes(p);
                            const info = PERM_LABELS[p as Permission];
                            return (
                              <button
                                key={p}
                                onClick={() => togglePerm(role, module, p)}
                                title={`${info.label} - Cliquez pour ${active ? "retirer" : "ajouter"}`}
                                className={cn(
                                  "w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center transition-all border",
                                  active
                                    ? cn(info.color, "border-transparent")
                                    : "bg-muted/30 text-muted-foreground/30 border-transparent hover:border-muted-foreground/20"
                                )}
                              >
                                {info.abbr}
                              </button>
                            );
                          })}
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Custom roles list */}
      {customRoles.length > 0 && (
        <Card className="border border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Rôles personnalisés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {customRoles.map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <span className="font-medium text-sm">{r.nom}</span>
                    {r.description && <span className="text-xs text-muted-foreground ml-2">— {r.description}</span>}
                    <Badge variant="outline" className="ml-2 text-[10px]">Base: {r.role_base}</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => deleteCustomRole(r.id, r.nom)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Les rôles de base (DG, COMMERCIAL, etc.) sont protégés au niveau de la base de données.
        Les rôles personnalisés héritent des droits de leur rôle de base pour la sécurité serveur.
      </p>

      {/* Create role dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un nouveau rôle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom du rôle</Label>
              <Input
                placeholder="Ex: SUPERVISEUR"
                value={newRole.nom}
                onChange={e => setNewRole(p => ({ ...p, nom: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Sera converti en majuscules (ex: SUPERVISEUR)</p>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Description du rôle..."
                value={newRole.description}
                onChange={e => setNewRole(p => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Rôle de base (sécurité serveur)</Label>
              <Select value={newRole.role_base} onValueChange={v => setNewRole(p => ({ ...p, role_base: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BUILT_IN_ROLES.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Détermine les droits de sécurité au niveau base de données (RLS)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Annuler</Button>
            <Button onClick={handleCreateRole} disabled={creating || !newRole.nom.trim()}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
