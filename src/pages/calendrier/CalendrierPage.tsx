import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, startOfWeek, endOfWeek, isToday as isDateToday, addWeeks, isSameWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, ChevronRight, Plus, Edit, Trash2, MapPin, Clock, Calendar as CalendarIcon, List, LayoutGrid } from "lucide-react";
import { useCalendrierStore, type EvenementCalendrier, type EvenementInput } from "@/hooks/use-calendrier-store";
import { useAuth } from "@/lib/auth-context";

const TYPE_LABELS: Record<string, string> = {
  REUNION: "Réunion",
  RDV: "Rendez-vous",
  DEPLACEMENT: "Déplacement",
  RAPPEL: "Rappel",
  AUTRE: "Autre",
};

const TYPE_COLORS: Record<string, string> = {
  REUNION: "#3B82F6",
  RDV: "#10B981",
  DEPLACEMENT: "#F59E0B",
  RAPPEL: "#EF4444",
  AUTRE: "#8B5CF6",
};

const defaultInput: EvenementInput = {
  titre: "",
  description: "",
  date_debut: "",
  date_fin: "",
  lieu: "",
  type_evenement: "RDV",
  couleur: "#10B981",
  toute_journee: false,
  rappel_minutes: 30,
};

export default function CalendrierPage() {
  const { evenements, loading, addEvenement, updateEvenement, deleteEvenement } = useCalendrierStore();
  const { user } = useAuth();
  const canManage = user?.role === "DG" || user?.role === "ASSISTANTE";

  const [viewMode, setViewMode] = useState<"mois" | "agenda">("mois");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EvenementCalendrier | null>(null);
  const [formData, setFormData] = useState<EvenementInput>(defaultInput);
  const [detailEvent, setDetailEvent] = useState<EvenementCalendrier | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { locale: fr, weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { locale: fr, weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const eventsByDate = useMemo(() => {
    const map: Record<string, EvenementCalendrier[]> = {};
    evenements.forEach((ev) => {
      const key = format(parseISO(ev.date_debut), "yyyy-MM-dd");
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    return map;
  }, [evenements]);

  const agendaGroups = useMemo(() => {
    const now = new Date();
    const upcoming = evenements
      .filter((ev) => new Date(ev.date_debut) >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))
      .sort((a, b) => new Date(a.date_debut).getTime() - new Date(b.date_debut).getTime());
    const groups: Record<string, EvenementCalendrier[]> = {};
    upcoming.forEach((ev) => {
      const key = format(parseISO(ev.date_debut), "yyyy-MM-dd");
      if (!groups[key]) groups[key] = [];
      groups[key].push(ev);
    });
    return groups;
  }, [evenements]);

  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, "yyyy-MM-dd");
    return eventsByDate[key] || [];
  }, [selectedDate, eventsByDate]);

  const openCreateDialog = (date?: Date) => {
    const d = date || selectedDate || new Date();
    const dateStr = format(d, "yyyy-MM-dd");
    setFormData({
      ...defaultInput,
      date_debut: `${dateStr}T09:00`,
      date_fin: `${dateStr}T10:00`,
    });
    setEditingEvent(null);
    setDialogOpen(true);
  };

  const openEditDialog = (ev: EvenementCalendrier) => {
    setFormData({
      titre: ev.titre,
      description: ev.description,
      date_debut: ev.date_debut.slice(0, 16),
      date_fin: ev.date_fin.slice(0, 16),
      lieu: ev.lieu,
      type_evenement: ev.type_evenement,
      couleur: ev.couleur,
      toute_journee: ev.toute_journee,
      rappel_minutes: ev.rappel_minutes,
    });
    setEditingEvent(ev);
    setDetailEvent(null);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.titre || !formData.date_debut || !formData.date_fin) return;
    const success = editingEvent
      ? await updateEvenement(editingEvent.id, formData)
      : await addEvenement(formData);
    if (success) setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteEvenement(id);
    setDetailEvent(null);
  };

  const updateField = (field: keyof EvenementInput, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "type_evenement") {
        updated.couleur = TYPE_COLORS[value as string] || "#10B981";
      }
      return updated;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendrier DG</h1>
          <p className="text-muted-foreground">Agenda de la Direction Générale</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === "mois" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("mois")}
              className={viewMode === "mois" ? "bg-primary hover:bg-primary/90" : ""}
            >
              <LayoutGrid className="h-4 w-4 mr-1" /> Mois
            </Button>
            <Button
              variant={viewMode === "agenda" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("agenda")}
              className={viewMode === "agenda" ? "bg-primary hover:bg-primary/90" : ""}
            >
              <List className="h-4 w-4 mr-1" /> Agenda
            </Button>
          </div>
          {canManage && (
            <Button onClick={() => openCreateDialog()} className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" /> Nouvel événement
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="text-lg capitalize">
              {format(currentMonth, "MMMM yyyy", { locale: fr })}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
              {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
                <div key={d} className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">
                  {d}
                </div>
              ))}
              {days.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const dayEvents = eventsByDate[key] || [];
                const isToday = isSameDay(day, new Date());
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, currentMonth);

                return (
                  <div
                    key={key}
                    onClick={() => setSelectedDate(day)}
                    onDoubleClick={() => canManage && openCreateDialog(day)}
                    className={`bg-background p-1 min-h-[80px] cursor-pointer transition-colors hover:bg-accent/50 ${
                      !isCurrentMonth ? "opacity-40" : ""
                    } ${isSelected ? "ring-2 ring-primary ring-inset" : ""}`}
                  >
                    <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                    }`}>
                      {format(day, "d")}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <div
                          key={ev.id}
                          onClick={(e) => { e.stopPropagation(); setDetailEvent(ev); }}
                          className="text-[10px] leading-tight px-1 py-0.5 rounded truncate cursor-pointer text-white"
                          style={{ backgroundColor: ev.couleur || TYPE_COLORS[ev.type_evenement] }}
                          title={ev.titre}
                        >
                          {ev.titre}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] text-muted-foreground px-1">+{dayEvents.length - 3}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Side panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {selectedDate
                  ? format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })
                  : "Sélectionnez un jour"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDateEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun événement</p>
              ) : (
                <div className="space-y-2">
                  {selectedDateEvents.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={() => setDetailEvent(ev)}
                      className="p-2 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ev.couleur }} />
                        <span className="text-sm font-medium truncate">{ev.titre}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {ev.toute_journee
                          ? "Toute la journée"
                          : `${format(parseISO(ev.date_debut), "HH:mm")} - ${format(parseISO(ev.date_fin), "HH:mm")}`}
                      </div>
                      {ev.lieu && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {ev.lieu}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming events */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Prochains événements</CardTitle>
            </CardHeader>
            <CardContent>
              {evenements
                .filter((ev) => new Date(ev.date_debut) >= new Date())
                .slice(0, 5)
                .map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => setDetailEvent(ev)}
                    className="flex items-start gap-2 py-2 border-b last:border-0 cursor-pointer hover:bg-accent/30 rounded px-1"
                  >
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: ev.couleur }} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{ev.titre}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(ev.date_debut), "dd/MM à HH:mm", { locale: fr })}
                      </p>
                    </div>
                    <Badge variant="outline" className="ml-auto text-[10px] flex-shrink-0">
                      {TYPE_LABELS[ev.type_evenement]}
                    </Badge>
                  </div>
                ))}
              {evenements.filter((ev) => new Date(ev.date_debut) >= new Date()).length === 0 && (
                <p className="text-sm text-muted-foreground">Aucun événement à venir</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detail dialog */}
      <Dialog open={!!detailEvent} onOpenChange={(o) => !o && setDetailEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: detailEvent?.couleur }} />
              {detailEvent?.titre}
            </DialogTitle>
          </DialogHeader>
          {detailEvent && (
            <div className="space-y-3">
              <Badge variant="outline">{TYPE_LABELS[detailEvent.type_evenement]}</Badge>
              <div className="flex items-center gap-2 text-sm">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                {detailEvent.toute_journee
                  ? format(parseISO(detailEvent.date_debut), "EEEE d MMMM yyyy", { locale: fr })
                  : `${format(parseISO(detailEvent.date_debut), "dd/MM/yyyy HH:mm")} → ${format(parseISO(detailEvent.date_fin), "HH:mm")}`}
              </div>
              {detailEvent.lieu && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" /> {detailEvent.lieu}
                </div>
              )}
              {detailEvent.description && (
                <p className="text-sm text-muted-foreground">{detailEvent.description}</p>
              )}
              {canManage && (
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => openEditDialog(detailEvent)}>
                    <Edit className="h-4 w-4 mr-1" /> Modifier
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(detailEvent.id)}>
                    <Trash2 className="h-4 w-4 mr-1" /> Supprimer
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Modifier l'événement" : "Nouvel événement"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Titre *</Label>
              <Input value={formData.titre} onChange={(e) => updateField("titre", e.target.value)} placeholder="Titre de l'événement" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={formData.type_evenement} onValueChange={(v) => updateField("type_evenement", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formData.toute_journee} onCheckedChange={(v) => updateField("toute_journee", v)} />
              <Label>Toute la journée</Label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Début *</Label>
                <Input
                  type={formData.toute_journee ? "date" : "datetime-local"}
                  value={formData.toute_journee ? formData.date_debut.slice(0, 10) : formData.date_debut}
                  onChange={(e) => updateField("date_debut", formData.toute_journee ? `${e.target.value}T00:00` : e.target.value)}
                />
              </div>
              <div>
                <Label>Fin *</Label>
                <Input
                  type={formData.toute_journee ? "date" : "datetime-local"}
                  value={formData.toute_journee ? formData.date_fin.slice(0, 10) : formData.date_fin}
                  onChange={(e) => updateField("date_fin", formData.toute_journee ? `${e.target.value}T23:59` : e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Lieu</Label>
              <Input value={formData.lieu} onChange={(e) => updateField("lieu", e.target.value)} placeholder="Lieu de l'événement" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={(e) => updateField("description", e.target.value)} rows={3} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90">
                {editingEvent ? "Enregistrer" : "Créer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
