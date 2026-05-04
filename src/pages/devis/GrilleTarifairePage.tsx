import { useMemo, useState } from "react";
import { Upload, Download, Plus, Search, Pencil, Trash2, Check, X, Copy, FileText, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { formatFCFA } from "@/utils/format";
import { useAuth } from "@/lib/auth-context";
import {
  useGrilleTarifaire, type TarifZone, type TarifKm, type Majoration,
  type FraisFixe, type ZoneCode, type TypeTransport, type ZoneConfig, type TonnageConfig,
} from "@/hooks/use-grille-tarifaire";

const TYPE_BADGE: Record<TypeTransport, string> = {
  standard: "bg-[#F3F4F6] text-[#374151]",
  express: "bg-[#EDE9FE] text-[#4C1D95]",
  special: "bg-[#FEF3C7] text-[#92400E]",
};
const TYPE_LABEL: Record<TypeTransport, string> = { standard: "Standard", express: "Express", special: "Spécial" };

function toFr(d: string) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}
function validityClass(s: string): string {
  if (!s) return "text-muted-foreground";
  const d = new Date(s);
  const diff = (d.getTime() - Date.now()) / 86400000;
  if (diff < 0) return "text-destructive";
  if (diff < 30) return "text-amber-600";
  return "text-muted-foreground";
}

type TabKey = "zone" | "km" | "majorations" | "simulateur" | "parametres";
const TABS: { key: TabKey; label: string }[] = [
  { key: "zone", label: "Tarifs par zone" },
  { key: "km", label: "Tarifs au km" },
  { key: "majorations", label: "Majorations" },
  { key: "simulateur", label: "Simulateur" },
  { key: "parametres", label: "Paramètres" },
];

