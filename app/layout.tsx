import type { Metadata } from "next";
import { Orbitron, Rajdhani } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";

const orbitron = Orbitron({ 
  subsets: ["latin"], 
  variable: "--font-orbitron",
  display: 'swap'
});

const rajdhani = Rajdhani({ 
  weight: ["400", "600", "700"], 
  subsets: ["latin"], 
  variable: "--font-rajdhani",
  display: 'swap'
});

export const metadata: Metadata = {
  title: "Road Rash: Neon Vengeance",
  description: "2026 Reimagining of a Classic",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${orbitron.variable} ${rajdhani.variable} antialiased overflow-hidden`}>
        <AuthProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
