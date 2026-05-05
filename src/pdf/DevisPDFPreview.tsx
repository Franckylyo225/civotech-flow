import { useState, lazy, Suspense } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Settings, Loader2 } from "lucide-react";
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer";
import { DevisPDF } from "./DevisPDF";
import { DevisStatutBadge } from "@/components/devis/DevisStatutBadge";
import { useNavigate } from "react-router-dom";
import { usePdfCompanySettings } from "@/hooks/use-pdf-company-settings";
import type { Devis } from "@/types/devis";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  devis: Devis;
  validiteJours?: number;
  mission?: any;
  createdByName?: string;
}

export function DevisPDFPreview({ open, onOpenChange, devis, validiteJours, mission, createdByName }: Props) {
  const { settings } = usePdfCompanySettings();
  const navigate = useNavigate();
  const filename = `Devis-${devis.reference || devis.id}-${(devis.client?.nom || "client").replace(/\s+/g, "_")}.pdf`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] h-[92vh] p-0 flex flex-col gap-0">
        <DialogHeader className="px-5 py-3 border-b border-[#E5E7EB] flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <DialogTitle className="text-base">
              Aperçu PDF · {devis.reference || devis.id}
            </DialogTitle>
            <DevisStatutBadge statut={devis.statut} />
          </div>
          <div className="flex items-center gap-2 mr-8">
            <Button variant="ghost" size="sm" onClick={() => { onOpenChange(false); navigate("/parametres"); }}>
              <Settings className="mr-1.5 h-4 w-4" /> Personnaliser
            </Button>
            {open && (
              <PDFDownloadLink
                document={<DevisPDF devis={devis} companySettings={settings} validiteJours={validiteJours} mission={mission} createdByName={createdByName} />}
                fileName={filename}
              >
                {({ loading }) => (
                  <Button size="sm">
                    {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
                    Télécharger PDF
                  </Button>
                )}
              </PDFDownloadLink>
            )}
          </div>
        </DialogHeader>
        <div className="flex-1 bg-[#E8E8E8] p-6 overflow-auto flex justify-center">
          {open && (
            <PDFViewer width="100%" height="100%" style={{ border: "none", borderRadius: 8, minHeight: 700 }} showToolbar={false}>
              <DevisPDF devis={devis} companySettings={settings} validiteJours={validiteJours} mission={mission} createdByName={createdByName} />
            </PDFViewer>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
