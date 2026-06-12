import type { Metadata, Viewport } from "next";
import "./globals.css";
import ThemeGuard from "@/components/ThemeGuard";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Aethera",
  description: "Aethera – Personal AI Chat",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Aethera",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
          crossOrigin="anonymous"
        />
        <meta name="theme-color" content="#2b2520" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var bars={dark:"#2b2520",light:"#f5f0eb",sage:"#eef1e9",lavender:"#f0edf5",ocean:"#20272f",plum:"#2b232c"};var mq=window.matchMedia("(prefers-color-scheme:dark)");function col(){var t=localStorage.getItem("color-mode")||"dark";var r=t==="system"?(mq.matches?"dark":"light"):t;return bars[r]||bars.dark}var t0=localStorage.getItem("color-mode")||"dark";document.documentElement.setAttribute("data-theme",t0);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",col());function onSys(){var c=col();document.documentElement.style.backgroundColor=c;var mm=document.querySelector('meta[name="theme-color"]');if(mm)mm.setAttribute("content",c)}if(mq.addEventListener){mq.addEventListener("change",onSys)}else if(mq.addListener){mq.addListener(onSys)}}catch(e){document.documentElement.setAttribute("data-theme","dark")}})();if("serviceWorker"in navigator){navigator.serviceWorker.register("/sw.js").catch(function(){})}`,
          }}
        />
      </head>
      <body className="antialiased"><ThemeGuard />{children}</body>
    </html>
  );
}
