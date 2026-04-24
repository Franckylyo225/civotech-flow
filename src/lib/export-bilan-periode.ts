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

export interface BilanCompanyInfo {
  nom?: string;
  logo_url?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  site_web?: string;
}

export interface BilanExportOptions {
  rows: BilanRow[];
  stats: BilanStats;
  periodeLabel: string;
  from?: Date;
  to?: Date;
  company?: BilanCompanyInfo;
}

function periodeRange({ from, to }: { from?: Date; to?: Date }) {
  if (!from || !to) return "Toutes périodes";
  return `${format(from, "dd/MM/yyyy", { locale: fr })} → ${format(to, "dd/MM/yyyy", { locale: fr })}`;
}

async function loadImageAsDataUrl(src: string): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const blob = await res.blob();
    const data: string = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.width, h: img.height });
      img.onerror = () => resolve({ w: 0, h: 0 });
      img.src = data;
    });
    return { data, w: dims.w, h: dims.h };
  } catch {
    return null;
  }
}

export async function exportBilanPdf({ rows, stats, periodeLabel, from, to, company }: BilanExportOptions) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Brand colors (primary green from app)
  const PRIMARY: [number, number, number] = [16, 185, 129];

  // ── Top brand band ──
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageWidth, 4, "F");

  // ── Logo ──
  const logoSrc = company?.logo_url && company.logo_url.length > 0 ? company.logo_url : "/logo-civotech.png";
  const logo = await loadImageAsDataUrl(logoSrc);
  let textStartX = margin;
  if (logo && logo.w > 0 && logo.h > 0) {
    const targetH = 14;
    const targetW = Math.min(48, (logo.w / logo.h) * targetH);
    try {
      const ext = logo.data.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
      doc.addImage(logo.data, ext, margin, 12, targetW, targetH);
      textStartX = margin + targetW + 6;
    } catch { /* ignore */ }
  }

  // Company name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(company?.nom || "CIVOTECH", textStartX, 18);

  // Company contact line
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  const contactBits: string[] = [];
  if (company?.adresse) contactBits.push(company.adresse);
  if (company?.telephone) contactBits.push(company.telephone);
  if (company?.email) contactBits.push(company.email);
  if (company?.site_web) contactBits.push(company.site_web);
  if (contactBits.length === 0) contactBits.push("Transport & Logistique");
  doc.text(contactBits.join("  •  "), textStartX, 23);

  // ── Document title (right) ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...PRIMARY);
  doc.text("Flux Opérations", pageWidth - margin, 18, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  doc.text("Bilan par période", pageWidth - margin, 23, { align: "right" });

  // ── Separator ──
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.6);
  doc.line(margin, 30, pageWidth - margin, 30);

  // ── Period meta ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text(`Période : ${periodeLabel}`, margin, 38);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(90, 90, 90);
  doc.text(periodeRange({ from, to }), margin, 43);

  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  doc.text(`Exporté le ${format(new Date(), "dd/MM/yyyy à HH:mm", { locale: fr })}`, pageWidth - margin, 43, { align: "right" });

  // KPI summary
  autoTable(doc, {
    startY: 49,
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

  // ── Footer paginé ──
  const pageCount = doc.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...PRIMARY);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text(`${company?.nom || "CIVOTECH"} — Flux Opérations`, margin, pageHeight - 7);
    doc.text(`Page ${i} / ${pageCount}`, pageWidth - margin, pageHeight - 7, { align: "right" });
  }

  doc.setProperties({ title: `Flux Opérations — ${periodeLabel}`, subject: "Bilan par période", author: company?.nom || "CIVOTECH" });
  doc.save(`flux-operations-${periodeLabel.toLowerCase().replace(/\s+/g, "-")}-${format(new Date(), "yyyyMMdd-HHmm")}.pdf`);
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
