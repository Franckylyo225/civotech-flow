import { useMemo, useState } from "react";
import { ListChecks, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useGrilleTarifaire } from "@/hooks/use-grille-tarifaire";
import { useGrilleTarifaireStore } from "@/hooks/use-grille-tarifaire-store";
import { formatMontant } from "@/types/devis";
import { cn } from "@/lib/utils";

type Pick = { description: string; prixUnitaire: number };

interface Props {
  onSelect: (p: Pick) => void;
  disabled?: boolean;
}

export function TarifPickerPopover({ onSelect, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [zoneFilter, setZoneFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const { tarifsZone, tarifsKm, frais, zonesConfig, loading } = useGrilleTarifaire();
  const { tarifs: grille } = useGrilleTarifaireStore();

  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const match = (s: string) => !q || norm(s).includes(norm(q));

  const zones = useMemo(
    () => [...new Set(tarifsZone.map((t) => t.zone))].sort(),
    [tarifsZone]
  );

  const zoneRows = useMemo(() => {
    return tarifsZone
      .filter((t) => zoneFilter === "ALL" || t.zone === zoneFilter)
      .filter((t) => typeFilter === "ALL" || t.type === typeFilter)
      .filter((t) => match(`${t.destination} ${t.zone} ${t.tonnage} ${t.type}`));
  }, [tarifsZone, zoneFilter, typeFilter, q]);

  const kmRows = useMemo(
    () => tarifsKm.filter((t) => match(`${t.vehicule}`)),
    [tarifsKm, q]
  );
  const grilleRows = useMemo(
    () => grille.filter((t) => t.actif && match(`${t.designation} ${t.categorie}`)),
    [grille, q]
  );
  const fraisRows = useMemo(
    () => frais.filter((f) => f.actif && match(f.designation)),
    [frais, q]
  );

  const pick = (p: Pick) => {
    onSelect(p);
    setOpen(false);
    setQ("");
  };

  const zoneColor = (code: string) =>
    zonesConfig.find((z) => z.code === code)?.couleur || "#10B981";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          title="Sélectionner depuis la grille tarifaire"
          disabled={disabled}
        >
          <ListChecks className="h-4 w-4 text-primary" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[460px] p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher destination, véhicule, désignation..."
              className="pl-7 h-8 text-sm"
            />
          </div>
        </div>
        <Tabs defaultValue="zone" className="w-full">
          <TabsList className="grid grid-cols-4 mx-2 mt-2 h-8">
            <TabsTrigger value="zone" className="text-[11px]">Zones ({zoneRows.length})</TabsTrigger>
            <TabsTrigger value="km" className="text-[11px]">Km ({kmRows.length})</TabsTrigger>
            <TabsTrigger value="grille" className="text-[11px]">Grille ({grilleRows.length})</TabsTrigger>
            <TabsTrigger value="frais" className="text-[11px]">Frais ({fraisRows.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="zone" className="mt-2">
            <div className="px-2 pb-2 flex flex-wrap gap-1">
              <FilterChip active={zoneFilter === "ALL"} onClick={() => setZoneFilter("ALL")}>
                Toutes zones
              </FilterChip>
              {zones.map((z) => (
                <FilterChip key={z} active={zoneFilter === z} onClick={() => setZoneFilter(z)}
                  color={zoneColor(z)}>
                  Zone {z}
                </FilterChip>
              ))}
              <span className="w-px bg-border mx-1" />
              {(["ALL", "standard", "express", "special"] as const).map((t) => (
                <FilterChip key={t} active={typeFilter === t} onClick={() => setTypeFilter(t)}>
                  {t === "ALL" ? "Tous types" : t}
                </FilterChip>
              ))}
            </div>
            <ScrollArea className="h-64">
              {loading ? (
                <Empty>Chargement...</Empty>
              ) : zoneRows.length === 0 ? (
                <Empty>Aucun tarif trouvé</Empty>
              ) : (
                <div className="px-1 pb-1">
                  {zoneRows.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent text-left"
                      onClick={() =>
                        pick({
                          description: `Transport ${t.destination} — ${t.tonnage} (${t.type})`,
                          prixUnitaire: t.tarif,
                        })
                      }
                    >
                      <span
                        className="h-5 w-5 rounded-full text-[10px] font-semibold flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: zoneColor(t.zone) }}
                      >
                        {t.zone}
                      </span>
                      <span className="flex-1 truncate">
                        {t.destination}
                        <span className="text-muted-foreground ml-1">· {t.tonnage} · {t.type}</span>
                      </span>
                      <span className="font-medium text-primary shrink-0">{formatMontant(t.tarif)}</span>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="km" className="mt-2">
            <ScrollArea className="h-72">
              {kmRows.length === 0 ? (
                <Empty>Aucun tarif km</Empty>
              ) : (
                <div className="px-1 pb-1">
                  {kmRows.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent text-left"
                      onClick={() =>
                        pick({
                          description: `${t.vehicule} (≤ ${t.tonnage_max}T) — forfait départ`,
                          prixUnitaire: t.forfait_depart,
                        })
                      }
                    >
                      <span className="flex-1 truncate">
                        {t.vehicule}
                        <span className="text-muted-foreground ml-1">
                          · ≤ {t.tonnage_max}T · {formatMontant(t.prix_km)}/km
                        </span>
                      </span>
                      <span className="font-medium text-primary shrink-0">{formatMontant(t.forfait_depart)}</span>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="grille" className="mt-2">
            <ScrollArea className="h-72">
              {grilleRows.length === 0 ? (
                <Empty>Aucune entrée</Empty>
              ) : (
                <div className="px-1 pb-1">
                  {grilleRows.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent text-left"
                      onClick={() => pick({ description: t.designation, prixUnitaire: t.prixUnitaire })}
                    >
                      <Badge variant="outline" className="text-[10px] py-0 h-4">{t.categorie}</Badge>
                      <span className="flex-1 truncate">{t.designation}
                        <span className="text-muted-foreground ml-1">· {t.unite}</span>
                      </span>
                      <span className="font-medium text-primary shrink-0">{formatMontant(t.prixUnitaire)}</span>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="frais" className="mt-2">
            <ScrollArea className="h-72">
              {fraisRows.length === 0 ? (
                <Empty>Aucun frais</Empty>
              ) : (
                <div className="px-1 pb-1">
                  {fraisRows.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent text-left"
                      onClick={() => pick({ description: f.designation, prixUnitaire: f.montant })}
                    >
                      <span className="flex-1 truncate">{f.designation}
                        <span className="text-muted-foreground ml-1">· {f.applicable}</span>
                      </span>
                      <span className="font-medium text-primary shrink-0">{formatMontant(f.montant)}</span>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

function FilterChip({
  active, onClick, children, color,
}: { active: boolean; onClick: () => void; children: React.ReactNode; color?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-2 py-0.5 rounded-full text-[11px] border transition-colors",
        active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent border-border text-muted-foreground"
      )}
      style={active && color ? { backgroundColor: color, borderColor: color, color: "white" } : undefined}
    >
      {children}
    </button>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-center text-xs text-muted-foreground py-8">{children}</div>;
}
