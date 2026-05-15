import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chat",
  description: "Personal AI Chat",
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
