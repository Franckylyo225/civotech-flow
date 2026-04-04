import { useState } from "react";
import {
  HelpCircle,
  Search,
  FileText,
  Truck,
  Wallet,
  ShoppingCart,
  Package,
  Calendar,
  BarChart3,
  Settings,
  Users,
  ClipboardCheck,
  ChevronRight,
  BookOpen,
  ArrowLeft,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { LucideIcon } from "lucide-react";

interface Article {
  id: string;
  title: string;
  content: string;
  tags?: string[];
}

interface Category {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  articles: Article[];
}

const categories: Category[] = [
  {
    id: "demarrage",
    label: "Prise en main",
    icon: BookOpen,
    description: "Les bases pour bien démarrer sur la plateforme",
    articles: [
      {
        id: "d1",
        title: "Première connexion",
        content:
          "Lors de votre première connexion, utilisez les identifiants fournis par votre administrateur (email + mot de passe). Vous serez redirigé vers le tableau de bord correspondant à votre rôle. Vous pouvez modifier votre mot de passe depuis la page Profil accessible en haut à droite.",
        tags: ["connexion", "mot de passe"],
      },
      {
        id: "d2",
        title: "Comprendre les rôles",
        content:
          "Civotech Flow utilise 6 rôles principaux :\n\n• **DG** – Accès complet : validation des devis, décaissements, vue globale.\n• **Commercial** – Création et suivi des devis, gestion des clients.\n• **Logistique** – Gestion des opérations de transport, parc auto.\n• **Finance** – Facturation, décaissements, comptabilité.\n• **Achats** – Demandes d'achat, gestion des fournisseurs.\n• **Assistante DG** – Calendrier et organisation du DG.\n\nChaque rôle dispose d'un menu de navigation adapté.",
        tags: ["rôles", "permissions"],
      },
      {
        id: "d3",
        title: "Naviguer dans l'application",
        content:
          "La barre latérale gauche affiche les modules accessibles selon votre rôle. La barre supérieure contient les notifications (icône cloche) et l'accès à votre profil. Les badges numériques sur la sidebar indiquent les éléments nécessitant votre attention.",
        tags: ["navigation", "sidebar"],
      },
    ],
  },
  {
    id: "devis",
    label: "Devis",
    icon: FileText,
    description: "Créer, soumettre et suivre les devis clients",
    articles: [
      {
        id: "dv1",
        title: "Créer un nouveau devis",
        content:
          "1. Allez dans **Devis** → cliquez sur **Nouveau devis**.\n2. Sélectionnez le client (ou créez-en un nouveau).\n3. Ajoutez les lignes de prestation depuis la grille tarifaire ou manuellement.\n4. Configurez la remise et la TVA si nécessaire.\n5. Le devis est enregistré en **Brouillon**.\n\nVous pouvez le modifier à tout moment tant qu'il est en brouillon.",
        tags: ["création", "brouillon"],
      },
      {
        id: "dv2",
        title: "Soumettre un devis au DG",
        content:
          "Depuis la fiche du devis, cliquez sur **Soumettre au DG**. Le statut passe à « Soumis DG » et une notification est envoyée au DG pour validation. Le DG peut ensuite approuver ou refuser le devis avec un commentaire.",
        tags: ["validation", "DG"],
      },
      {
        id: "dv3",
        title: "Grille tarifaire",
        content:
          "La grille tarifaire centralise vos prestations types avec leurs prix unitaires. Elle est accessible depuis le module Devis. Les éléments de la grille peuvent être insérés directement dans un devis pour accélérer la saisie.",
        tags: ["tarifs", "prestations"],
      },
      {
        id: "dv4",
        title: "Cycle de vie d'un devis",
        content:
          "Brouillon → Soumis DG → Approuvé DG / Refusé DG → Envoyé client → Validé client / Refusé client → Archivé.\n\nÀ chaque changement de statut, les parties concernées reçoivent une notification.",
        tags: ["statut", "workflow"],
      },
    ],
  },
  {
    id: "operations",
    label: "Opérations",
    icon: Truck,
    description: "Planifier et suivre les opérations de transport",
    articles: [
      {
        id: "op1",
        title: "Créer une opération",
        content:
          "Une opération est créée automatiquement à partir d'un devis validé, ou manuellement depuis le module Opérations. Renseignez le client, les lieux d'embarquement et de livraison, la nature de la marchandise et les dates prévues.",
        tags: ["création", "transport"],
      },
      {
        id: "op2",
        title: "Affecter un camion et un chauffeur",
        content:
          "Depuis la fiche opération, assignez un véhicule disponible et un chauffeur. Le système vérifie automatiquement leur disponibilité. Une fois l'opération en cours, le camion et le chauffeur passent en statut « En mission ».",
        tags: ["affectation", "camion", "chauffeur"],
      },
      {
        id: "op3",
        title: "Suivi et timeline",
        content:
          "Chaque opération possède une timeline traçant les événements clés : départ, étapes intermédiaires, livraison. Vous pouvez ajouter des dépenses (carburant, péage) et signaler des incidents directement depuis la fiche.",
        tags: ["suivi", "timeline", "dépenses"],
      },
    ],
  },
  {
    id: "finance",
    label: "Finance & Comptabilité",
    icon: Wallet,
    description: "Facturation, décaissements et suivi financier",
    articles: [
      {
        id: "fi1",
        title: "Créer une facture",
        content:
          "Les factures peuvent être générées à partir d'une opération terminée. Accédez au module **Finance** → onglet **Factures** → **Nouvelle facture**. Renseignez le montant, le client et les conditions de paiement. La facture est créée en brouillon.",
        tags: ["facture", "création"],
      },
      {
        id: "fi2",
        title: "Gérer les décaissements",
        content:
          "Un décaissement représente une sortie d'argent (fournisseur, dépense, etc.). Les décaissements en attente nécessitent la validation du DG avant d'être payés. Accédez à l'onglet **Décaissements** pour créer, suivre et valider les paiements sortants.",
        tags: ["décaissement", "paiement"],
      },
      {
        id: "fi3",
        title: "Charges fixes et salaires",
        content:
          "Le module Finance permet de gérer les charges récurrentes (loyer, assurances, carburant) et la paie des employés. Les charges fixes sont configurées une fois et génèrent des entrées mensuelles automatiques.",
        tags: ["charges", "salaires"],
      },
    ],
  },
  {
    id: "achats",
    label: "Achats",
    icon: ShoppingCart,
    description: "Demandes d'achat, fournisseurs et approvisionnement",
    articles: [
      {
        id: "ac1",
        title: "Créer une demande d'achat",
        content:
          "Depuis **Achats** → **Nouvelle demande**, renseignez la désignation, la quantité, le montant estimé et le niveau d'urgence. La demande suit un workflow de validation : Brouillon → Soumise → Devis fournisseurs → Soumise DG → Validée → Décaissement → Payée.",
        tags: ["demande", "achat"],
      },
      {
        id: "ac2",
        title: "Comparer les devis fournisseurs",
        content:
          "Pour chaque demande d'achat, vous pouvez solliciter plusieurs fournisseurs et comparer leurs offres. Sélectionnez le devis retenu avant de soumettre la demande au DG pour validation finale.",
        tags: ["fournisseurs", "comparaison"],
      },
    ],
  },
  {
    id: "parc",
    label: "Gestion du Parc",
    icon: Package,
    description: "Véhicules, chauffeurs et maintenance",
    articles: [
      {
        id: "pa1",
        title: "Ajouter un véhicule",
        content:
          "Depuis **Gestion du Parc** → onglet **Véhicules** → **Ajouter un véhicule**. Renseignez l'immatriculation, la marque, le modèle, l'année et la capacité en tonnes. Le statut est automatiquement calculé selon les opérations et maintenances en cours.",
        tags: ["véhicule", "ajout"],
      },
      {
        id: "pa2",
        title: "Planifier une maintenance",
        content:
          "Depuis l'onglet **Maintenance**, créez une intervention préventive ou corrective. Indiquez le véhicule, la date prévue, le coût estimé et la description des travaux. Le véhicule passera automatiquement en statut « En maintenance ».",
        tags: ["maintenance", "planification"],
      },
      {
        id: "pa3",
        title: "Gérer les chauffeurs",
        content:
          "L'onglet **Chauffeurs** permet d'ajouter, modifier et suivre vos conducteurs. Vous pouvez y renseigner le permis, l'expérience et assigner un véhicule par défaut. Le statut du chauffeur est mis à jour automatiquement selon les opérations actives.",
        tags: ["chauffeur", "permis"],
      },
    ],
  },
  {
    id: "approbations",
    label: "Approbations (DG)",
    icon: ClipboardCheck,
    description: "Valider ou refuser les demandes en attente",
    articles: [
      {
        id: "ap1",
        title: "Valider un devis",
        content:
          "Depuis la page **Approbations** ou la fiche du devis, le DG peut approuver ou refuser un devis soumis. En cas de refus, un commentaire est obligatoire. Le commercial est notifié du résultat.",
        tags: ["validation", "devis"],
      },
      {
        id: "ap2",
        title: "Approuver un décaissement",
        content:
          "Les décaissements en attente apparaissent dans la page Approbations. Le DG peut les approuver pour autoriser le paiement, ou les rejeter avec un motif.",
        tags: ["décaissement", "approbation"],
      },
    ],
  },
  {
    id: "calendrier",
    label: "Calendrier",
    icon: Calendar,
    description: "Planifier réunions, RDV et rappels",
    articles: [
      {
        id: "ca1",
        title: "Créer un événement",
        content:
          "Cliquez sur une date dans le calendrier ou sur **Nouvel événement**. Choisissez le type (réunion, RDV, déplacement, rappel), renseignez le titre, les dates et optionnellement un lieu et un rappel automatique.",
        tags: ["événement", "réunion"],
      },
    ],
  },
  {
    id: "rapports",
    label: "Rapports",
    icon: BarChart3,
    description: "Tableaux de bord et indicateurs clés",
    articles: [
      {
        id: "ra1",
        title: "Consulter les rapports",
        content:
          "Le module Rapports offre une vue synthétique de l'activité : chiffre d'affaires, opérations réalisées, taux de conversion des devis, état du parc auto. Les données sont filtrables par période.",
        tags: ["KPI", "statistiques"],
      },
    ],
  },
  {
    id: "parametres",
    label: "Paramètres",
    icon: Settings,
    description: "Configuration de l'entreprise et des utilisateurs",
    articles: [
      {
        id: "se1",
        title: "Configurer l'entreprise",
        content:
          "Depuis **Paramètres** → onglet **Entreprise**, renseignez le nom, l'adresse, le téléphone, l'email et le logo de votre société. Ces informations apparaissent sur les devis et factures générés.",
        tags: ["entreprise", "configuration"],
      },
      {
        id: "se2",
        title: "Gérer les utilisateurs",
        content:
          "L'onglet **Utilisateurs** (réservé au DG) permet de créer de nouveaux comptes, d'attribuer des rôles et de désactiver des accès. Chaque utilisateur reçoit un email avec ses identifiants de connexion.",
        tags: ["utilisateurs", "comptes"],
      },
    ],
  },
];

export default function CentreAidePage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const normalizedSearch = search.toLowerCase().trim();

  const filteredCategories = categories
    .map((cat) => ({
      ...cat,
      articles: cat.articles.filter(
        (a) =>
          !normalizedSearch ||
          a.title.toLowerCase().includes(normalizedSearch) ||
          a.content.toLowerCase().includes(normalizedSearch) ||
          a.tags?.some((t) => t.toLowerCase().includes(normalizedSearch))
      ),
    }))
    .filter((cat) => cat.articles.length > 0);

  const activeCategory = selectedCategory
    ? filteredCategories.find((c) => c.id === selectedCategory)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <HelpCircle className="h-6 w-6 text-primary" /> Centre d'aide
        </h1>
        <p className="text-sm text-muted-foreground">
          Base de connaissances pour prendre en main Civotech Flow
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher un sujet, mot-clé…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelectedCategory(null);
          }}
          className="pl-10"
        />
      </div>

      {/* Back button when viewing a category */}
      {activeCategory && !normalizedSearch && (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={() => setSelectedCategory(null)}
        >
          <ArrowLeft className="h-4 w-4" /> Toutes les catégories
        </Button>
      )}

      {/* Category grid OR article list */}
      {!activeCategory || normalizedSearch ? (
        normalizedSearch ? (
          /* Search results */
          <div className="space-y-4">
            {filteredCategories.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Aucun résultat pour « {search} »
                </CardContent>
              </Card>
            ) : (
              filteredCategories.map((cat) => (
                <div key={cat.id} className="space-y-2">
                  <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <cat.icon className="h-4 w-4" /> {cat.label}
                  </h2>
                  <Accordion type="multiple" className="space-y-1">
                    {cat.articles.map((article) => (
                      <AccordionItem key={article.id} value={article.id} className="border rounded-lg px-4">
                        <AccordionTrigger className="text-sm font-medium hover:no-underline">
                          {article.title}
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-line">
                            {article.content.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                              part.startsWith("**") && part.endsWith("**") ? (
                                <strong key={i} className="text-foreground font-semibold">
                                  {part.slice(2, -2)}
                                </strong>
                              ) : (
                                <span key={i}>{part}</span>
                              )
                            )}
                          </div>
                          {article.tags && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {article.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-[10px]">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Category grid */
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => (
              <Card
                key={cat.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setSelectedCategory(cat.id)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <cat.icon className="h-5 w-5 text-primary" />
                    {cat.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{cat.description}</p>
                  <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                    {cat.articles.length} article{cat.articles.length > 1 ? "s" : ""}
                    <ChevronRight className="h-3 w-3" />
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        /* Single category view */
        <div className="space-y-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <activeCategory.icon className="h-5 w-5 text-primary" />
            {activeCategory.label}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">{activeCategory.description}</p>
          <ScrollArea className="max-h-[60vh]">
            <Accordion type="multiple" className="space-y-1">
              {activeCategory.articles.map((article) => (
                <AccordionItem key={article.id} value={article.id} className="border rounded-lg px-4">
                  <AccordionTrigger className="text-sm font-medium hover:no-underline">
                    {article.title}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-line">
                      {article.content.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                        part.startsWith("**") && part.endsWith("**") ? (
                          <strong key={i} className="text-foreground font-semibold">
                            {part.slice(2, -2)}
                          </strong>
                        ) : (
                          <span key={i}>{part}</span>
                        )
                      )}
                    </div>
                    {article.tags && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {article.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[10px]">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
