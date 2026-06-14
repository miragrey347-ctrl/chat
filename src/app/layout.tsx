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
        <meta name="color-scheme" content="dark" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var bars={dark:"#2b2520",light:"#f5f0eb"};var schemes={dark:"dark",light:"light"};var mq=window.matchMedia("(prefers-color-scheme:dark)");var valid={system:1,dark:1,light:1};var t0=localStorage.getItem("color-mode")||"dark";if(!valid[t0]){t0="dark";localStorage.setItem("color-mode","dark")}function res(){var t=localStorage.getItem("color-mode")||"dark";return t==="system"?(mq.matches?"dark":"light"):t}function apply(){var r=res();var s=document.querySelector('meta[name="color-scheme"]');if(s)s.setAttribute("content",schemes[r]||"dark");document.documentElement.style.backgroundColor=bars[r]||bars.dark}document.documentElement.setAttribute("data-theme",t0);apply();if(mq.addEventListener){mq.addEventListener("change",apply)}else if(mq.addListener){mq.addListener(apply)}}catch(e){document.documentElement.setAttribute("data-theme","dark")}})();if("serviceWorker"in navigator){navigator.serviceWorker.register("/sw.js").catch(function(){})}`,
          }}
        />
      </head>
      <body className="antialiased"><ThemeGuard />{children}</body>
    </html>
  );
}
