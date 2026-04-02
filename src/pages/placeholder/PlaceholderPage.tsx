import { Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md text-center border-dashed">
        <CardContent className="p-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Construction className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          <p className="mt-2 text-muted-foreground">
            {description || "Ce module sera bientôt disponible."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
