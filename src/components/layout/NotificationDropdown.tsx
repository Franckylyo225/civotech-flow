import { Bell, Check, CheckCheck, Trash2, FileText, Wrench, ShieldCheck, Info, PackageCheck } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const TYPE_CONFIG: Record<string, { icon: typeof Bell; color: string }> = {
  INFO: { icon: Info, color: "text-info" },
  ALERTE: { icon: Wrench, color: "text-warning" },
  VALIDATION: { icon: ShieldCheck, color: "text-primary" },
  CONSOLIDATION: { icon: PackageCheck, color: "text-success" },
  RAPPEL: { icon: Bell, color: "text-warning" },
  SYSTEM: { icon: FileText, color: "text-muted-foreground" },
};

export function NotificationDropdown() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleClick = (notif: { id: string; lien: string; lue: boolean }) => {
    if (!notif.lue) markAsRead(notif.id);
    if (notif.lien) {
      setOpen(false);
      navigate(notif.lien);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={markAllAsRead}>
              <CheckCheck className="h-3.5 w-3.5" /> Tout marquer lu
            </Button>
          )}
        </div>

        {/* List */}
        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">Aucune notification</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notif) => {
                const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.INFO;
                const Icon = config.icon;
                return (
                  <div
                    key={notif.id}
                    className={cn(
                      "flex gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors",
                      !notif.lue && "bg-primary/5"
                    )}
                    onClick={() => handleClick(notif)}
                  >
                    <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted", config.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-sm leading-tight", !notif.lue ? "font-semibold text-foreground" : "text-foreground/80")}>
                          {notif.titre}
                        </p>
                        <div className="flex items-center gap-1 shrink-0">
                          {!notif.lue && (
                            <button
                              className="p-0.5 rounded hover:bg-muted"
                              onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                              title="Marquer comme lu"
                            >
                              <Check className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          )}
                          <button
                            className="p-0.5 rounded hover:bg-muted"
                            onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                            title="Supprimer"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                      <p className="text-[11px] text-muted-foreground/60 mt-1">
                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: fr })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-border px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground"
            onClick={() => { setOpen(false); navigate("/notifications"); }}
          >
            Voir toutes les notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
