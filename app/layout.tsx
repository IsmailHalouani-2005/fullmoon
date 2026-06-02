import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../contexts/AuthContext";
import PresenceManager from "../components/PresenceManager";
import GlobalActionBar from "../components/GlobalActionBar";
import MicrophoneDebug from "../components/MicrophoneDebug";
import ErrorBoundary from "../components/ErrorBoundary";


export const metadata: Metadata = {
  title: "FullMoon | Le village s'endort",
  description: "Jeu du Loup-Garou en ligne réinventé.",
  icons: {
    icon: "/assets/images/logo_fullmoon.ico",
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
          <ErrorBoundary>
            <PresenceManager />
            <GlobalActionBar />
            <MicrophoneDebug />
            {children}
          </ErrorBoundary>
        </AuthProvider>
      </body>
    </html>
  );
}
