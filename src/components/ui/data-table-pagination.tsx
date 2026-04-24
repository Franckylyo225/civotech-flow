import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Hook de pagination cohérent avec celui utilisé dans Stock Bureau.
 * - Slice paginé du tableau
 * - Reset automatique de la page quand les dépendances (filtres) changent
 * - Pages valides garanties (currentPage clampé)
 */
export function usePagination<T>(items: T[], initialPageSize = 25, resetDeps: unknown[] = []) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Reset à la page 1 quand un filtre change ou que la taille change
  useEffect(() => {
    setPage(1);
  }, [pageSize, ...resetDeps]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, items.length);
  const paginated = useMemo(() => items.slice(startIdx, endIdx), [items, startIdx, endIdx]);

  return {
    page: currentPage,
    pageSize,
    setPage,
    setPageSize,
    totalPages,
    startIdx,
    endIdx,
    paginated,
    total: items.length,
  };
}

interface DataTablePaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  startIdx: number;
  endIdx: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  pageSizeOptions?: number[];
  /** Mot affiché au pluriel — ex "factures", "véhicules" */
  itemLabel?: string;
  className?: string;
}

/**
 * Pied de tableau de pagination réutilisable.
 * À placer juste en-dessous d'un <Table> (à l'intérieur de la <Card> idéalement).
 */
export function DataTablePagination({
  page,
  pageSize,
  total,
  totalPages,
  startIdx,
  endIdx,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  itemLabel = "éléments",
  className = "",
}: DataTablePaginationProps) {
  if (total === 0) return null;

  return (
    <div
      className={`flex items-center justify-between gap-3 border-t border-border px-4 py-3 flex-wrap ${className}`}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Lignes par page :</span>
        <Select value={pageSize.toString()} onValueChange={(v) => onPageSizeChange(Number(v))}>
          <SelectTrigger className="h-8 w-[72px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((n) => (
              <SelectItem key={n} value={n.toString()}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="hidden sm:inline">
          · {startIdx + 1}-{endIdx} sur {total} {itemLabel}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">
          Page {page} / {totalPages}
        </span>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" /> Précédent
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
          >
            Suivant <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
