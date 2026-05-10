import { Settings, Wrench, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { usePlatformSettings } from "@/hooks/use-platform-settings";

export default function PlateformePage() {
  const { settings, update, loading } = usePlatformSettings();
  const [message, setMessage] = useState("");

  useEffect(() => { if (settings) setMessage(settings.maintenance_message || ""); }, [settings]);

  if (loading) return <div className="py-12 text-center text-muted-foreground">Chargement...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" /> Paramètres plateforme
        </h1>
        <p className="text-sm text-muted-foreground">Configuration globale de Civotech Flow</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border border-border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Eye className="h-4 w-4 text-primary" /> Mode démonstration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Activer le mode démo</p>
                <p className="text-xs text-muted-foreground mt-0.5">Affiche les comptes de connexion rapide sur la page de login</p>
              </div>
              <Switch
                checked={settings?.demo_mode_enabled ?? false}
                onCheckedChange={(v) => update({ demo_mode_enabled: v })}
              />
            </div>
            <p className="text-xs text-muted-foreground bg-muted/40 rounded-md p-3">
              {settings?.demo_mode_enabled
                ? "✓ Les comptes de démonstration sont visibles sur la page de connexion."
                : "✕ Les comptes de démonstration sont masqués. Seule la connexion par email/mot de passe est possible."}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Wrench className="h-4 w-4 text-primary" /> Mode maintenance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Activer le mode maintenance</p>
                <p className="text-xs text-muted-foreground mt-0.5">Bloque temporairement l'accès aux utilisateurs (sauf Super Admin)</p>
              </div>
              <Switch
                checked={settings?.maintenance_mode ?? false}
                onCheckedChange={(v) => update({ maintenance_mode: v })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Message affiché</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="La plateforme est en maintenance. Retour prévu à 18h00."
                rows={3}
              />
              <Button size="sm" onClick={() => update({ maintenance_message: message })}>
                Enregistrer le message
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
