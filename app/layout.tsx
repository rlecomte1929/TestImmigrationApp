import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Bureaucracy Navigator",
  description: "AI-powered immigration guidance to help you navigate visa applications with confidence.",
  metadataBase: new URL("https://bureaucracy-navigator.local"),
  openGraph: {
    title: "Bureaucracy Navigator",
    description: "AI-powered immigration guidance to help you navigate visa applications with confidence.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
