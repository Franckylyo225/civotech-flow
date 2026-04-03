import { Shield, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ROLES = ["DG", "COMMERCIAL", "LOGISTIQUE", "FINANCE", "ACHATS", "ASSISTANTE", "MAINTENANCE", "ADMIN"] as const;

const MODULES = [
  "Tableau de bord",
  "Devis",
  "Opérations",
  "Clients",
  "Finance",
  "Achats",
  "Parc auto",
  "Maintenance",
  "Rapports",
  "Paramètres",
] as const;

type Permission = "lecture" | "creation" | "modification" | "validation" | "suppression";

const PERMISSIONS: Record<string, Record<string, Permission[]>> = {
  DG: {
    "Tableau de bord": ["lecture"],
    "Devis": ["lecture", "creation", "modification", "validation", "suppression"],
    "Opérations": ["lecture", "creation", "modification", "validation", "suppression"],
    "Clients": ["lecture", "creation", "modification", "suppression"],
    "Finance": ["lecture", "creation", "modification", "validation", "suppression"],
    "Achats": ["lecture", "creation", "modification", "validation", "suppression"],
    "Parc auto": ["lecture", "creation", "modification", "suppression"],
    "Maintenance": ["lecture", "creation", "modification", "suppression"],
    "Rapports": ["lecture"],
    "Paramètres": ["lecture", "modification"],
  },
  COMMERCIAL: {
    "Tableau de bord": ["lecture"],
    "Devis": ["lecture", "creation", "modification"],
    "Opérations": ["lecture", "creation"],
    "Clients": ["lecture", "creation", "modification"],
  },
  LOGISTIQUE: {
    "Tableau de bord": ["lecture"],
    "Opérations": ["lecture", "modification"],
    "Parc auto": ["lecture", "creation", "modification"],
    "Maintenance": ["lecture", "creation", "modification"],
  },
  FINANCE: {
    "Tableau de bord": ["lecture"],
    "Finance": ["lecture", "creation", "modification", "validation"],
    "Rapports": ["lecture"],
  },
  ACHATS: {
    "Tableau de bord": ["lecture"],
    "Achats": ["lecture", "creation", "modification"],
  },
  ASSISTANTE: {
    "Tableau de bord": ["lecture"],
  },
  MAINTENANCE: {
    "Tableau de bord": ["lecture"],
    "Maintenance": ["lecture", "creation", "modification"],
    "Parc auto": ["lecture"],
  },
  ADMIN: {
    "Tableau de bord": ["lecture"],
    "Devis": ["lecture", "creation", "modification", "validation", "suppression"],
    "Opérations": ["lecture", "creation", "modification", "validation", "suppression"],
    "Clients": ["lecture", "creation", "modification", "suppression"],
    "Finance": ["lecture", "creation", "modification", "validation", "suppression"],
    "Achats": ["lecture", "creation", "modification", "validation", "suppression"],
    "Parc auto": ["lecture", "creation", "modification", "suppression"],
    "Maintenance": ["lecture", "creation", "modification", "suppression"],
    "Rapports": ["lecture"],
    "Paramètres": ["lecture", "modification"],
  },
};

const PERM_LABELS: Record<Permission, { label: string; abbr: string; color: string }> = {
  lecture: { label: "Lecture", abbr: "L", color: "bg-info/10 text-info" },
  creation: { label: "Création", abbr: "C", color: "bg-success/10 text-success" },
  modification: { label: "Modification", abbr: "M", color: "bg-warning/10 text-warning" },
  validation: { label: "Validation", abbr: "V", color: "bg-primary/10 text-primary" },
  suppression: { label: "Suppression", abbr: "S", color: "bg-destructive/10 text-destructive" },
};

export default function RolesTab() {
  return (
    <div className="space-y-6">
      {/* Legend */}
      <Card className="border border-border shadow-none">
        <CardContent className="p-4">
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
        </CardContent>
      </Card>

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
                {ROLES.map(role => (
                  <TableHead key={role} className="text-center text-xs min-w-[100px]">{role}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {MODULES.map(module => (
                <TableRow key={module}>
                  <TableCell className="font-medium text-sm">{module}</TableCell>
                  {ROLES.map(role => {
                    const perms = PERMISSIONS[role]?.[module] || [];
                    return (
                      <TableCell key={role} className="text-center">
                        {perms.length > 0 ? (
                          <div className="flex items-center justify-center gap-0.5">
                            {perms.map(p => (
                              <Badge key={p} variant="outline" className={cn("border-0 text-[10px] font-bold w-5 h-5 flex items-center justify-center p-0", PERM_LABELS[p].color)}>
                                {PERM_LABELS[p].abbr}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <X className="h-3.5 w-3.5 text-muted-foreground/30 mx-auto" />
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Les permissions sont appliquées via les politiques de sécurité au niveau de la base de données (RLS).
        Pour modifier les permissions, contactez l'administrateur système.
      </p>
    </div>
  );
}
