import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { AppProvider } from "@/context/AppContext";
import { ThemeLanguageToggle } from "@/components/ThemeLanguageToggle";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Shish-Bish | Online Board Game",
  description: "Play Shish-Bish with friends and climb the rankings.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <AppProvider>
            <ThemeLanguageToggle />
            {children}
          </AppProvider>
        </Providers>
      </body>
    </html>
  );
}
