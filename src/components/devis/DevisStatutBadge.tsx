import { DEVIS_STATUT_CONFIG, type DevisStatut } from "@/types/devis";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DevisStatutBadgeProps {
  statut: DevisStatut;
  className?: string;
}

export function DevisStatutBadge({ statut, className }: DevisStatutBadgeProps) {
  const config = DEVIS_STATUT_CONFIG[statut];
  return (
    <Badge variant="outline" className={cn("font-medium border-0", config.bgColor, config.color, className)}>
      {config.label}
    </Badge>
  );
}
