import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import AlertsProvider from "@/components/AlertsProvider";
import PostHogProvider from "@/components/PostHogProvider";
import CommandPalette from "@/components/CommandPalette";
import "./globals.css";

export const metadata: Metadata = {
  title: "ValuEngine — Analyse boursière IA pour investisseurs français",
  description: "Valorise n'importe quelle action en 60 secondes : DCF interactif, analyse IA Bull/Bear, SWOT et PESTLE. L'outil d'analyse fondamentale en français.",
  keywords: ["analyse boursière", "valorisation action", "DCF", "investissement", "bourse france", "analyse financière", "valeur intrinsèque"],
  metadataBase: new URL("https://valuengine.fr"),
  openGraph: {
    title: "ValuEngine — Analyse boursière IA pour investisseurs français",
    description: "Valorise n'importe quelle action en 60 secondes : DCF interactif, analyse IA Bull/Bear, SWOT et PESTLE. L'outil d'analyse fondamentale en français.",
    type: "website",
    url: "https://valuengine.fr",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ValuEngine — Analyse boursière IA pour investisseurs français",
    description: "Valorise n'importe quelle action en 60 secondes : DCF interactif, analyse IA Bull/Bear, SWOT et PESTLE.",
  },
  icons: {
    icon: "/favicon.svg",
  },
};

const clerkAppearance = {
  variables: {
    colorPrimary: "#C9A84C",
    colorBackground: "#18181b",
    colorText: "#e4e4e7",
    colorTextSecondary: "#a1a1aa",
    colorInputBackground: "#27272a",
    colorInputText: "#e4e4e7",
    borderRadius: "0.75rem",
  },
  elements: {
    card: "!bg-[#18181b] !border !border-[#27272a] !shadow-2xl",
    userButtonPopoverCard: "!bg-[#18181b] !border !border-[#27272a] !shadow-2xl",
    userButtonPopoverActionButton: "!text-[#e4e4e7] hover:!bg-[rgba(201,168,76,0.08)]",
    userButtonPopoverActionButtonText: "!text-[#e4e4e7] !font-medium",
    userButtonPopoverActionButtonIcon: "!text-[#C9A84C]",
    userButtonPopoverFooter: "hidden",
    badge: "hidden",
    userPreviewMainIdentifier: "!text-white !font-bold",
    userPreviewSecondaryIdentifier: "!text-[#a1a1aa]",
    profileSectionTitle: "!text-white",
    profileSectionTitleText: "!text-white !font-semibold",
    profileSectionContent: "!text-[#a1a1aa]",
    formFieldLabel: "!text-[#e4e4e7]",
    formFieldInput: "!bg-[#27272a] !text-[#e4e4e7] !border-[#3f3f46]",
    headerTitle: "!text-white !font-bold",
    headerSubtitle: "!text-[#a1a1aa]",
    identityPreviewText: "!text-white",
    identityPreviewEditButton: "!text-[#C9A84C]",
    formButtonPrimary: "!bg-[#C9A84C] !text-black !font-bold",
    modalContent: "!bg-[#18181b]",
    modalBackdrop: "!bg-black/60",
    navbarButton: "!text-[#e4e4e7] hover:!text-white",
    navbarButtonIcon: "!text-[#C9A84C]",
    menuButton: "!text-[#e4e4e7] hover:!bg-[#27272a]",
    menuItem: "!text-[#e4e4e7] hover:!bg-[#27272a]",
    avatarBox: "!ring-2 !ring-[#C9A84C]/50",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider afterSignOutUrl="/" appearance={clerkAppearance}>
      <html lang="fr">
        <body>
          {children}
          <AlertsProvider />
          <PostHogProvider />
          <CommandPalette />
        </body>
      </html>
    </ClerkProvider>
  );
}
