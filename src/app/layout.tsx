import type { Metadata, Viewport } from "next";
import "./globals.css";
import ThemeGuard from "@/components/ThemeGuard";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#2b2520",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  title: "Aethera",
  description: "Aethera - Personal AI Chat",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Aethera",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

const chromeBootstrapScript = `(function(){var valid={system:1,dark:1,light:1};var bars={dark:"#2b2520",light:"#f5f0eb"};var schemes={dark:"dark",light:"light"};function normalize(value){return value&&valid[value]?value:"dark"}function resolve(theme){return theme==="system"&&window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches?"light":theme==="light"?"light":"dark"}function setMeta(name,content){var nodes=document.querySelectorAll('meta[name="'+name+'"]');var meta=nodes[0];if(!meta){meta=document.createElement("meta");meta.setAttribute("name",name);document.head.prepend(meta)}for(var i=1;i<nodes.length;i++){if(nodes[i].parentNode)nodes[i].parentNode.removeChild(nodes[i])}meta.setAttribute("content",content);meta.removeAttribute("media");meta.setAttribute("data-aethera-chrome","true")}function write(theme){var resolved=resolve(theme);var bar=bars[resolved];var scheme=schemes[resolved];var root=document.documentElement;root.setAttribute("data-theme",theme);root.style.backgroundColor=bar;root.style.colorScheme=scheme;if(document.body){document.body.style.backgroundColor=bar;document.body.style.colorScheme=scheme}setMeta("theme-color",bar);setMeta("color-scheme",scheme);setMeta("supported-color-schemes","dark light");setMeta("apple-mobile-web-app-status-bar-style",resolved==="dark"?"black":"default")}function apply(theme){theme=normalize(theme);write(theme);requestAnimationFrame(function(){write(theme);requestAnimationFrame(function(){write(theme)})});setTimeout(function(){write(theme)},80);setTimeout(function(){write(theme)},250);setTimeout(function(){write(theme)},700)}try{var stored=localStorage.getItem("color-mode");var theme=normalize(stored);if(theme!==stored)localStorage.setItem("color-mode",theme);apply(theme);window.__aetheraApplyChrome=apply}catch(e){apply("dark")}if("serviceWorker"in navigator){navigator.serviceWorker.register("/sw.js",{updateViaCache:"none"}).then(function(reg){if(reg.update)reg.update()}).catch(function(){})}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      style={{ backgroundColor: "#2b2520", colorScheme: "dark" }}
      suppressHydrationWarning
    >
      <head>
        <meta name="theme-color" content="#2b2520" />
        <meta name="color-scheme" content="dark" />
        <meta name="supported-color-schemes" content="dark light" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
          crossOrigin="anonymous"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: chromeBootstrapScript,
          }}
        />
      </head>
      <body className="antialiased">
        <ThemeGuard />
        {children}
      </body>
    </html>
  );
}
