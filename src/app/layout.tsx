import type { Metadata, Viewport } from "next";
import "./globals.css";
import ThemeGuard from "@/components/ThemeGuard";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Extend the page under the status bar / home indicator in standalone
  // mode — paired with black-translucent below, the status bar becomes a
  // transparent overlay showing the page's own background, which is the
  // only way an iOS PWA status bar can follow a dynamic theme (the manifest
  // theme_color is frozen at install time).

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
        <meta name="color-scheme" content="dark" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var bars={dark:"#2b2520",light:"#f5f0eb",sage:"#eef1e9",lavender:"#f0edf5",ocean:"#20272f",plum:"#2b232c"};var schemes={dark:"dark",light:"light",sage:"light",lavender:"light",ocean:"dark",plum:"dark"};var mq=window.matchMedia("(prefers-color-scheme:dark)");function res(){var t=localStorage.getItem("color-mode")||"dark";return t==="system"?(mq.matches?"dark":"light"):t}function setMetas(){var r=res();var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",bars[r]||bars.dark);var s=document.querySelector('meta[name="color-scheme"]');if(s)s.setAttribute("content",schemes[r]||"dark")}var t0=localStorage.getItem("color-mode")||"dark";document.documentElement.setAttribute("data-theme",t0);setMetas();function onSys(){setMetas();document.documentElement.style.backgroundColor=bars[res()]||bars.dark}if(mq.addEventListener){mq.addEventListener("change",onSys)}else if(mq.addListener){mq.addListener(onSys)}}catch(e){document.documentElement.setAttribute("data-theme","dark")}})();if("serviceWorker"in navigator){navigator.serviceWorker.register("/sw.js").catch(function(){})}`,
          }}
        />
      </head>
      <body className="antialiased"><ThemeGuard />{children}</body>
    </html>
  );
}
