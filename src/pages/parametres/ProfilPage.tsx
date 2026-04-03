import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { User, Mail, Phone, Shield, Save, Camera } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

export default function ProfilPage() {
  const { user } = useAuth();
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [saving, setSaving] = useState(false);

  // Password change
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [changingPwd, setChangingPwd] = useState(false);

  useEffect(() => {
    if (user) {
      setNom(user.nom);
      setPrenom(user.prenom);
      // Fetch telephone
      supabase.from("profiles").select("telephone").eq("user_id", user.id).single().then(({ data }) => {
        setTelephone(data?.telephone || "");
      });
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ nom, prenom, telephone } as any)
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success("Profil mis à jour");
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPwd.length < 6) { toast.error("Le mot de passe doit faire au moins 6 caractères"); return; }
    if (newPwd !== confirmPwd) { toast.error("Les mots de passe ne correspondent pas"); return; }
    setChangingPwd(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPwd });
      if (error) throw error;
      toast.success("Mot de passe modifié avec succès");
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setChangingPwd(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <User className="h-6 w-6 text-primary" /> Mon profil
        </h1>
        <p className="text-sm text-muted-foreground">Gérez vos informations personnelles</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="border border-border shadow-none lg:col-span-1">
          <CardContent className="p-6 flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground mb-4">
              {user.prenom[0]}{user.nom[0]}
            </div>
            <h2 className="text-lg font-semibold text-foreground">{user.prenom} {user.nom}</h2>
            <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
            <Badge variant="outline" className={cn("mt-3 border-0 text-xs font-medium", ROLE_COLORS[user.role] || "bg-muted text-muted-foreground")}>
              <Shield className="h-3 w-3 mr-1" /> {user.role}
            </Badge>
          </CardContent>
        </Card>

        {/* Edit Form */}
        <Card className="border border-border shadow-none lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Informations personnelles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nom</Label>
                <Input value={nom} onChange={e => setNom(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Prénom</Label>
                <Input value={prenom} onChange={e => setPrenom(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Email</Label>
                <Input value={user.email} disabled className="bg-muted" />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> Téléphone</Label>
                <Input value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="+225 XX XX XX XX" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSaveProfile} disabled={saving} className="gap-1.5">
                <Save className="h-4 w-4" /> {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Changer le mot de passe</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Nouveau mot de passe</Label>
                  <Input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Min. 6 caractères" />
                </div>
                <div className="space-y-1.5">
                  <Label>Confirmer</Label>
                  <Input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="Confirmer" />
                </div>
                <div className="flex items-end">
                  <Button variant="outline" onClick={handleChangePassword} disabled={changingPwd || !newPwd}>
                    {changingPwd ? "Modification..." : "Modifier"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
