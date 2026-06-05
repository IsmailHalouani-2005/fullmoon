import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../contexts/AuthContext";
import { ToastProvider } from "../contexts/ToastContext";
import PresenceManager from "../components/PresenceManager";
import GlobalActionBar from "../components/GlobalActionBar";
import MicrophoneDebug from "../components/MicrophoneDebug";
import ErrorBoundary from "../components/ErrorBoundary";


const BASE_URL = 'https://fullmoon.ismailhalouani.eu';

export const metadata: Metadata = {
  title: "FullMoon | Le Jeu de Loup-Garou en ligne entre amis",
  description: "Jouez aux Loups-Garous en ligne avec vos amis. Chat vocal automatique, rôles secrets, votes et pouvoirs — sans maître du jeu humain.",
  icons: {
    icon: "/assets/images/logo_fullmoon.ico",
  },
  openGraph: {
    title: "FullMoon | Le Jeu de Loup-Garou en ligne entre amis",
    description: "Jouez aux Loups-Garous en ligne avec vos amis. Chat vocal automatique, rôles secrets, votes et pouvoirs — sans maître du jeu humain.",
    url: BASE_URL,
    siteName: "FullMoon",
    images: [
      {
        url: `${BASE_URL}/assets/images/thumbnail-fullmoon.jpg`,
        width: 1200,
        height: 630,
        alt: "FullMoon — Loup-Garou en ligne",
      },
    ],
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FullMoon | Le Jeu de Loup-Garou en ligne entre amis",
    description: "Jouez aux Loups-Garous en ligne avec vos amis. Chat vocal, rôles secrets, votes — sans maître du jeu.",
    images: [`${BASE_URL}/assets/images/thumbnail-fullmoon.jpg`],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="scroll-smooth" suppressHydrationWarning>
      <body className="antialiased bg-background text-dark font-montserrat min-h-screen flex flex-col" suppressHydrationWarning>
        <AuthProvider>
          <ToastProvider>
            <ErrorBoundary>
              <PresenceManager />
              <GlobalActionBar />
              <MicrophoneDebug />
              {children}
            </ErrorBoundary>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
