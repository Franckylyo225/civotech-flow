import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { OPERATION_STATUT_CONFIG, formatMontantOp, formatDateShort } from "@/types/operations";

export interface BilanRow {
  reference: string;
  clientNom: string;
  dateLivraisonReelle: string | null;
  statut: keyof typeof OPERATION_STATUT_CONFIG;
  recettes: number;
  depenses: number;
  marge: number;
}

export interface BilanStats {
  nbOps: number;
  nbConsolidees: number;
  totalRecettes: number;
  totalDepenses: number;
  marge: number;
}

export interface BilanExportOptions {
  rows: BilanRow[];
  stats: BilanStats;
  periodeLabel: string;
  from?: Date;
  to?: Date;
}

function periodeRange({ from, to }: { from?: Date; to?: Date }) {
  if (!from || !to) return "Toutes périodes";
  return `${format(from, "dd/MM/yyyy", { locale: fr })} → ${format(to, "dd/MM/yyyy", { locale: fr })}`;
}

export function exportBilanPdf({ rows, stats, periodeLabel, from, to }: BilanExportOptions) {
  const doc = new jsPDF();
  const margin = 14;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(16, 185, 129);
  doc.text("Bilan par période", margin, 20);

  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text(`Période : ${periodeLabel}`, margin, 28);
  doc.text(periodeRange({ from, to }), margin, 33);

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Exporté le ${format(new Date(), "dd/MM/yyyy à HH:mm", { locale: fr })}`, margin, 39);

  // KPI summary
  autoTable(doc, {
    startY: 44,
    head: [["Indicateur", "Valeur"]],
    body: [
      ["Opérations", `${stats.nbOps} (${stats.nbConsolidees} consolidées)`],
      ["Recettes", formatMontantOp(stats.totalRecettes)],
      ["Dépenses", formatMontantOp(stats.totalDepenses)],
      ["Marge", formatMontantOp(stats.marge)],
      ["Marge %", stats.totalRecettes > 0 ? `${Math.round((stats.marge / stats.totalRecettes) * 100)}%` : "—"],
    ],
    theme: "grid",
    headStyles: { fillColor: [16, 185, 129], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    margin: { left: margin, right: margin },
  });

  // Détail
  const finalY = (doc as any).lastAutoTable?.finalY ?? 80;
  autoTable(doc, {
    startY: finalY + 8,
    head: [["Référence", "Client", "Livraison", "Statut", "Recettes", "Dépenses", "Marge"]],
    body: rows.map(r => [
      r.reference,
      r.clientNom,
      r.dateLivraisonReelle ? formatDateShort(r.dateLivraisonReelle) : "—",
      OPERATION_STATUT_CONFIG[r.statut]?.label ?? r.statut,
      formatMontantOp(r.recettes),
      formatMontantOp(r.depenses),
      formatMontantOp(r.marge),
    ]),
    theme: "striped",
    headStyles: { fillColor: [16, 185, 129], fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
    },
    margin: { left: margin, right: margin },
  });

  doc.save(`bilan-${periodeLabel.toLowerCase().replace(/\s+/g, "-")}-${format(new Date(), "yyyyMMdd-HHmm")}.pdf`);
}

export function exportBilanExcel({ rows, stats, periodeLabel, from, to }: BilanExportOptions) {
  const wb = XLSX.utils.book_new();

  // Feuille synthèse
  const synthese = [
    ["Bilan par période"],
    ["Période", periodeLabel],
    ["Plage", periodeRange({ from, to })],
    ["Exporté le", format(new Date(), "dd/MM/yyyy HH:mm", { locale: fr })],
    [],
    ["Indicateur", "Valeur"],
    ["Opérations", stats.nbOps],
    ["Consolidées", stats.nbConsolidees],
    ["Recettes (FCFA)", stats.totalRecettes],
    ["Dépenses (FCFA)", stats.totalDepenses],
    ["Marge (FCFA)", stats.marge],
    ["Marge %", stats.totalRecettes > 0 ? Math.round((stats.marge / stats.totalRecettes) * 100) / 100 : 0],
  ];
  const wsSynthese = XLSX.utils.aoa_to_sheet(synthese);
  wsSynthese["!cols"] = [{ wch: 24 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, wsSynthese, "Synthèse");

  // Feuille détail
  const detail = [
    ["Référence", "Client", "Livraison", "Statut", "Recettes (FCFA)", "Dépenses (FCFA)", "Marge (FCFA)"],
    ...rows.map(r => [
      r.reference,
      r.clientNom,
      r.dateLivraisonReelle ? format(new Date(r.dateLivraisonReelle), "dd/MM/yyyy", { locale: fr }) : "",
      OPERATION_STATUT_CONFIG[r.statut]?.label ?? r.statut,
      r.recettes,
      r.depenses,
      r.marge,
    ]),
  ];
  const wsDetail = XLSX.utils.aoa_to_sheet(detail);
  wsDetail["!cols"] = [
    { wch: 14 }, { wch: 28 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, wsDetail, "Détail");

  XLSX.writeFile(wb, `bilan-${periodeLabel.toLowerCase().replace(/\s+/g, "-")}-${format(new Date(), "yyyyMMdd-HHmm")}.xlsx`);
}
