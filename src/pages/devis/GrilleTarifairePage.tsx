import { useMemo, useState } from "react";
import { Upload, Download, Plus, Search, Pencil, Trash2, Check, X, Copy, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { formatFCFA } from "@/utils/format";

// ─── Types ────────────────────────────────────────────────────────────
type ZoneCode = "A" | "B" | "C" | "D";
type TypeTransport = "standard" | "express" | "special";
type TonnageTranche = "≤ 10T" | "10–20T" | "10–40T" | "20–40T" | "≤ 40T" | "> 40T";

interface TarifZone {
  id: number;
  destination: string;
  km: number;
  zone: ZoneCode;
  tonnage: TonnageTranche;
  type: TypeTransport;
  tarif: number;
  validite: string; // DD/MM/YYYY
}

interface TarifKm {
  id: number;
  vehicule: string;
  tonnageMax: number;
  prixKm: number;
  forfaitDepart: number;
  validite: string;
}

interface MajorationPct {
  id: number;
  motif: string;
  pct: number;
  applicable: string;
  actif: boolean;
}

interface FraisFixe {
  id: number;
  designation: string;
  montant: number;
  applicable: string;
  actif: boolean;
}

// ─── Constantes ──────────────────────────────────────────────────────
const ZONE_LABELS: Record<ZoneCode, string> = {
  A: "Zone A — Grand Abidjan et périphérie",
  B: "Zone B — Côte sud",
  C: "Zone C — Centre et Nord",
  D: "Zone D — Ouest",
};

const ZONE_FILTER_LABELS: Record<ZoneCode, string> = {
  A: "Zone A — Grand Abidjan",
  B: "Zone B — Côte sud",
  C: "Zone C — Centre et Nord",
  D: "Zone D — Ouest",
};

const ZONE_BADGE: Record<ZoneCode, string> = {
  A: "bg-[#ECFDF5] text-[#065F46]",
  B: "bg-[#EFF6FF] text-[#1E40AF]",
  C: "bg-[#FFFBEB] text-[#92400E]",
  D: "bg-[#FEF2F2] text-[#991B1B]",
};

const TYPE_BADGE: Record<TypeTransport, string> = {
  standard: "bg-[#F3F4F6] text-[#374151]",
  express: "bg-[#EDE9FE] text-[#4C1D95]",
  special: "bg-[#FEF3C7] text-[#92400E]",
};

const TYPE_LABEL: Record<TypeTransport, string> = {
  standard: "Standard",
  express: "Express",
  special: "Spécial",
};

const TONNAGES: TonnageTranche[] = ["≤ 10T", "10–20T", "20–40T", "> 40T"];

// Borne haute pour calcul tarif/tonne
function tonnageBorneHaute(t: TonnageTranche): number {
  if (t.includes("10T")) return 10;
  if (t === "10–20T") return 20;
  if (t === "10–40T" || t === "20–40T" || t === "≤ 40T") return 40;
  if (t === "> 40T") return 50;
  return 40;
}

// ─── Mocks ───────────────────────────────────────────────────────────
const TARIFS_INIT: TarifZone[] = [
  { id: 1, destination: "Abidjan → Anyama", km: 25, zone: "A", tonnage: "≤ 10T", type: "standard", tarif: 180000, validite: "31/12/2026" },
  { id: 2, destination: "Abidjan → Anyama", km: 25, zone: "A", tonnage: "10–40T", type: "standard", tarif: 320000, validite: "31/12/2026" },
  { id: 3, destination: "Abidjan → Grand-Bassam", km: 40, zone: "A", tonnage: "≤ 40T", type: "express", tarif: 520000, validite: "31/12/2026" },
  { id: 4, destination: "Abidjan → Dabou", km: 55, zone: "A", tonnage: "≤ 40T", type: "standard", tarif: 410000, validite: "31/12/2026" },
  { id: 5, destination: "Abidjan → San-Pédro", km: 360, zone: "B", tonnage: "10–20T", type: "standard", tarif: 850000, validite: "31/12/2026" },
  { id: 6, destination: "Abidjan → San-Pédro", km: 360, zone: "B", tonnage: "20–40T", type: "standard", tarif: 1250000, validite: "31/12/2026" },
  { id: 7, destination: "Abidjan → San-Pédro", km: 360, zone: "B", tonnage: "20–40T", type: "express", tarif: 1800000, validite: "31/12/2026" },
  { id: 8, destination: "Abidjan → Sassandra", km: 290, zone: "B", tonnage: "20–40T", type: "standard", tarif: 1100000, validite: "31/12/2026" },
  { id: 9, destination: "Abidjan → Bouaké", km: 340, zone: "C", tonnage: "20–40T", type: "standard", tarif: 1400000, validite: "31/12/2026" },
  { id: 10, destination: "Abidjan → Yamoussoukro", km: 240, zone: "C", tonnage: "20–40T", type: "standard", tarif: 980000, validite: "31/12/2026" },
  { id: 11, destination: "Abidjan → Korhogo", km: 630, zone: "C", tonnage: "20–40T", type: "standard", tarif: 2200000, validite: "31/12/2026" },
  { id: 12, destination: "Abidjan → Man", km: 460, zone: "D", tonnage: "20–40T", type: "standard", tarif: 1900000, validite: "31/12/2026" },
  { id: 13, destination: "Abidjan → Daloa", km: 390, zone: "D", tonnage: "20–40T", type: "standard", tarif: 1600000, validite: "31/12/2026" },
  { id: 14, destination: "Abidjan → Man", km: 460, zone: "D", tonnage: "20–40T", type: "special", tarif: 4800000, validite: "31/12/2026" },
];

const TARIFS_KM_INIT: TarifKm[] = [
  { id: 1, vehicule: "Camion 20T Standard", tonnageMax: 20, prixKm: 2800, forfaitDepart: 45000, validite: "31/12/2026" },
  { id: 2, vehicule: "Camion 40T Standard", tonnageMax: 40, prixKm: 3500, forfaitDepart: 60000, validite: "31/12/2026" },
  { id: 3, vehicule: "Camion 40T Express", tonnageMax: 40, prixKm: 4900, forfaitDepart: 85000, validite: "31/12/2026" },
  { id: 4, vehicule: "Camion Frigorifique", tonnageMax: 25, prixKm: 5200, forfaitDepart: 95000, validite: "31/12/2026" },
];

const MAJORATIONS_INIT: MajorationPct[] = [
  { id: 1, motif: "Surcharge carburant", pct: 5, applicable: "Tous tarifs", actif: true },
  { id: 2, motif: "Transport de nuit", pct: 20, applicable: "Tous tarifs", actif: true },
  { id: 3, motif: "Marchandises fragiles", pct: 15, applicable: "Tarif de base", actif: true },
  { id: 4, motif: "Urgence < 24h", pct: 35, applicable: "Tarif de base", actif: true },
  { id: 5, motif: "Week-end / férié", pct: 25, applicable: "Tous tarifs", actif: false },
];

const FRAIS_INIT: FraisFixe[] = [
  { id: 1, designation: "Péage autoroute", montant: 15000, applicable: "Par trajet", actif: true },
  { id: 2, designation: "Frais douane", montant: 45000, applicable: "Par trajet", actif: true },
  { id: 3, designation: "Manutention port", montant: 180000, applicable: "Par chargement", actif: true },
  { id: 4, designation: "Escorte sécurité", montant: 250000, applicable: "Sur demande", actif: false },
];

// ─── Helpers ─────────────────────────────────────────────────────────
function parseDateFr(s: string): Date | null {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}

function validityClass(s: string): string {
  const d = parseDateFr(s);
  if (!d) return "text-muted-foreground";
  const now = new Date();
  const diffDays = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return "text-destructive";
  if (diffDays < 30) return "text-amber-600";
  return "text-muted-foreground";
}

function calcTarifParTonne(tarif: number, tonnage: TonnageTranche): number {
  return Math.round(tarif / tonnageBorneHaute(tonnage));
}

// ─── Composants tabs ─────────────────────────────────────────────────
type TabKey = "zone" | "km" | "majorations" | "simulateur";

const TABS: { key: TabKey; label: string }[] = [
  { key: "zone", label: "Tarifs par zone" },
  { key: "km", label: "Tarifs au km" },
  { key: "majorations", label: "Majorations" },
  { key: "simulateur", label: "Simulateur" },
];

// ─── Page principale ─────────────────────────────────────────────────
export default function GrilleTarifairePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>("zone");

  const [tarifs, setTarifs] = useState<TarifZone[]>(TARIFS_INIT);
  const [tarifsKm, setTarifsKm] = useState<TarifKm[]>(TARIFS_KM_INIT);
  const [majorations, setMajorations] = useState<MajorationPct[]>(MAJORATIONS_INIT);
  const [frais, setFrais] = useState<FraisFixe[]>(FRAIS_INIT);

  // Filtres onglet 1
  const [searchQuery, setSearchQuery] = useState("");
  const [filtreZone, setFiltreZone] = useState<string>("ALL");
  const [filtreType, setFiltreType] = useState<string>("ALL");
  const [filtreTonnage, setFiltreTonnage] = useState<string>("ALL");

  // Édition inline
  const [ligneEnEdition, setLigneEnEdition] = useState<number | null>(null);
  const [editBuffer, setEditBuffer] = useState<TarifZone | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  // Drawer
  const [showDrawer, setShowDrawer] = useState(false);

  // KPI
  const tarifMin = useMemo(() => tarifs.reduce((a, b) => (a.tarif < b.tarif ? a : b), tarifs[0]), [tarifs]);
  const tarifMax = useMemo(() => tarifs.reduce((a, b) => (a.tarif > b.tarif ? a : b), tarifs[0]), [tarifs]);
  const nbZones = useMemo(() => new Set(tarifs.map((t) => t.zone)).size, [tarifs]);
  const nbTypes = useMemo(() => new Set(tarifs.map((t) => t.type)).size, [tarifs]);

  const filtreActif = searchQuery !== "" || filtreZone !== "ALL" || filtreType !== "ALL" || filtreTonnage !== "ALL";

  const tarifsFiltres = useMemo(() => {
    return tarifs.filter((t) => {
      if (searchQuery && !t.destination.toLowerCase().includes(searchQuery.toLowerCase()) && !t.zone.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filtreZone !== "ALL" && t.zone !== filtreZone) return false;
      if (filtreType !== "ALL" && t.type !== filtreType) return false;
      if (filtreTonnage !== "ALL" && t.tonnage !== filtreTonnage) return false;
      return true;
    });
  }, [tarifs, searchQuery, filtreZone, filtreType, filtreTonnage]);

  const tarifsParZone = useMemo(() => {
    const map = new Map<ZoneCode, TarifZone[]>();
    tarifsFiltres.forEach((t) => {
      if (!map.has(t.zone)) map.set(t.zone, []);
      map.get(t.zone)!.push(t);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [tarifsFiltres]);

  // Édition
  const startEdit = (t: TarifZone) => {
    setLigneEnEdition(t.id);
    setEditBuffer({ ...t });
  };
  const cancelEdit = () => {
    setLigneEnEdition(null);
    setEditBuffer(null);
  };
  const saveEdit = () => {
    if (!editBuffer) return;
    setTarifs((prev) => prev.map((t) => (t.id === editBuffer.id ? editBuffer : t)));
    setLigneEnEdition(null);
    setEditBuffer(null);
    toast.success("Tarif mis à jour");
  };
  const deleteTarif = (id: number) => {
    setTarifs((prev) => prev.filter((t) => t.id !== id));
    setConfirmDelete(null);
    toast.success("Tarif supprimé");
  };

  // Édition inline tarif uniquement (cellule input)
  const updateTarifInline = (id: number, value: number) => {
    setTarifs((prev) => prev.map((t) => (t.id === id ? { ...t, tarif: value } : t)));
  };

  const resetFilters = () => {
    setSearchQuery("");
    setFiltreZone("ALL");
    setFiltreType("ALL");
    setFiltreTonnage("ALL");
  };

  const addTarif = (n: Omit<TarifZone, "id">) => {
    const id = (tarifs.at(-1)?.id ?? 0) + 1;
    setTarifs((prev) => [...prev, { ...n, id }]);
    toast.success("Nouveau tarif ajouté");
    setShowDrawer(false);
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-[18px] font-medium text-foreground">Grille tarifaire</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Tarifs par zone, tonnage et type de transport · dernière mise à jour 01/04/2026
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => toast("Import CSV à venir")}>
            <Upload className="h-4 w-4" /> Importer CSV
          </Button>
          <Button variant="ghost" size="sm" onClick={() => toast("Export généré")}>
            <Download className="h-4 w-4" /> Exporter
          </Button>
          <Button size="sm" onClick={() => setShowDrawer(true)}>
            <Plus className="h-4 w-4" /> Nouveau tarif
          </Button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Tarifs actifs" value={String(tarifs.length)} sub={`${nbZones} zones · ${nbTypes} types`} />
        <KpiCard title="Tarif minimum" value={new Intl.NumberFormat("fr-FR").format(tarifMin?.tarif ?? 0)} sub={`FCFA · Zone ${tarifMin?.zone ?? ""} ${TYPE_LABEL[tarifMin?.type ?? "standard"]}`} valueColor />
        <KpiCard title="Tarif maximum" value={new Intl.NumberFormat("fr-FR").format(tarifMax?.tarif ?? 0)} sub={`FCFA · Zone ${tarifMax?.zone ?? ""} ${TYPE_LABEL[tarifMax?.type ?? "standard"]}`} valueColor />
        <KpiCard title="Dernière modification" value="01/04/2026" sub="par Admin" small />
      </div>

      {/* Onglets */}
      <div className="flex items-center gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              "px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors",
              activeTab === t.key
                ? "border-primary text-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "zone" && (
        <div className="space-y-6">
          {/* Filtres */}
          <Card>
            <CardContent className="flex flex-wrap items-center gap-3 p-4">
              <div className="relative flex-1 min-w-[220px] max-w-[360px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher une destination, zone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filtreZone} onValueChange={setFiltreZone}>
                <SelectTrigger className="w-[220px]"><SelectValue placeholder="Toutes les zones" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Toutes les zones</SelectItem>
                  {(Object.keys(ZONE_FILTER_LABELS) as ZoneCode[]).map((z) => (
                    <SelectItem key={z} value={z}>{ZONE_FILTER_LABELS[z]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filtreType} onValueChange={setFiltreType}>
                <SelectTrigger className="w-[170px]"><SelectValue placeholder="Tous les types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous les types</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="express">Express</SelectItem>
                  <SelectItem value="special">Spécial</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filtreTonnage} onValueChange={setFiltreTonnage}>
                <SelectTrigger className="w-[170px]"><SelectValue placeholder="Tous les tonnages" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous les tonnages</SelectItem>
                  {TONNAGES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filtreActif && (
                <Button variant="ghost" size="sm" onClick={resetFilters}>Réinitialiser</Button>
              )}
            </CardContent>
          </Card>

          {/* Groupes par zone */}
          {tarifsParZone.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Aucun tarif trouvé</CardContent></Card>
          ) : (
            tarifsParZone.map(([zone, list]) => (
              <div key={zone} className="space-y-2">
                <div className="text-[11px] uppercase tracking-[0.5px] text-muted-foreground font-medium">
                  {ZONE_LABELS[zone]}
                </div>
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
                        <th className="text-right px-4 py-2.5 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((t) => {
                        const isEditing = ligneEnEdition === t.id && editBuffer;
                        const row = isEditing ? editBuffer! : t;
                        return (
                          <tr key={t.id} className="border-t hover:bg-[#F9FAFB] transition-colors">
                            <td className="px-4 py-2.5">
                              {isEditing ? (
                                <Input value={row.destination} onChange={(e) => setEditBuffer({ ...row, destination: e.target.value })} className="h-8" />
                              ) : (
                                <>
                                  <div className="text-[12px] font-medium">{t.destination}</div>
                                  <div className="text-[10px] text-muted-foreground">~{t.km} km</div>
                                </>
                              )}
                            </td>
                            <td className="px-4 py-2.5">
                              {isEditing ? (
                                <Select value={row.zone} onValueChange={(v) => setEditBuffer({ ...row, zone: v as ZoneCode })}>
                                  <SelectTrigger className="h-8 w-[80px]"><SelectValue /></SelectTrigger>
                                  <SelectContent>{(["A", "B", "C", "D"] as ZoneCode[]).map((z) => <SelectItem key={z} value={z}>Zone {z}</SelectItem>)}</SelectContent>
                                </Select>
                              ) : (
                                <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium", ZONE_BADGE[t.zone])}>
                                  Zone {t.zone}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-[12px] text-muted-foreground">
                              {isEditing ? (
                                <Select value={row.tonnage} onValueChange={(v) => setEditBuffer({ ...row, tonnage: v as TonnageTranche })}>
                                  <SelectTrigger className="h-8 w-[110px]"><SelectValue /></SelectTrigger>
                                  <SelectContent>{TONNAGES.map((tn) => <SelectItem key={tn} value={tn}>{tn}</SelectItem>)}</SelectContent>
                                </Select>
                              ) : (
                                t.tonnage
                              )}
                            </td>
                            <td className="px-4 py-2.5">
                              {isEditing ? (
                                <Select value={row.type} onValueChange={(v) => setEditBuffer({ ...row, type: v as TypeTransport })}>
                                  <SelectTrigger className="h-8 w-[110px]"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="standard">Standard</SelectItem>
                                    <SelectItem value="express">Express</SelectItem>
                                    <SelectItem value="special">Spécial</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium", TYPE_BADGE[t.type])}>
                                  {TYPE_LABEL[t.type]}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              {isEditing ? (
                                <Input
                                  type="number"
                                  value={row.tarif}
                                  onChange={(e) => setEditBuffer({ ...row, tarif: Number(e.target.value) })}
                                  className="h-8 text-right"
                                />
                              ) : (
                                <InlineTarifInput value={t.tarif} onChange={(v) => updateTarifInline(t.id, v)} />
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right text-[11px] text-muted-foreground">
                              {new Intl.NumberFormat("fr-FR").format(calcTarifParTonne(row.tarif, row.tonnage))} FCFA/T
                            </td>
                            <td className={cn("px-4 py-2.5 text-[11px]", validityClass(t.validite))}>
                              {isEditing ? (
                                <Input value={row.validite} onChange={(e) => setEditBuffer({ ...row, validite: e.target.value })} className="h-8 w-[110px]" />
                              ) : (
                                t.validite
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {isEditing ? (
                                  <>
                                    <Button size="icon" variant="ghost" className="h-[26px] w-[26px] text-primary" onClick={saveEdit}>
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-[26px] w-[26px]" onClick={cancelEdit}>
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button size="icon" variant="ghost" className="h-[26px] w-[26px]" onClick={() => startEdit(t)}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-[26px] w-[26px] text-destructive" onClick={() => setConfirmDelete(t.id)}>
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Card>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "km" && (
        <TarifsKmTab tarifs={tarifsKm} onChange={setTarifsKm} />
      )}

      {activeTab === "majorations" && (
        <MajorationsTab
          majorations={majorations}
          frais={frais}
          onChangeMajorations={setMajorations}
          onChangeFrais={setFrais}
        />
      )}

      {activeTab === "simulateur" && (
        <SimulateurTab tarifs={tarifs} majorations={majorations} frais={frais} onCreateDevis={(d) => navigate("/devis/nouveau", { state: d })} />
      )}

      {/* Drawer Nouveau tarif */}
      <NouveauTarifDrawer open={showDrawer} onOpenChange={setShowDrawer} onSave={addTarif} />

      {/* Confirm delete */}
      <AlertDialog open={confirmDelete !== null} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce tarif ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelete !== null && deleteTarif(confirmDelete)}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────
function KpiCard({ title, value, sub, valueColor, small }: { title: string; value: string; sub: string; valueColor?: boolean; small?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[12px] text-muted-foreground">{title}</div>
        <div className={cn("mt-1.5 font-semibold", small ? "text-[14px]" : "text-2xl", valueColor && "text-primary")}>
          {value}
        </div>
        <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>
      </CardContent>
    </Card>
  );
}

// ─── Inline tarif input ──────────────────────────────────────────────
function InlineTarifInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { onChange(Number(draft) || 0); setEditing(false); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { onChange(Number(draft) || 0); setEditing(false); }
          if (e.key === "Escape") { setDraft(String(value)); setEditing(false); }
        }}
        className="w-full text-right border border-primary rounded px-2 py-1 text-sm focus:outline-none"
      />
    );
  }
  return (
    <button
      onClick={() => { setDraft(String(value)); setEditing(true); }}
      className="w-full text-right px-2 py-1 rounded border border-transparent hover:border-input transition-colors text-sm font-medium"
    >
      {formatFCFA(value)}
    </button>
  );
}

// ─── Onglet 2: Tarifs au km ──────────────────────────────────────────
function TarifsKmTab({ tarifs, onChange }: { tarifs: TarifKm[]; onChange: (t: TarifKm[]) => void }) {
  const [editId, setEditId] = useState<number | null>(null);
  const [buf, setBuf] = useState<TarifKm | null>(null);

  const start = (t: TarifKm) => { setEditId(t.id); setBuf({ ...t }); };
  const cancel = () => { setEditId(null); setBuf(null); };
  const save = () => {
    if (!buf) return;
    onChange(tarifs.map((t) => (t.id === buf.id ? buf : t)));
    cancel();
    toast.success("Tarif mis à jour");
  };
  const remove = (id: number) => {
    onChange(tarifs.filter((t) => t.id !== id));
    toast.success("Tarif supprimé");
  };

  return (
    <Card className="overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#F9FAFB] text-[10px] uppercase text-muted-foreground">
            <th className="text-left px-4 py-2.5 font-medium">Type de véhicule</th>
            <th className="text-left px-4 py-2.5 font-medium">Tonnage max</th>
            <th className="text-right px-4 py-2.5 font-medium">Prix/km (FCFA)</th>
            <th className="text-right px-4 py-2.5 font-medium">Forfait départ</th>
            <th className="text-left px-4 py-2.5 font-medium">Validité</th>
            <th className="text-right px-4 py-2.5 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tarifs.map((t) => {
            const editing = editId === t.id && buf;
            const row = editing ? buf! : t;
            return (
              <tr key={t.id} className="border-t hover:bg-[#F9FAFB]">
                <td className="px-4 py-2.5 font-medium">
                  {editing ? <Input className="h-8" value={row.vehicule} onChange={(e) => setBuf({ ...row, vehicule: e.target.value })} /> : t.vehicule}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {editing ? <Input type="number" className="h-8 w-20" value={row.tonnageMax} onChange={(e) => setBuf({ ...row, tonnageMax: Number(e.target.value) })} /> : `${t.tonnageMax}T`}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {editing ? <Input type="number" className="h-8 text-right" value={row.prixKm} onChange={(e) => setBuf({ ...row, prixKm: Number(e.target.value) })} /> : `${new Intl.NumberFormat("fr-FR").format(t.prixKm)} F/km`}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {editing ? <Input type="number" className="h-8 text-right" value={row.forfaitDepart} onChange={(e) => setBuf({ ...row, forfaitDepart: Number(e.target.value) })} /> : `${new Intl.NumberFormat("fr-FR").format(t.forfaitDepart)} F`}
                </td>
                <td className={cn("px-4 py-2.5 text-[11px]", validityClass(t.validite))}>
                  {editing ? <Input className="h-8 w-28" value={row.validite} onChange={(e) => setBuf({ ...row, validite: e.target.value })} /> : t.validite}
                </td>
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
                        <Button size="icon" variant="ghost" className="h-[26px] w-[26px] text-destructive" onClick={() => remove(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

// ─── Onglet 3: Majorations ───────────────────────────────────────────
function MajorationsTab({
  majorations,
  frais,
  onChangeMajorations,
  onChangeFrais,
}: {
  majorations: MajorationPct[];
  frais: FraisFixe[];
  onChangeMajorations: (m: MajorationPct[]) => void;
  onChangeFrais: (f: FraisFixe[]) => void;
}) {
  const togglePct = (id: number) => onChangeMajorations(majorations.map((m) => (m.id === id ? { ...m, actif: !m.actif } : m)));
  const toggleFrais = (id: number) => onChangeFrais(frais.map((f) => (f.id === id ? { ...f, actif: !f.actif } : f)));
  const removePct = (id: number) => { onChangeMajorations(majorations.filter((m) => m.id !== id)); toast.success("Majoration supprimée"); };
  const removeFrais = (id: number) => { onChangeFrais(frais.filter((f) => f.id !== id)); toast.success("Frais supprimé"); };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] uppercase tracking-[0.5px] text-muted-foreground font-medium mb-2">
          Majorations en pourcentage
        </div>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F9FAFB] text-[10px] uppercase text-muted-foreground">
                <th className="text-left px-4 py-2.5 font-medium">Motif</th>
                <th className="text-right px-4 py-2.5 font-medium">% appliqué</th>
                <th className="text-left px-4 py-2.5 font-medium">Applicable sur</th>
                <th className="text-left px-4 py-2.5 font-medium">Statut</th>
                <th className="text-right px-4 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {majorations.map((m) => (
                <tr key={m.id} className="border-t hover:bg-[#F9FAFB]">
                  <td className="px-4 py-2.5 font-medium">{m.motif}</td>
                  <td className="px-4 py-2.5 text-right text-primary font-medium">+{m.pct}%</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{m.applicable}</td>
                  <td className="px-4 py-2.5">
                    <Switch checked={m.actif} onCheckedChange={() => togglePct(m.id)} />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Button size="icon" variant="ghost" className="h-[26px] w-[26px] text-destructive" onClick={() => removePct(m.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-[0.5px] text-muted-foreground font-medium mb-2">
          Frais fixes additionnels
        </div>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F9FAFB] text-[10px] uppercase text-muted-foreground">
                <th className="text-left px-4 py-2.5 font-medium">Désignation</th>
                <th className="text-right px-4 py-2.5 font-medium">Montant (FCFA)</th>
                <th className="text-left px-4 py-2.5 font-medium">Applicable sur</th>
                <th className="text-left px-4 py-2.5 font-medium">Statut</th>
                <th className="text-right px-4 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {frais.map((f) => (
                <tr key={f.id} className="border-t hover:bg-[#F9FAFB]">
                  <td className="px-4 py-2.5 font-medium">{f.designation}</td>
                  <td className="px-4 py-2.5 text-right">{new Intl.NumberFormat("fr-FR").format(f.montant)} F</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{f.applicable}</td>
                  <td className="px-4 py-2.5">
                    <Switch checked={f.actif} onCheckedChange={() => toggleFrais(f.id)} />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Button size="icon" variant="ghost" className="h-[26px] w-[26px] text-destructive" onClick={() => removeFrais(f.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

// ─── Onglet 4: Simulateur ────────────────────────────────────────────
function SimulateurTab({
  tarifs,
  majorations,
  frais,
  onCreateDevis,
}: {
  tarifs: TarifZone[];
  majorations: MajorationPct[];
  frais: FraisFixe[];
  onCreateDevis: (d: { destination: string; montant: number; type: TypeTransport }) => void;
}) {
  const destinations = useMemo(() => Array.from(new Set(tarifs.map((t) => t.destination))).sort(), [tarifs]);
  const majActives = useMemo(() => majorations.filter((m) => m.actif), [majorations]);
  const fraisActifs = useMemo(() => frais.filter((f) => f.actif), [frais]);

  const [destination, setDestination] = useState<string>("");
  const [type, setType] = useState<TypeTransport | "">("");
  const [tonnage, setTonnage] = useState<TonnageTranche | "">("");
  const [selMaj, setSelMaj] = useState<number[]>([]);
  const [selFrais, setSelFrais] = useState<number[]>([]);
  const [nbTrajets, setNbTrajets] = useState<number>(1);

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
    const totalNTrajets = totalTTC * nbTrajets;
    return { base, majDetail, fraisDetail, sousTotal, tva, totalTTC, totalNTrajets };
  }, [tarifBase, majActives, fraisActifs, selMaj, selFrais, nbTrajets]);

  const toggleMaj = (id: number) => setSelMaj((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const toggleFrais = (id: number) => setSelFrais((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const copyMontant = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(String(result.totalTTC));
    toast.success("Montant copié");
  };

  const noTarif = destination && type && tonnage && !tarifBase;

  return (
    <div className="flex justify-center">
      <Card className="w-full max-w-[680px]">
        <CardContent className="p-6 space-y-6">
          <div>
            <h3 className="text-base font-medium">Simuler un tarif</h3>
            <p className="text-[13px] text-muted-foreground mt-1">
              Calculez automatiquement le tarif à appliquer avant de créer un devis.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Destination</Label>
              <Select value={destination} onValueChange={setDestination}>
                <SelectTrigger><SelectValue placeholder="Choisir une destination..." /></SelectTrigger>
                <SelectContent>
                  {destinations.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
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
              <Select value={tonnage} onValueChange={(v) => setTonnage(v as TonnageTranche)}>
                <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>
                  {TONNAGES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
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
                    <Checkbox checked={selMaj.includes(m.id)} onCheckedChange={() => toggleMaj(m.id)} />
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
                    <Checkbox checked={selFrais.includes(f.id)} onCheckedChange={() => toggleFrais(f.id)} />
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
                <div className="text-sm text-foreground pt-1">
                  Total pour {nbTrajets} trajets : <span className="font-medium text-primary">{formatFCFA(result.totalNTrajets)}</span>
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={copyMontant}>
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

// ─── Drawer Nouveau tarif ────────────────────────────────────────────
function NouveauTarifDrawer({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (t: Omit<TarifZone, "id">) => void;
}) {
  const [zone, setZone] = useState<ZoneCode>("A");
  const [destination, setDestination] = useState("");
  const [km, setKm] = useState<number>(0);
  const [tonnage, setTonnage] = useState<TonnageTranche>("≤ 10T");
  const [type, setType] = useState<TypeTransport>("standard");
  const [tarif, setTarif] = useState<number>(0);
  const [validite, setValidite] = useState("2026-12-31");

  const reset = () => {
    setZone("A"); setDestination(""); setKm(0);
    setTonnage("≤ 10T"); setType("standard"); setTarif(0); setValidite("2026-12-31");
  };

  const submit = () => {
    if (!destination.trim() || !tarif) {
      toast.error("Destination et tarif requis");
      return;
    }
    const [y, m, d] = validite.split("-");
    onSave({
      destination,
      km,
      zone,
      tonnage,
      type,
      tarif,
      validite: `${d}/${m}/${y}`,
    });
    reset();
  };

  const tarifTonne = tarif > 0 ? Math.round(tarif / tonnageBorneHaute(tonnage)) : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] sm:w-[420px] sm:max-w-[420px] flex flex-col">
        <SheetHeader>
          <SheetTitle>Ajouter un tarif</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          <div>
            <Label>Zone</Label>
            <Select value={zone} onValueChange={(v) => setZone(v as ZoneCode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["A", "B", "C", "D"] as ZoneCode[]).map((z) => (
                  <SelectItem key={z} value={z}>Zone {z}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Destination</Label>
            <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Ex: Abidjan → Gagnoa" />
          </div>
          <div>
            <Label>Distance (km)</Label>
            <Input type="number" value={km} onChange={(e) => setKm(Number(e.target.value))} placeholder="Ex: 280" />
          </div>
          <div>
            <Label>Tranche de tonnage</Label>
            <Select value={tonnage} onValueChange={(v) => setTonnage(v as TonnageTranche)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TONNAGES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Type de transport</Label>
            <Select value={type} onValueChange={(v) => setType(v as TypeTransport)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="express">Express</SelectItem>
                <SelectItem value="special">Spécial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tarif HT (FCFA)</Label>
            <Input type="number" value={tarif} onChange={(e) => setTarif(Number(e.target.value))} placeholder="0" />
            <p className="text-[11px] text-muted-foreground mt-1">
              Tarif/Tonne estimé : {new Intl.NumberFormat("fr-FR").format(tarifTonne)} FCFA/T
            </p>
          </div>
          <div>
            <Label>Date de validité</Label>
            <Input type="date" value={validite} onChange={(e) => setValidite(e.target.value)} />
          </div>
        </div>
        <SheetFooter className="flex flex-row justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit}>Enregistrer le tarif</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
