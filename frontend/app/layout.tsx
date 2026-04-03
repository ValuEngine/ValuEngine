import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import AlertsProvider from "@/components/AlertsProvider";
import PostHogProvider from "@/components/PostHogProvider";
import CommandPalette from "@/components/CommandPalette";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

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
    colorTextOnPrimaryBackground: "#09090b",
    colorInputBackground: "#27272a",
    colorInputText: "#e4e4e7",
    colorNeutral: "#e4e4e7",
    colorDanger: "#ef4444",
    colorSuccess: "#10b981",
    colorWarning: "#f59e0b",
    borderRadius: "0.75rem",
    fontFamily: "inherit",
  },
  elements: {
    // Global card
    card: "!bg-[#18181b] !border !border-[#27272a] !shadow-2xl",
    rootBox: "!text-[#e4e4e7]",

    // UserButton popover (small dropdown)
    userButtonPopoverCard: "!bg-[#18181b] !border !border-[#27272a] !shadow-2xl",
    userButtonPopoverActionButton: "!text-[#e4e4e7] hover:!bg-[rgba(201,168,76,0.08)]",
    userButtonPopoverActionButtonText: "!text-[#e4e4e7] !font-medium",
    userButtonPopoverActionButtonIcon: "!text-[#C9A84C]",
    userButtonPopoverFooter: "hidden",

    // User profile modal (Manage Account)
    modalContent: "!bg-[#18181b] !border !border-[#27272a]",
    modalBackdrop: "!bg-black/60",
    modalCloseButton: "!text-[#a1a1aa] hover:!text-white",

    // Profile page sections
    page: "!bg-[#18181b]",
    pageScrollBox: "!bg-[#18181b]",
    profilePage: "!bg-[#18181b]",
    profileSection__profile: "!border-[#27272a]",
    profileSection__connectedAccounts: "!border-[#27272a]",
    profileSection__danger: "!border-[#27272a]",

    // Navbar inside profile modal
    navbar: "!bg-[#18181b] !border-r !border-[#27272a]",
    navbarButton: "!text-[#a1a1aa] hover:!text-white hover:!bg-[#27272a]",
    navbarButtonIcon: "!text-[#C9A84C]",
    navbarButton__active: "!text-[#C9A84C] !bg-[rgba(201,168,76,0.08)]",

    // Headers
    headerTitle: "!text-white !font-bold",
    headerSubtitle: "!text-[#a1a1aa]",

    // Section titles and content
    profileSectionTitle: "!text-white !border-[#27272a]",
    profileSectionTitleText: "!text-white !font-semibold",
    profileSectionContent: "!text-[#a1a1aa]",
    profileSectionPrimaryButton: "!text-[#C9A84C] hover:!bg-[rgba(201,168,76,0.08)]",

    // Account items (connected accounts, email, etc.)
    accordionTriggerButton: "!text-[#e4e4e7] hover:!bg-[#27272a]",
    accordionContent: "!bg-[#18181b]",

    // Identity / user preview
    userPreviewMainIdentifier: "!text-white !font-bold",
    userPreviewSecondaryIdentifier: "!text-[#a1a1aa]",
    identityPreview: "!bg-[#18181b]",
    identityPreviewText: "!text-white",
    identityPreviewEditButton: "!text-[#C9A84C] hover:!text-[#e8c55a]",
    identityPreviewEditButtonIcon: "!text-[#C9A84C]",

    // Avatar
    avatarBox: "!ring-2 !ring-[#C9A84C]/50",
    avatarImageActionsUpload: "!text-[#C9A84C] !font-medium",
    avatarImageActionsRemove: "!text-[#ef4444]",
    fileDropAreaBox: "!bg-[#27272a] !border-[#3f3f46]",
    fileDropAreaIconBox: "!text-[#C9A84C]",
    fileDropAreaHint: "!text-[#a1a1aa]",
    fileDropAreaButtonPrimary: "!text-[#C9A84C] !font-semibold",

    // Forms
    formFieldLabel: "!text-[#e4e4e7]",
    formFieldInput: "!bg-[#27272a] !text-[#e4e4e7] !border-[#3f3f46] focus:!border-[#C9A84C]",
    formFieldHintText: "!text-[#71717a]",
    formFieldSuccessText: "!text-[#10b981]",
    formFieldErrorText: "!text-[#ef4444]",
    formButtonPrimary: "!bg-[#C9A84C] !text-[#09090b] !font-bold hover:!bg-[#b8943d]",
    formButtonReset: "!text-[#a1a1aa] hover:!text-white",

    // Badges
    badge: "!bg-[#27272a] !text-[#e4e4e7] !border-[#3f3f46]",
    badgePrimary: "!bg-[rgba(201,168,76,0.15)] !text-[#C9A84C] !border-[rgba(201,168,76,0.3)]",

    // Menu items and buttons
    menuButton: "!text-[#e4e4e7] hover:!bg-[#27272a]",
    menuItem: "!text-[#e4e4e7] hover:!bg-[#27272a]",
    menuList: "!bg-[#18181b] !border !border-[#27272a]",
    actionCard: "!bg-[#27272a] !border-[#3f3f46]",

    // Footer
    footer: "hidden",
    footerAction: "hidden",
    footerActionLink: "!text-[#C9A84C]",
    footerActionText: "!text-[#71717a]",

    // Other text elements
    socialButtonsBlockButton: "!bg-[#27272a] !border-[#3f3f46] !text-[#e4e4e7] hover:!bg-[#3f3f46]",
    socialButtonsBlockButtonText: "!text-[#e4e4e7]",
    otherMethodsBlockButton: "!bg-[#27272a] !border-[#3f3f46] !text-[#e4e4e7]",
    alertText: "!text-[#e4e4e7]",
    dividerLine: "!bg-[#27272a]",
    dividerText: "!text-[#71717a]",
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
