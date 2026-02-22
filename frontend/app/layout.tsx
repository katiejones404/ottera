// app/layout.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import { Londrina_Solid } from "next/font/google";
import "./globals.css";
import AppNavbar from "./components/AppNavbar";

const londrina = Londrina_Solid({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ottera",
  description: "Ottera PearlHacks 2026 Prototype",
  icons: { icon: '/favicon.png' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${londrina.className} antialiased`}>
        <Suspense fallback={null}>
          <AppNavbar />
        </Suspense>

        {children}
      </body>
    </html>
  );
}