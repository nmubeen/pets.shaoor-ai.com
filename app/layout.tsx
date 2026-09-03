import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Menagerie — pets.shaoor-ai.com",
  description:
    "Every pet. Every habitat. One record. Menagerie tracks, costs, and remembers every animal and habitat a household keeps — built for mixed households, foster networks, and rescues.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
