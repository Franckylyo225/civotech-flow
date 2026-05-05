import { useState, useEffect, useRef } from "react";
import { Building2, Globe, DollarSign, FileText, Save, Plus, X, Upload, Image as ImageIcon, Trash2 } from "lucide-react";
import { useCompanySettings, type CompanySettings } from "@/hooks/use-company-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props { canEdit: boolean; }

export default function EntrepriseTab({ canEdit }: Props) {
  const { settings, loading, update } = useCompanySettings();
  const [form, setForm] = useState<Partial<CompanySettings>>({});
  const [saving, setSaving] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [editingList, setEditingList] = useState<string | null>(null);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await update(form);
      toast.success("Paramètres enregistrés");
    } catch (err: any) { toast.error(err.message || "Erreur"); }
    finally { setSaving(false); }
  };

  const set = (key: keyof CompanySettings, value: any) => setForm(f => ({ ...f, [key]: value }));

  const addToList = (key: keyof CompanySettings) => {
    if (!newItem.trim()) return;
    const current = (form[key] as string[]) || [];
    set(key, [...current, newItem.trim()]);
    setNewItem("");
  };

  const removeFromList = (key: keyof CompanySettings, index: number) => {
    const current = (form[key] as string[]) || [];
    set(key, current.filter((_, i) => i !== index));
  };

  if (loading) return <div className="flex items-center justify-center h-40 text-muted-foreground">Chargement...</div>;

  const ListEditor = ({ label, field }: { label: string; field: keyof CompanySettings }) => {
    const items = (form[field] as string[]) || [];
    const isEditing = editingList === field;
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">{label}</Label>
          {canEdit && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingList(isEditing ? null : field as string)}>
              {isEditing ? "Fermer" : "Modifier"}
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <Badge key={i} variant="secondary" className="gap-1 text-xs">
              {item}
              {isEditing && (
                <button onClick={() => removeFromList(field, i)} className="ml-0.5 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
        {isEditing && (
          <div className="flex gap-2 mt-1">
            <Input value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="Ajouter..." className="h-8 text-sm"
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addToList(field); } }} />
            <Button size="sm" variant="outline" className="h-8" onClick={() => addToList(field)}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Informations générales */}
      <Card className="border border-border shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" /> Informations générales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nom de l'entreprise</Label>
              <Input value={form.nom || ""} onChange={e => set("nom", e.target.value)} disabled={!canEdit} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email || ""} onChange={e => set("email", e.target.value)} disabled={!canEdit} />
            </div>
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input value={form.telephone || ""} onChange={e => set("telephone", e.target.value)} disabled={!canEdit} />
            </div>
            <div className="space-y-2">
              <Label>Site web</Label>
              <Input value={form.site_web || ""} onChange={e => set("site_web", e.target.value)} disabled={!canEdit} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Adresse</Label>
              <Input value={form.adresse || ""} onChange={e => set("adresse", e.target.value)} disabled={!canEdit} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Paramètres métier */}
      <Card className="border border-border shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" /> Paramètres métier
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Devise</Label>
              <Input value={form.devise || ""} onChange={e => set("devise", e.target.value)} disabled={!canEdit} />
            </div>
            <div className="space-y-2">
              <Label>Format date</Label>
              <Input value={form.format_date || ""} onChange={e => set("format_date", e.target.value)} disabled={!canEdit} />
            </div>
            <div className="space-y-2">
              <Label>Fuseau horaire</Label>
              <Input value={form.fuseau_horaire || ""} onChange={e => set("fuseau_horaire", e.target.value)} disabled={!canEdit} />
            </div>
            <div className="space-y-2">
              <Label>Langue</Label>
              <Input value={form.langue || ""} onChange={e => set("langue", e.target.value)} disabled={!canEdit} />
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-6">
            <ListEditor label="Types de véhicules" field="types_vehicules" />
            <ListEditor label="Types de prestations" field="types_prestations" />
            <ListEditor label="Catégories de dépenses" field="categories_depenses" />
            <ListEditor label="Modes de paiement" field="modes_paiement" />
          </div>
        </CardContent>
      </Card>

      {/* Paramètres financiers */}
      <Card className="border border-border shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" /> Paramètres financiers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Taux TVA (%)</Label>
              <Input type="number" value={form.taux_tva || 0} onChange={e => set("taux_tva", Number(e.target.value))} disabled={!canEdit} />
            </div>
            <div className="space-y-2">
              <Label>Conditions de paiement</Label>
              <Input value={form.conditions_paiement || ""} onChange={e => set("conditions_paiement", e.target.value)} disabled={!canEdit} />
            </div>
          </div>
          <Separator />
          <div>
            <Label className="text-sm font-medium mb-3 block">
              <FileText className="h-4 w-4 inline mr-1.5" /> Préfixes de numérotation
            </Label>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: "Factures", key: "prefixe_facture" as const },
                { label: "Devis", key: "prefixe_devis" as const },
                { label: "Opérations", key: "prefixe_operation" as const },
                { label: "Décaissements", key: "prefixe_decaissement" as const },
                { label: "Demandes achat", key: "prefixe_demande_achat" as const },
              ].map(p => (
                <div key={p.key} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{p.label}</Label>
                  <Input value={(form[p.key] as string) || ""} onChange={e => set(p.key, e.target.value)} disabled={!canEdit} className="font-mono" />
                </div>
              ))}
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              <FileText className="h-4 w-4 inline mr-1.5" /> Conditions générales des devis
            </Label>
            <p className="text-xs text-muted-foreground">
              Affichées en bas du PDF du devis. Variables : <code className="font-mono">{"{validite}"}</code> (jours), <code className="font-mono">{"{tva}"}</code> (taux TVA).
            </p>
            <Textarea
              value={form.conditions_devis || ""}
              onChange={e => set("conditions_devis", e.target.value)}
              disabled={!canEdit}
              rows={6}
              className="text-sm"
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Afficher la mention « Mis à jour » sur le PDF du devis</Label>
              <p className="text-xs text-muted-foreground">
                Affiche la date de dernière mise à jour à côté de la date d'émission dans l'en-tête.
              </p>
            </div>
            <Switch
              checked={form.afficher_maj_devis ?? true}
              onCheckedChange={(v) => set("afficher_maj_devis", v)}
              disabled={!canEdit}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-1.5 h-4 w-4" /> {saving ? "Enregistrement..." : "Enregistrer les modifications"}
          </Button>
        </div>
      )}
    </div>
  );
}
