import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import AlertsProvider from "@/components/AlertsProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "ValuEngine — Analyse financière IA pour investisseurs français",
  description: "Valorisez n'importe quelle action en secondes : DCF, SWOT, PESTLE et verdicts IA. L'outil d'analyse boursière simplifié pour les investisseurs particuliers français.",
  keywords: ["analyse boursière", "valorisation action", "DCF", "investissement", "bourse france", "analyse financière", "valeur intrinsèque"],
  openGraph: {
    title: "ValuEngine — Analyse financière IA pour investisseurs français",
    description: "Valorisez n'importe quelle action en secondes : DCF, SWOT, PESTLE et verdicts IA. L'outil d'analyse boursière simplifié pour les investisseurs particuliers français.",
    type: "website",
    url: "https://valuengine.io",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ValuEngine — Analyse financière IA pour investisseurs français",
    description: "Valorisez n'importe quelle action en secondes : DCF, SWOT, PESTLE et verdicts IA.",
  },
  icons: {
    icon: "/favicon.svg",
  },
};

const clerkAppearance = {
  variables: {
    colorPrimary: "#C9A84C",
    colorBackground: "#0a1628",
    colorText: "#ffffff",
    colorTextSecondary: "#a0aec0",
    borderRadius: "0.75rem",
  },
  elements: {
    userButtonPopoverCard: "bg-[#0f1f3d] border border-[#C9A84C]/30 shadow-xl",
    userButtonPopoverActionButton: "hover:bg-[#C9A84C]/10",
    userButtonPopoverActionButtonText: "!text-white font-medium",
    userButtonPopoverActionButtonIcon: "!text-[#C9A84C]",
    userButtonPopoverFooter: "hidden",
    badge: "hidden",
    userPreviewMainIdentifier: "!text-white font-bold",
    userPreviewSecondaryIdentifier: "!text-[#a0aec0]",
    userButtonAvatarBox: "ring-2 ring-[#C9A84C]",
    profileSectionTitle: "!text-white",
    profileSectionTitleText: "!text-white font-semibold",
    profileSectionContent: "!text-[#a0aec0]",
    formFieldLabel: "!text-white",
    formFieldInput: "!bg-[#1a2d4d] !text-white !border-[#C9A84C]/30",
    headerTitle: "!text-white font-bold",
    headerSubtitle: "!text-[#a0aec0]",
    identityPreviewText: "!text-white",
    identityPreviewEditButton: "!text-[#C9A84C]",
    formButtonPrimary: "bg-[#C9A84C] text-[#0a1628] font-bold",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider afterSignOutUrl="/" appearance={clerkAppearance}>
      <html lang="fr">
        <body>
          {children}
          <AlertsProvider />
        </body>
      </html>
    </ClerkProvider>
  );
}