export default function GrilleTarifairePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = user?.role === "DG" || user?.role === "COMMERCIAL";
  const g = useGrilleTarifaire();

  // Maps dynamiques depuis la config DB
  const zonesActives = useMemo(() => g.zonesConfig.filter((z) => z.actif), [g.zonesConfig]);
  const tonnagesActifs = useMemo(() => g.tonnagesConfig.filter((t) => t.actif), [g.tonnagesConfig]);
  const TONNAGES = useMemo(() => tonnagesActifs.map((t) => t.label), [tonnagesActifs]);
  const ZONE_LABELS = useMemo(() => Object.fromEntries(g.zonesConfig.map((z) => [z.code, z.label])) as Record<string, string>, [g.zonesConfig]);
  const ZONE_FILTER_LABELS = ZONE_LABELS;
  const ZONE_BADGE = useMemo(() => Object.fromEntries(
    g.zonesConfig.map((z) => [z.code, `text-white`])
  ) as Record<string, string>, [g.zonesConfig]);
  const ZONE_COLOR = useMemo(() => Object.fromEntries(g.zonesConfig.map((z) => [z.code, z.couleur])) as Record<string, string>, [g.zonesConfig]);

  const tonnageBorneHaute = (label: string): number => {
    const t = g.tonnagesConfig.find((x) => x.label === label);
    return t?.borne_haute || 40;
  };
  const calcTarifParTonne = (tarif: number, tonnage: string): number =>
    Math.round(tarif / tonnageBorneHaute(tonnage));

  const [activeTab, setActiveTab] = useState<TabKey>("zone");
  const [searchQuery, setSearchQuery] = useState("");
  const [filtreZone, setFiltreZone] = useState("ALL");
  const [filtreType, setFiltreType] = useState("ALL");
  const [filtreTonnage, setFiltreTonnage] = useState("ALL");

  const [editId, setEditId] = useState<string | null>(null);
  const [editBuf, setEditBuf] = useState<TarifZone | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);

  const tarifs = g.tarifsZone;
  const tarifMin = useMemo(() => tarifs.length ? tarifs.reduce((a, b) => a.tarif < b.tarif ? a : b) : null, [tarifs]);
  const tarifMax = useMemo(() => tarifs.length ? tarifs.reduce((a, b) => a.tarif > b.tarif ? a : b) : null, [tarifs]);
  const nbZones = useMemo(() => new Set(tarifs.map((t) => t.zone)).size, [tarifs]);
  const nbTypes = useMemo(() => new Set(tarifs.map((t) => t.type)).size, [tarifs]);

  const filtreActif = searchQuery !== "" || filtreZone !== "ALL" || filtreType !== "ALL" || filtreTonnage !== "ALL";

  const tarifsFiltres = useMemo(() => tarifs.filter((t) => {
    if (searchQuery && !t.destination.toLowerCase().includes(searchQuery.toLowerCase()) && !t.zone.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filtreZone !== "ALL" && t.zone !== filtreZone) return false;
    if (filtreType !== "ALL" && t.type !== filtreType) return false;
    if (filtreTonnage !== "ALL" && t.tonnage !== filtreTonnage) return false;
    return true;
  }), [tarifs, searchQuery, filtreZone, filtreType, filtreTonnage]);

  const tarifsParZone = useMemo(() => {
    const map = new Map<ZoneCode, TarifZone[]>();
    tarifsFiltres.forEach((t) => {
      if (!map.has(t.zone)) map.set(t.zone, []);
      map.get(t.zone)!.push(t);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [tarifsFiltres]);

  const startEdit = (t: TarifZone) => { setEditId(t.id); setEditBuf({ ...t }); };
  const cancelEdit = () => { setEditId(null); setEditBuf(null); };
  const saveEdit = async () => {
    if (!editBuf) return;
    const { id, ...patch } = editBuf;
    await g.updateTarifZone(id, patch);
    cancelEdit();
  };
  const updateTarifInline = async (id: string, value: number) => {
    await g.updateTarifZone(id, { tarif: value });
  };
  const resetFilters = () => { setSearchQuery(""); setFiltreZone("ALL"); setFiltreType("ALL"); setFiltreTonnage("ALL"); };

  if (g.loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-[18px] font-medium text-foreground">Grille tarifaire</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Tarifs par zone, tonnage et type de transport · dernière mise à jour {new Date().toLocaleDateString("fr-FR")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => toast("Import CSV à venir")}>
            <Upload className="h-4 w-4" /> Importer CSV
          </Button>
          <Button variant="ghost" size="sm" onClick={() => toast("Export généré")}>
            <Download className="h-4 w-4" /> Exporter
          </Button>
          {canManage && (
            <Button size="sm" onClick={() => setShowDrawer(true)}>
              <Plus className="h-4 w-4" /> Nouveau tarif
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Tarifs actifs" value={String(tarifs.length)} sub={`${nbZones} zones · ${nbTypes} types`} />
        <KpiCard title="Tarif minimum" value={new Intl.NumberFormat("fr-FR").format(tarifMin?.tarif ?? 0)} sub={`FCFA · Zone ${tarifMin?.zone ?? ""} ${TYPE_LABEL[tarifMin?.type ?? "standard"]}`} valueColor />
        <KpiCard title="Tarif maximum" value={new Intl.NumberFormat("fr-FR").format(tarifMax?.tarif ?? 0)} sub={`FCFA · Zone ${tarifMax?.zone ?? ""} ${TYPE_LABEL[tarifMax?.type ?? "standard"]}`} valueColor />
        <KpiCard title="Dernière modification" value={new Date().toLocaleDateString("fr-FR")} sub={user?.email ? `par ${user.email}` : "par Admin"} small />
      </div>

      <div className="flex items-center gap-1 border-b">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={cn("px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors",
              activeTab === t.key ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "zone" && (
        <div className="space-y-6">
          <Card>
            <CardContent className="flex flex-wrap items-center gap-3 p-4">
              <div className="relative flex-1 min-w-[220px] max-w-[360px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Rechercher une destination, zone..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
              </div>
              <Select value={filtreZone} onValueChange={setFiltreZone}>
                <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Toutes les zones</SelectItem>
                  {(Object.keys(ZONE_FILTER_LABELS) as ZoneCode[]).map((z) => <SelectItem key={z} value={z}>{ZONE_FILTER_LABELS[z]}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filtreType} onValueChange={setFiltreType}>
                <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous les types</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="express">Express</SelectItem>
                  <SelectItem value="special">Spécial</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filtreTonnage} onValueChange={setFiltreTonnage}>
                <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous les tonnages</SelectItem>
                  {TONNAGES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              {filtreActif && <Button variant="ghost" size="sm" onClick={resetFilters}>Réinitialiser</Button>}
            </CardContent>
          </Card>

          {tarifsParZone.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Aucun tarif trouvé</CardContent></Card>
          ) : tarifsParZone.map(([zone, list]) => (
            <div key={zone} className="space-y-2">
              <div className="text-[11px] uppercase tracking-[0.5px] text-muted-foreground font-medium">{ZONE_LABELS[zone]}</div>
              <Card className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#F9FAFB] text-[10px] uppercase text-muted-foreground">
                      <th className="text-left px-4 py-2.5 font-medium">Destination</th>
                      <th className="text-left px-4 py-2.5 font-medium">Zone</th>
                      <th className="text-left px-4 py-2.5 font-medium">Tonnage</th>
                      <th className="text-left px-4 py-2.5 font-medium">Type</th>
                      <th className="text-right px-4 py-2.5 font-medium">Tarif (FCFA)</th>
                      <th className="text-right px-4 py-2.5 font-medium">Tarif/Tonne</th>
                      <th className="text-left px-4 py-2.5 font-medium">Validité</th>
                      {canManage && <th className="text-right px-4 py-2.5 font-medium">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((t) => {
                      const isEditing = editId === t.id && editBuf;
                      const row = isEditing ? editBuf! : t;
                      return (
                        <tr key={t.id} className="border-t hover:bg-[#F9FAFB]">
                          <td className="px-4 py-2.5">
                            {isEditing ? <Input value={row.destination} onChange={(e) => setEditBuf({ ...row, destination: e.target.value })} className="h-8" /> : (
                              <><div className="text-[12px] font-medium">{t.destination}</div><div className="text-[10px] text-muted-foreground">~{t.km} km</div></>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            {isEditing ? (
                              <Select value={row.zone} onValueChange={(v) => setEditBuf({ ...row, zone: v as ZoneCode })}>
                                <SelectTrigger className="h-8 w-[80px]"><SelectValue /></SelectTrigger>
                                <SelectContent>{(["A", "B", "C", "D"] as ZoneCode[]).map((z) => <SelectItem key={z} value={z}>Zone {z}</SelectItem>)}</SelectContent>
                              </Select>
                            ) : <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium", ZONE_BADGE[t.zone])}>Zone {t.zone}</span>}
                          </td>
                          <td className="px-4 py-2.5 text-[12px] text-muted-foreground">
                            {isEditing ? (
                              <Select value={row.tonnage} onValueChange={(v) => setEditBuf({ ...row, tonnage: v })}>
                                <SelectTrigger className="h-8 w-[110px]"><SelectValue /></SelectTrigger>
                                <SelectContent>{TONNAGES.map((tn) => <SelectItem key={tn} value={tn}>{tn}</SelectItem>)}</SelectContent>
                              </Select>
                            ) : t.tonnage}
                          </td>
                          <td className="px-4 py-2.5">
                            {isEditing ? (
                              <Select value={row.type} onValueChange={(v) => setEditBuf({ ...row, type: v as TypeTransport })}>
                                <SelectTrigger className="h-8 w-[110px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="standard">Standard</SelectItem>
                                  <SelectItem value="express">Express</SelectItem>
                                  <SelectItem value="special">Spécial</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium", TYPE_BADGE[t.type])}>{TYPE_LABEL[t.type]}</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {isEditing ? (
                              <Input type="number" value={row.tarif} onChange={(e) => setEditBuf({ ...row, tarif: Number(e.target.value) })} className="h-8 text-right" />
                            ) : canManage ? <InlineTarifInput value={t.tarif} onChange={(v) => updateTarifInline(t.id, v)} /> : <span className="font-medium">{formatFCFA(t.tarif)}</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right text-[11px] text-muted-foreground">
                            {new Intl.NumberFormat("fr-FR").format(calcTarifParTonne(row.tarif, row.tonnage))} FCFA/T
                          </td>
                          <td className={cn("px-4 py-2.5 text-[11px]", validityClass(t.validite))}>
                            {isEditing ? <Input type="date" value={row.validite} onChange={(e) => setEditBuf({ ...row, validite: e.target.value })} className="h-8 w-[140px]" /> : toFr(t.validite)}
                          </td>
                          {canManage && (
                            <td className="px-4 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {isEditing ? (
                                  <>
                                    <Button size="icon" variant="ghost" className="h-[26px] w-[26px] text-primary" onClick={saveEdit}><Check className="h-4 w-4" /></Button>
                                    <Button size="icon" variant="ghost" className="h-[26px] w-[26px]" onClick={cancelEdit}><X className="h-4 w-4" /></Button>
                                  </>
                                ) : (
                                  <>
                                    <Button size="icon" variant="ghost" className="h-[26px] w-[26px]" onClick={() => startEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                                    <Button size="icon" variant="ghost" className="h-[26px] w-[26px] text-destructive" onClick={() => setConfirmDelete(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                  </>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            </div>
          ))}
        </div>
      )}

      {activeTab === "km" && <TarifsKmTab tarifs={g.tarifsKm} canManage={canManage} onAdd={g.addTarifKm} onUpdate={g.updateTarifKm} onDelete={g.deleteTarifKm} />}
      {activeTab === "majorations" && (
        <MajorationsTab
          majorations={g.majorations} frais={g.frais} canManage={canManage}
          onAddMaj={g.addMajoration} onUpdateMaj={g.updateMajoration} onDeleteMaj={g.deleteMajoration}
          onAddFrais={g.addFrais} onUpdateFrais={g.updateFrais} onDeleteFrais={g.deleteFrais}
        />
      )}
      {activeTab === "simulateur" && (
        <SimulateurTab tarifs={g.tarifsZone} majorations={g.majorations} frais={g.frais} tonnages={TONNAGES}
          onCreateDevis={(d) => navigate("/devis/nouveau", { state: d })} />
      )}
      {activeTab === "parametres" && (
        <ParametresTab
          zones={g.zonesConfig} tonnages={g.tonnagesConfig} canManage={canManage}
          onAddZone={g.addZone} onUpdateZone={g.updateZone} onDeleteZone={g.deleteZone}
          onAddTonnage={g.addTonnage} onUpdateTonnage={g.updateTonnage} onDeleteTonnage={g.deleteTonnage}
        />
      )}

      <NouveauTarifDrawer open={showDrawer} onOpenChange={setShowDrawer}
        zones={g.zonesConfig} tonnages={tonnagesActifs}
        onSave={async (t) => { await g.addTarifZone(t); setShowDrawer(false); }} />

      <AlertDialog open={confirmDelete !== null} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce tarif ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (confirmDelete) g.deleteTarifZone(confirmDelete); setConfirmDelete(null); }}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function KpiCard({ title, value, sub, valueColor, small }: { title: string; value: string; sub: string; valueColor?: boolean; small?: boolean }) {
  return (
    <Card><CardContent className="p-4">
      <div className="text-[12px] text-muted-foreground">{title}</div>
      <div className={cn("mt-1.5 font-semibold", small ? "text-[14px]" : "text-2xl", valueColor && "text-primary")}>{value}</div>
      <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>
    </CardContent></Card>
  );
}

function InlineTarifInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  if (editing) {
    return (
      <input autoFocus type="number" value={draft} onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { onChange(Number(draft) || 0); setEditing(false); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { onChange(Number(draft) || 0); setEditing(false); }
          if (e.key === "Escape") { setDraft(String(value)); setEditing(false); }
        }}
        className="w-full text-right border border-primary rounded px-2 py-1 text-sm focus:outline-none" />
    );
  }
  return (
    <button onClick={() => { setDraft(String(value)); setEditing(true); }}
      className="w-full text-right px-2 py-1 rounded border border-transparent hover:border-input text-sm font-medium">
      {formatFCFA(value)}
    </button>
  );
}

function TarifsKmTab({ tarifs, canManage, onAdd, onUpdate, onDelete }: {
  tarifs: TarifKm[]; canManage: boolean;
  onAdd: (data: Omit<TarifKm, "id">) => Promise<void>;
  onUpdate: (id: string, p: Partial<TarifKm>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [buf, setBuf] = useState<TarifKm | null>(null);
  const [adding, setAdding] = useState(false);
  const [newRow, setNewRow] = useState<Omit<TarifKm, "id">>({ vehicule: "", tonnage_max: 0, prix_km: 0, forfait_depart: 0, validite: "2026-12-31" });
  const start = (t: TarifKm) => { setEditId(t.id); setBuf({ ...t }); };
  const cancel = () => { setEditId(null); setBuf(null); };
  const save = async () => { if (!buf) return; const { id, ...p } = buf; await onUpdate(id, p); cancel(); };
  const addRow = async () => {
    if (!newRow.vehicule.trim()) return toast.error("Type de véhicule requis");
    await onAdd(newRow);
    setNewRow({ vehicule: "", tonnage_max: 0, prix_km: 0, forfait_depart: 0, validite: "2026-12-31" });
    setAdding(false);
  };

  return (
    <div className="space-y-3">
      {canManage && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Ajouter un tarif au km</Button>
        </div>
      )}
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F9FAFB] text-[10px] uppercase text-muted-foreground">
              <th className="text-left px-4 py-2.5 font-medium">Type de véhicule</th>
              <th className="text-left px-4 py-2.5 font-medium">Tonnage max</th>
              <th className="text-right px-4 py-2.5 font-medium">Prix/km (FCFA)</th>
              <th className="text-right px-4 py-2.5 font-medium">Forfait départ</th>
              <th className="text-left px-4 py-2.5 font-medium">Validité</th>
              {canManage && <th className="text-right px-4 py-2.5 font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {adding && (
              <tr className="border-t bg-[#F0FDF4]">
                <td className="px-4 py-2.5"><Input className="h-8" placeholder="Ex: Porteur 10T" value={newRow.vehicule} onChange={(e) => setNewRow({ ...newRow, vehicule: e.target.value })} /></td>
                <td className="px-4 py-2.5"><Input type="number" className="h-8 w-20" value={newRow.tonnage_max} onChange={(e) => setNewRow({ ...newRow, tonnage_max: Number(e.target.value) })} /></td>
                <td className="px-4 py-2.5 text-right"><Input type="number" className="h-8 text-right" value={newRow.prix_km} onChange={(e) => setNewRow({ ...newRow, prix_km: Number(e.target.value) })} /></td>
                <td className="px-4 py-2.5 text-right"><Input type="number" className="h-8 text-right" value={newRow.forfait_depart} onChange={(e) => setNewRow({ ...newRow, forfait_depart: Number(e.target.value) })} /></td>
                <td className="px-4 py-2.5"><Input type="date" className="h-8 w-36" value={newRow.validite} onChange={(e) => setNewRow({ ...newRow, validite: e.target.value })} /></td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-[26px] w-[26px] text-primary" onClick={addRow}><Check className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-[26px] w-[26px]" onClick={() => setAdding(false)}><X className="h-4 w-4" /></Button>
                  </div>
                </td>
              </tr>
            )}
            {tarifs.map((t) => {
              const editing = editId === t.id && buf;
              const row = editing ? buf! : t;
              return (
                <tr key={t.id} className="border-t hover:bg-[#F9FAFB]">
                  <td className="px-4 py-2.5 font-medium">{editing ? <Input className="h-8" value={row.vehicule} onChange={(e) => setBuf({ ...row, vehicule: e.target.value })} /> : t.vehicule}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{editing ? <Input type="number" className="h-8 w-20" value={row.tonnage_max} onChange={(e) => setBuf({ ...row, tonnage_max: Number(e.target.value) })} /> : `${t.tonnage_max}T`}</td>
                  <td className="px-4 py-2.5 text-right">{editing ? <Input type="number" className="h-8 text-right" value={row.prix_km} onChange={(e) => setBuf({ ...row, prix_km: Number(e.target.value) })} /> : `${new Intl.NumberFormat("fr-FR").format(t.prix_km)} F/km`}</td>
                  <td className="px-4 py-2.5 text-right">{editing ? <Input type="number" className="h-8 text-right" value={row.forfait_depart} onChange={(e) => setBuf({ ...row, forfait_depart: Number(e.target.value) })} /> : `${new Intl.NumberFormat("fr-FR").format(t.forfait_depart)} F`}</td>
                  <td className={cn("px-4 py-2.5 text-[11px]", validityClass(t.validite))}>{editing ? <Input type="date" className="h-8 w-36" value={row.validite} onChange={(e) => setBuf({ ...row, validite: e.target.value })} /> : toFr(t.validite)}</td>
                  {canManage && (
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {editing ? (
                          <>
                            <Button size="icon" variant="ghost" className="h-[26px] w-[26px] text-primary" onClick={save}><Check className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" className="h-[26px] w-[26px]" onClick={cancel}><X className="h-4 w-4" /></Button>
                          </>
                        ) : (
                          <>
                            <Button size="icon" variant="ghost" className="h-[26px] w-[26px]" onClick={() => start(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="h-[26px] w-[26px] text-destructive" onClick={() => onDelete(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function MajorationsTab({ majorations, frais, canManage, onAddMaj, onUpdateMaj, onDeleteMaj, onAddFrais, onUpdateFrais, onDeleteFrais }: {
  majorations: Majoration[]; frais: FraisFixe[]; canManage: boolean;
  onAddMaj: (data: Omit<Majoration, "id">) => Promise<void>;
  onUpdateMaj: (id: string, p: Partial<Majoration>) => Promise<void>;
  onDeleteMaj: (id: string) => Promise<void>;
  onAddFrais: (data: Omit<FraisFixe, "id">) => Promise<void>;
  onUpdateFrais: (id: string, p: Partial<FraisFixe>) => Promise<void>;
  onDeleteFrais: (id: string) => Promise<void>;
}) {
  const [editMajId, setEditMajId] = useState<string | null>(null);
  const [bufMaj, setBufMaj] = useState<Majoration | null>(null);
  const [addingMaj, setAddingMaj] = useState(false);
  const [newMaj, setNewMaj] = useState<Omit<Majoration, "id">>({ motif: "", pct: 0, applicable: "Tous tarifs", actif: true });

  const [editFraisId, setEditFraisId] = useState<string | null>(null);
  const [bufFrais, setBufFrais] = useState<FraisFixe | null>(null);
  const [addingFrais, setAddingFrais] = useState(false);
  const [newFrais, setNewFrais] = useState<Omit<FraisFixe, "id">>({ designation: "", montant: 0, applicable: "Par trajet", actif: true });

  const startMaj = (m: Majoration) => { setEditMajId(m.id); setBufMaj({ ...m }); };
  const saveMaj = async () => { if (!bufMaj) return; const { id, ...p } = bufMaj; await onUpdateMaj(id, p); setEditMajId(null); setBufMaj(null); };
  const addMaj = async () => {
    if (!newMaj.motif.trim()) return toast.error("Motif requis");
    await onAddMaj(newMaj);
    setNewMaj({ motif: "", pct: 0, applicable: "Tous tarifs", actif: true });
    setAddingMaj(false);
  };

  const startFrais = (f: FraisFixe) => { setEditFraisId(f.id); setBufFrais({ ...f }); };
  const saveFrais = async () => { if (!bufFrais) return; const { id, ...p } = bufFrais; await onUpdateFrais(id, p); setEditFraisId(null); setBufFrais(null); };
  const addFrais = async () => {
    if (!newFrais.designation.trim()) return toast.error("Désignation requise");
    await onAddFrais(newFrais);
    setNewFrais({ designation: "", montant: 0, applicable: "Par trajet", actif: true });
    setAddingFrais(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] uppercase tracking-[0.5px] text-muted-foreground font-medium">Majorations en pourcentage</div>
          {canManage && <Button size="sm" variant="outline" onClick={() => setAddingMaj(true)}><Plus className="h-4 w-4" /> Ajouter</Button>}
        </div>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F9FAFB] text-[10px] uppercase text-muted-foreground">
                <th className="text-left px-4 py-2.5 font-medium">Motif</th>
                <th className="text-right px-4 py-2.5 font-medium">% appliqué</th>
                <th className="text-left px-4 py-2.5 font-medium">Applicable sur</th>
                <th className="text-left px-4 py-2.5 font-medium">Statut</th>
                {canManage && <th className="text-right px-4 py-2.5 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {addingMaj && (
                <tr className="border-t bg-[#F0FDF4]">
                  <td className="px-4 py-2.5"><Input className="h-8" placeholder="Ex: Carburant" value={newMaj.motif} onChange={(e) => setNewMaj({ ...newMaj, motif: e.target.value })} /></td>
                  <td className="px-4 py-2.5 text-right"><Input type="number" className="h-8 w-20 ml-auto text-right" value={newMaj.pct} onChange={(e) => setNewMaj({ ...newMaj, pct: Number(e.target.value) })} /></td>
                  <td className="px-4 py-2.5"><Input className="h-8" value={newMaj.applicable} onChange={(e) => setNewMaj({ ...newMaj, applicable: e.target.value })} /></td>
                  <td className="px-4 py-2.5"><Switch checked={newMaj.actif} onCheckedChange={(v) => setNewMaj({ ...newMaj, actif: v })} /></td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-[26px] w-[26px] text-primary" onClick={addMaj}><Check className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-[26px] w-[26px]" onClick={() => setAddingMaj(false)}><X className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              )}
              {majorations.map((m) => {
                const editing = editMajId === m.id && bufMaj;
                const row = editing ? bufMaj! : m;
                return (
                  <tr key={m.id} className="border-t hover:bg-[#F9FAFB]">
                    <td className="px-4 py-2.5 font-medium">{editing ? <Input className="h-8" value={row.motif} onChange={(e) => setBufMaj({ ...row, motif: e.target.value })} /> : m.motif}</td>
                    <td className="px-4 py-2.5 text-right text-primary font-medium">{editing ? <Input type="number" className="h-8 w-20 ml-auto text-right" value={row.pct} onChange={(e) => setBufMaj({ ...row, pct: Number(e.target.value) })} /> : `+${m.pct}%`}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{editing ? <Input className="h-8" value={row.applicable} onChange={(e) => setBufMaj({ ...row, applicable: e.target.value })} /> : m.applicable}</td>
                    <td className="px-4 py-2.5"><Switch checked={m.actif} disabled={!canManage} onCheckedChange={(v) => onUpdateMaj(m.id, { actif: v })} /></td>
                    {canManage && (
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {editing ? (
                            <>
                              <Button size="icon" variant="ghost" className="h-[26px] w-[26px] text-primary" onClick={saveMaj}><Check className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" className="h-[26px] w-[26px]" onClick={() => { setEditMajId(null); setBufMaj(null); }}><X className="h-4 w-4" /></Button>
                            </>
                          ) : (
                            <>
                              <Button size="icon" variant="ghost" className="h-[26px] w-[26px]" onClick={() => startMaj(m)}><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button size="icon" variant="ghost" className="h-[26px] w-[26px] text-destructive" onClick={() => onDeleteMaj(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] uppercase tracking-[0.5px] text-muted-foreground font-medium">Frais fixes additionnels</div>
          {canManage && <Button size="sm" variant="outline" onClick={() => setAddingFrais(true)}><Plus className="h-4 w-4" /> Ajouter</Button>}
        </div>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F9FAFB] text-[10px] uppercase text-muted-foreground">
                <th className="text-left px-4 py-2.5 font-medium">Désignation</th>
                <th className="text-right px-4 py-2.5 font-medium">Montant (FCFA)</th>
                <th className="text-left px-4 py-2.5 font-medium">Applicable sur</th>
                <th className="text-left px-4 py-2.5 font-medium">Statut</th>
                {canManage && <th className="text-right px-4 py-2.5 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {addingFrais && (
                <tr className="border-t bg-[#F0FDF4]">
                  <td className="px-4 py-2.5"><Input className="h-8" placeholder="Ex: Péage" value={newFrais.designation} onChange={(e) => setNewFrais({ ...newFrais, designation: e.target.value })} /></td>
                  <td className="px-4 py-2.5 text-right"><Input type="number" className="h-8 text-right" value={newFrais.montant} onChange={(e) => setNewFrais({ ...newFrais, montant: Number(e.target.value) })} /></td>
                  <td className="px-4 py-2.5"><Input className="h-8" value={newFrais.applicable} onChange={(e) => setNewFrais({ ...newFrais, applicable: e.target.value })} /></td>
                  <td className="px-4 py-2.5"><Switch checked={newFrais.actif} onCheckedChange={(v) => setNewFrais({ ...newFrais, actif: v })} /></td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-[26px] w-[26px] text-primary" onClick={addFrais}><Check className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-[26px] w-[26px]" onClick={() => setAddingFrais(false)}><X className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              )}
              {frais.map((f) => {
                const editing = editFraisId === f.id && bufFrais;
                const row = editing ? bufFrais! : f;
                return (
                  <tr key={f.id} className="border-t hover:bg-[#F9FAFB]">
                    <td className="px-4 py-2.5 font-medium">{editing ? <Input className="h-8" value={row.designation} onChange={(e) => setBufFrais({ ...row, designation: e.target.value })} /> : f.designation}</td>
                    <td className="px-4 py-2.5 text-right">{editing ? <Input type="number" className="h-8 text-right" value={row.montant} onChange={(e) => setBufFrais({ ...row, montant: Number(e.target.value) })} /> : `${new Intl.NumberFormat("fr-FR").format(f.montant)} F`}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{editing ? <Input className="h-8" value={row.applicable} onChange={(e) => setBufFrais({ ...row, applicable: e.target.value })} /> : f.applicable}</td>
                    <td className="px-4 py-2.5"><Switch checked={f.actif} disabled={!canManage} onCheckedChange={(v) => onUpdateFrais(f.id, { actif: v })} /></td>
                    {canManage && (
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {editing ? (
                            <>
                              <Button size="icon" variant="ghost" className="h-[26px] w-[26px] text-primary" onClick={saveFrais}><Check className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" className="h-[26px] w-[26px]" onClick={() => { setEditFraisId(null); setBufFrais(null); }}><X className="h-4 w-4" /></Button>
                            </>
                          ) : (
                            <>
                              <Button size="icon" variant="ghost" className="h-[26px] w-[26px]" onClick={() => startFrais(f)}><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button size="icon" variant="ghost" className="h-[26px] w-[26px] text-destructive" onClick={() => onDeleteFrais(f.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

function ParametresTab({ zones, tonnages, canManage, onAddZone, onUpdateZone, onDeleteZone, onAddTonnage, onUpdateTonnage, onDeleteTonnage }: {
  zones: ZoneConfig[]; tonnages: TonnageConfig[]; canManage: boolean;
  onAddZone: (d: Omit<ZoneConfig, "id">) => Promise<void>;
  onUpdateZone: (id: string, p: Partial<ZoneConfig>) => Promise<void>;
  onDeleteZone: (id: string) => Promise<void>;
  onAddTonnage: (d: Omit<TonnageConfig, "id">) => Promise<void>;
  onUpdateTonnage: (id: string, p: Partial<TonnageConfig>) => Promise<void>;
  onDeleteTonnage: (id: string) => Promise<void>;
}) {
  const [editZoneId, setEditZoneId] = useState<string | null>(null);
  const [bufZone, setBufZone] = useState<ZoneConfig | null>(null);
  const [addingZone, setAddingZone] = useState(false);
  const [newZone, setNewZone] = useState<Omit<ZoneConfig, "id">>({ code: "", label: "", couleur: "#10B981", ordre: 0, actif: true });

  const [editTonId, setEditTonId] = useState<string | null>(null);
  const [bufTon, setBufTon] = useState<TonnageConfig | null>(null);
  const [addingTon, setAddingTon] = useState(false);
  const [newTon, setNewTon] = useState<Omit<TonnageConfig, "id">>({ label: "", borne_haute: 0, ordre: 0, actif: true });

  const saveZone = async () => { if (!bufZone) return; const { id, ...p } = bufZone; await onUpdateZone(id, p); setEditZoneId(null); setBufZone(null); };
  const addZone = async () => {
    if (!newZone.code.trim() || !newZone.label.trim()) return toast.error("Code et libellé requis");
    await onAddZone(newZone);
    setNewZone({ code: "", label: "", couleur: "#10B981", ordre: 0, actif: true });
    setAddingZone(false);
  };
  const saveTon = async () => { if (!bufTon) return; const { id, ...p } = bufTon; await onUpdateTonnage(id, p); setEditTonId(null); setBufTon(null); };
  const addTon = async () => {
    if (!newTon.label.trim()) return toast.error("Libellé requis");
    await onAddTonnage(newTon);
    setNewTon({ label: "", borne_haute: 0, ordre: 0, actif: true });
    setAddingTon(false);
  };

  return (
    <div className="space-y-6">
      {/* Zones */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-[13px] font-medium">Zones géographiques</div>
            <div className="text-[12px] text-muted-foreground">Définissez les zones utilisées pour catégoriser vos tarifs.</div>
          </div>
          {canManage && <Button size="sm" onClick={() => setAddingZone(true)}><Plus className="h-4 w-4" /> Ajouter une zone</Button>}
        </div>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F9FAFB] text-[10px] uppercase text-muted-foreground">
                <th className="text-left px-4 py-2.5 font-medium w-[80px]">Code</th>
                <th className="text-left px-4 py-2.5 font-medium">Libellé</th>
                <th className="text-left px-4 py-2.5 font-medium w-[120px]">Couleur</th>
                <th className="text-right px-4 py-2.5 font-medium w-[80px]">Ordre</th>
                <th className="text-left px-4 py-2.5 font-medium w-[80px]">Actif</th>
                {canManage && <th className="text-right px-4 py-2.5 font-medium w-[100px]">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {addingZone && (
                <tr className="border-t bg-[#F0FDF4]">
                  <td className="px-4 py-2.5"><Input className="h-8" placeholder="A" value={newZone.code} onChange={(e) => setNewZone({ ...newZone, code: e.target.value })} /></td>
                  <td className="px-4 py-2.5"><Input className="h-8" placeholder="Zone A — ..." value={newZone.label} onChange={(e) => setNewZone({ ...newZone, label: e.target.value })} /></td>
                  <td className="px-4 py-2.5"><Input type="color" className="h-8 w-16 p-1" value={newZone.couleur} onChange={(e) => setNewZone({ ...newZone, couleur: e.target.value })} /></td>
                  <td className="px-4 py-2.5 text-right"><Input type="number" className="h-8 w-16 ml-auto text-right" value={newZone.ordre} onChange={(e) => setNewZone({ ...newZone, ordre: Number(e.target.value) })} /></td>
                  <td className="px-4 py-2.5"><Switch checked={newZone.actif} onCheckedChange={(v) => setNewZone({ ...newZone, actif: v })} /></td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-[26px] w-[26px] text-primary" onClick={addZone}><Check className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-[26px] w-[26px]" onClick={() => setAddingZone(false)}><X className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              )}
              {zones.map((z) => {
                const editing = editZoneId === z.id && bufZone;
                const row = editing ? bufZone! : z;
                return (
                  <tr key={z.id} className="border-t hover:bg-[#F9FAFB]">
                    <td className="px-4 py-2.5 font-medium">{editing ? <Input className="h-8" value={row.code} onChange={(e) => setBufZone({ ...row, code: e.target.value })} /> : z.code}</td>
                    <td className="px-4 py-2.5">{editing ? <Input className="h-8" value={row.label} onChange={(e) => setBufZone({ ...row, label: e.target.value })} /> : z.label}</td>
                    <td className="px-4 py-2.5">
                      {editing ? <Input type="color" className="h-8 w-16 p-1" value={row.couleur} onChange={(e) => setBufZone({ ...row, couleur: e.target.value })} /> : (
                        <div className="flex items-center gap-2"><div className="h-4 w-8 rounded border" style={{ background: z.couleur }} /><span className="text-[11px] text-muted-foreground">{z.couleur}</span></div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">{editing ? <Input type="number" className="h-8 w-16 ml-auto text-right" value={row.ordre} onChange={(e) => setBufZone({ ...row, ordre: Number(e.target.value) })} /> : z.ordre}</td>
                    <td className="px-4 py-2.5"><Switch checked={z.actif} disabled={!canManage} onCheckedChange={(v) => onUpdateZone(z.id, { actif: v })} /></td>
                    {canManage && (
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {editing ? (
                            <>
                              <Button size="icon" variant="ghost" className="h-[26px] w-[26px] text-primary" onClick={saveZone}><Check className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" className="h-[26px] w-[26px]" onClick={() => { setEditZoneId(null); setBufZone(null); }}><X className="h-4 w-4" /></Button>
                            </>
                          ) : (
                            <>
                              <Button size="icon" variant="ghost" className="h-[26px] w-[26px]" onClick={() => { setEditZoneId(z.id); setBufZone({ ...z }); }}><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button size="icon" variant="ghost" className="h-[26px] w-[26px] text-destructive" onClick={() => onDeleteZone(z.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Tonnages */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-[13px] font-medium">Tranches de tonnage</div>
            <div className="text-[12px] text-muted-foreground">La borne haute sert à calculer le tarif/tonne.</div>
          </div>
          {canManage && <Button size="sm" onClick={() => setAddingTon(true)}><Plus className="h-4 w-4" /> Ajouter un tonnage</Button>}
        </div>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F9FAFB] text-[10px] uppercase text-muted-foreground">
                <th className="text-left px-4 py-2.5 font-medium">Libellé</th>
                <th className="text-right px-4 py-2.5 font-medium w-[140px]">Borne haute (T)</th>
                <th className="text-right px-4 py-2.5 font-medium w-[80px]">Ordre</th>
                <th className="text-left px-4 py-2.5 font-medium w-[80px]">Actif</th>
                {canManage && <th className="text-right px-4 py-2.5 font-medium w-[100px]">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {addingTon && (
                <tr className="border-t bg-[#F0FDF4]">
                  <td className="px-4 py-2.5"><Input className="h-8" placeholder="Ex: 10–20T" value={newTon.label} onChange={(e) => setNewTon({ ...newTon, label: e.target.value })} /></td>
                  <td className="px-4 py-2.5 text-right"><Input type="number" className="h-8 w-24 ml-auto text-right" value={newTon.borne_haute} onChange={(e) => setNewTon({ ...newTon, borne_haute: Number(e.target.value) })} /></td>
                  <td className="px-4 py-2.5 text-right"><Input type="number" className="h-8 w-16 ml-auto text-right" value={newTon.ordre} onChange={(e) => setNewTon({ ...newTon, ordre: Number(e.target.value) })} /></td>
                  <td className="px-4 py-2.5"><Switch checked={newTon.actif} onCheckedChange={(v) => setNewTon({ ...newTon, actif: v })} /></td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-[26px] w-[26px] text-primary" onClick={addTon}><Check className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-[26px] w-[26px]" onClick={() => setAddingTon(false)}><X className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              )}
              {tonnages.map((t) => {
                const editing = editTonId === t.id && bufTon;
                const row = editing ? bufTon! : t;
                return (
                  <tr key={t.id} className="border-t hover:bg-[#F9FAFB]">
                    <td className="px-4 py-2.5 font-medium">{editing ? <Input className="h-8" value={row.label} onChange={(e) => setBufTon({ ...row, label: e.target.value })} /> : t.label}</td>
                    <td className="px-4 py-2.5 text-right">{editing ? <Input type="number" className="h-8 w-24 ml-auto text-right" value={row.borne_haute} onChange={(e) => setBufTon({ ...row, borne_haute: Number(e.target.value) })} /> : t.borne_haute}</td>
                    <td className="px-4 py-2.5 text-right">{editing ? <Input type="number" className="h-8 w-16 ml-auto text-right" value={row.ordre} onChange={(e) => setBufTon({ ...row, ordre: Number(e.target.value) })} /> : t.ordre}</td>
                    <td className="px-4 py-2.5"><Switch checked={t.actif} disabled={!canManage} onCheckedChange={(v) => onUpdateTonnage(t.id, { actif: v })} /></td>
                    {canManage && (
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {editing ? (
                            <>
                              <Button size="icon" variant="ghost" className="h-[26px] w-[26px] text-primary" onClick={saveTon}><Check className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" className="h-[26px] w-[26px]" onClick={() => { setEditTonId(null); setBufTon(null); }}><X className="h-4 w-4" /></Button>
                            </>
                          ) : (
                            <>
                              <Button size="icon" variant="ghost" className="h-[26px] w-[26px]" onClick={() => { setEditTonId(t.id); setBufTon({ ...t }); }}><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button size="icon" variant="ghost" className="h-[26px] w-[26px] text-destructive" onClick={() => onDeleteTonnage(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

function SimulateurTab({ tarifs, majorations, frais, tonnages, onCreateDevis }: {
  tarifs: TarifZone[]; majorations: Majoration[]; frais: FraisFixe[]; tonnages: string[];
  onCreateDevis: (d: { destination: string; montant: number; type: TypeTransport }) => void;
}) {
  const destinations = useMemo(() => Array.from(new Set(tarifs.map((t) => t.destination))).sort(), [tarifs]);
  const majActives = useMemo(() => majorations.filter((m) => m.actif), [majorations]);
  const fraisActifs = useMemo(() => frais.filter((f) => f.actif), [frais]);

  const [destination, setDestination] = useState("");
  const [type, setType] = useState<TypeTransport | "">("");
  const [tonnage, setTonnage] = useState("");
  const [selMaj, setSelMaj] = useState<string[]>([]);
  const [selFrais, setSelFrais] = useState<string[]>([]);
  const [nbTrajets, setNbTrajets] = useState(1);

  const tarifBase = useMemo(() => {
    if (!destination || !type || !tonnage) return null;
    return tarifs.find((t) => t.destination === destination && t.type === type && t.tonnage === tonnage) ?? null;
  }, [destination, type, tonnage, tarifs]);

  const result = useMemo(() => {
    if (!tarifBase) return null;
    const base = tarifBase.tarif;
    const majDetail = majActives.filter((m) => selMaj.includes(m.id)).map((m) => ({ id: m.id, motif: m.motif, pct: m.pct, montant: Math.round(base * (m.pct / 100)) }));
    const fraisDetail = fraisActifs.filter((f) => selFrais.includes(f.id)).map((f) => ({ id: f.id, designation: f.designation, montant: f.montant }));
    const totalMaj = majDetail.reduce((s, m) => s + m.montant, 0);
    const totalFrais = fraisDetail.reduce((s, f) => s + f.montant, 0);
    const sousTotal = base + totalMaj + totalFrais;
    const tva = Math.round(sousTotal * 0.18);
    const totalTTC = sousTotal + tva;
    return { base, majDetail, fraisDetail, sousTotal, tva, totalTTC, totalNTrajets: totalTTC * nbTrajets };
  }, [tarifBase, majActives, fraisActifs, selMaj, selFrais, nbTrajets]);

  const toggle = (arr: string[], setArr: (v: string[]) => void, id: string) =>
    setArr(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  const noTarif = destination && type && tonnage && !tarifBase;

  return (
    <div className="flex justify-center">
      <Card className="w-full max-w-[680px]">
        <CardContent className="p-6 space-y-6">
          <div>
            <h3 className="text-base font-medium">Simuler un tarif</h3>
            <p className="text-[13px] text-muted-foreground mt-1">Calculez automatiquement le tarif à appliquer avant de créer un devis.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Destination</Label>
              <Select value={destination} onValueChange={setDestination}>
                <SelectTrigger><SelectValue placeholder="Choisir une destination..." /></SelectTrigger>
                <SelectContent>{destinations.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type de transport</Label>
              <Select value={type} onValueChange={(v) => setType(v as TypeTransport)}>
                <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="express">Express</SelectItem>
                  <SelectItem value="special">Spécial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tranche de tonnage</Label>
              <Select value={tonnage} onValueChange={setTonnage}>
                <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>{tonnages.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nombre de trajets</Label>
              <Input type="number" min={1} value={nbTrajets} onChange={(e) => setNbTrajets(Math.max(1, Number(e.target.value) || 1))} />
            </div>
            <div>
              <Label>Majorations actives</Label>
              <div className="space-y-2 mt-2 border rounded-md p-3 max-h-40 overflow-y-auto">
                {majActives.length === 0 && <div className="text-xs text-muted-foreground">Aucune</div>}
                {majActives.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={selMaj.includes(m.id)} onCheckedChange={() => toggle(selMaj, setSelMaj, m.id)} />
                    <span className="flex-1">{m.motif}</span>
                    <span className="text-xs text-muted-foreground">+{m.pct}%</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Frais additionnels</Label>
              <div className="space-y-2 mt-2 border rounded-md p-3 max-h-40 overflow-y-auto">
                {fraisActifs.length === 0 && <div className="text-xs text-muted-foreground">Aucun</div>}
                {fraisActifs.map((f) => (
                  <label key={f.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={selFrais.includes(f.id)} onCheckedChange={() => toggle(selFrais, setSelFrais, f.id)} />
                    <span className="flex-1">{f.designation}</span>
                    <span className="text-xs text-muted-foreground">{new Intl.NumberFormat("fr-FR").format(f.montant)} F</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {noTarif && (
            <div className="text-amber-600 text-sm bg-amber-50 border border-amber-200 rounded-md p-3">
              Aucun tarif défini pour cette combinaison. Contactez l'administration.
            </div>
          )}

          {result && (
            <div className="rounded-[10px] p-5 bg-[#ECFDF5] border border-[#6EE7B7] space-y-3">
              <table className="w-full text-sm">
                <tbody>
                  <tr><td className="py-1">Tarif de base</td><td className="py-1 text-right">{formatFCFA(result.base)}</td></tr>
                  {result.majDetail.map((m) => (
                    <tr key={`m-${m.id}`}><td className="py-1">+ {m.motif} <span className="text-xs text-muted-foreground">(+{m.pct}%)</span></td><td className="py-1 text-right">{formatFCFA(m.montant)}</td></tr>
                  ))}
                  {result.fraisDetail.map((f) => (
                    <tr key={`f-${f.id}`}><td className="py-1">+ {f.designation}</td><td className="py-1 text-right">{formatFCFA(f.montant)}</td></tr>
                  ))}
                  <tr className="border-t"><td className="py-1.5 pt-2">Sous-total HT</td><td className="py-1.5 pt-2 text-right">{formatFCFA(result.sousTotal)}</td></tr>
                  <tr><td className="py-1">TVA 18%</td><td className="py-1 text-right">{formatFCFA(result.tva)}</td></tr>
                  <tr className="border-t"><td className="py-2 font-medium">TOTAL TTC</td><td className="py-2 text-right text-[22px] font-medium text-primary">{formatFCFA(result.totalTTC)}</td></tr>
                </tbody>
              </table>
              {nbTrajets > 1 && (
                <div className="text-sm pt-1">Total pour {nbTrajets} trajets : <span className="font-medium text-primary">{formatFCFA(result.totalNTrajets)}</span></div>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={async () => { await navigator.clipboard.writeText(String(result.totalTTC)); toast.success("Montant copié"); }}>
                  <Copy className="h-4 w-4" /> Copier le montant
                </Button>
                <Button size="sm" onClick={() => onCreateDevis({ destination, montant: result.totalTTC, type: type as TypeTransport })}>
                  <FileText className="h-4 w-4" /> Créer un devis avec ce tarif
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NouveauTarifDrawer({ open, onOpenChange, zones, tonnages, onSave }: {
  open: boolean; onOpenChange: (o: boolean) => void;
  zones: ZoneConfig[]; tonnages: TonnageConfig[];
  onSave: (t: Omit<TarifZone, "id">) => Promise<void>;
}) {
  const [zone, setZone] = useState<ZoneCode>(zones[0]?.code ?? "A");
  const [destination, setDestination] = useState("");
  const [km, setKm] = useState(0);
  const [tonnage, setTonnage] = useState<string>(tonnages[0]?.label ?? "");
  const [type, setType] = useState<TypeTransport>("standard");
  const [tarif, setTarif] = useState(0);
  const [validite, setValidite] = useState("2026-12-31");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (zones[0] && !zones.find((z) => z.code === zone)) setZone(zones[0].code); }, [zones]);
  useEffect(() => { if (tonnages[0] && !tonnages.find((t) => t.label === tonnage)) setTonnage(tonnages[0].label); }, [tonnages]);

  const submit = async () => {
    if (!destination.trim() || !tarif) return toast.error("Destination et tarif requis");
    setSaving(true);
    await onSave({ destination, km, zone, tonnage, type, tarif, validite });
    setSaving(false);
    setDestination(""); setKm(0); setTarif(0);
  };
  const borne = tonnages.find((t) => t.label === tonnage)?.borne_haute || 40;
  const tarifTonne = tarif > 0 ? Math.round(tarif / borne) : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] sm:w-[420px] sm:max-w-[420px] flex flex-col">
        <SheetHeader><SheetTitle>Ajouter un tarif</SheetTitle></SheetHeader>
        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          <div><Label>Zone</Label>
            <Select value={zone} onValueChange={(v) => setZone(v as ZoneCode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{zones.map((z) => <SelectItem key={z.id} value={z.code}>Zone {z.code} — {z.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Destination</Label><Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Ex: Abidjan → Gagnoa" /></div>
          <div><Label>Distance (km)</Label><Input type="number" value={km} onChange={(e) => setKm(Number(e.target.value))} /></div>
          <div><Label>Tranche de tonnage</Label>
            <Select value={tonnage} onValueChange={setTonnage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{tonnages.map((t) => <SelectItem key={t.id} value={t.label}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Type de transport</Label>
            <Select value={type} onValueChange={(v) => setType(v as TypeTransport)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="express">Express</SelectItem>
                <SelectItem value="special">Spécial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Tarif HT (FCFA)</Label>
            <Input type="number" value={tarif} onChange={(e) => setTarif(Number(e.target.value))} />
            <p className="text-[11px] text-muted-foreground mt-1">Tarif/Tonne estimé : {new Intl.NumberFormat("fr-FR").format(tarifTonne)} FCFA/T</p>
          </div>
          <div><Label>Date de validité</Label><Input type="date" value={validite} onChange={(e) => setValidite(e.target.value)} /></div>
        </div>
        <SheetFooter className="flex flex-row justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Enregistrement..." : "Enregistrer le tarif"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

