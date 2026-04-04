import { useNotifications, type Notification } from "@/hooks/use-notifications";
import { useNavigate } from "react-router-dom";
import { Bell, Check, CheckCheck, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const typeConfig: Record<string, { label: string; variant: "default" | "destructive" | "secondary" | "outline" }> = {
  VALIDATION: { label: "Validation", variant: "destructive" },
  ALERTE: { label: "Alerte", variant: "destructive" },
  INFO: { label: "Info", variant: "secondary" },
};

function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  onNavigate,
}: {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate: (lien: string) => void;
}) {
  const cfg = typeConfig[notification.type] || typeConfig.INFO;

  return (
    <Card
      className={cn(
        "flex items-start gap-4 p-4 transition-colors",
        !notification.lue && "border-primary/30 bg-primary/5"
      )}
    >
      <div className={cn(
        "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
        !notification.lue ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
      )}>
        <Bell className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("text-sm font-semibold", notification.lue && "text-muted-foreground")}>
            {notification.titre}
          </span>
          <Badge variant={cfg.variant} className="text-[10px] px-1.5 py-0">
            {cfg.label}
          </Badge>
          {!notification.lue && (
            <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
          )}
        </div>
        <p className="text-sm text-muted-foreground">{notification.message}</p>
        <p className="text-xs text-muted-foreground/70">
          {format(new Date(notification.created_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {notification.lien && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onNavigate(notification.lien)} title="Voir">
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}
        {!notification.lue && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onMarkAsRead(notification.id)} title="Marquer comme lue">
            <Check className="h-4 w-4" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onDelete(notification.id)} title="Supprimer">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

export default function NotificationsPage() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const navigate = useNavigate();

  const handleNavigate = (lien: string) => {
    if (lien) navigate(lien);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}` : "Aucune notification non lue"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Tout marquer comme lu
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-20 animate-pulse bg-muted" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">Aucune notification</p>
          <p className="text-sm text-muted-foreground/70">Vous serez notifié des événements importants ici.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onMarkAsRead={markAsRead}
              onDelete={deleteNotification}
              onNavigate={handleNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
