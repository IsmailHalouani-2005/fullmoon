import type { Metadata } from "next";
import "./globals.css";
import PresenceManager from "../components/PresenceManager";
import GlobalActionBar from "../components/GlobalActionBar";


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
        <PresenceManager />
        <GlobalActionBar />
        {children}
      </body>
    </html>
  );
}
