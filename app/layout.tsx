import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Patchfleet local console",
  description: "Local-only control for coding agents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
