import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppHeader } from "@/components/shell/AppHeader";

export const metadata: Metadata = {
  title: "Scan Visiting Card | Sales Cloud",
  description: "Scan a visiting card, review the extracted details, check for existing customers and create a Lead.",
  applicationName: "ApexCoco",
};

export const viewport: Viewport = {
  themeColor: "#032d60",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh flex flex-col">
        <AppHeader />
        <main className="flex-1 w-full">{children}</main>
      </body>
    </html>
  );
}
