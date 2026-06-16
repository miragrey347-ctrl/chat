"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import SettingsHome from "@/components/settings/SettingsHome";
import DisplaySettings from "@/components/settings/DisplaySettings";
import AssistantList from "@/components/settings/AssistantList";
import AssistantEdit from "@/components/settings/AssistantEdit";
import DefaultModel from "@/components/settings/DefaultModel";
import ApiConfig from "@/components/settings/ApiConfig";
import SearchService from "@/components/settings/SearchService";
import VoiceService from "@/components/settings/VoiceService";
import GlobalMemory from "@/components/settings/GlobalMemory";
import DataBackup from "@/components/settings/DataBackup";
import MemoryManage from "@/components/settings/MemoryManage";
import UserProfile from "@/components/settings/UserProfile";

export interface NavPage {
  id: string;
  title: string;
  props?: Record<string, unknown>;
}

export interface NavContext {
  push: (page: NavPage) => void;
  pop: () => void;
  replace: (page: NavPage) => void;
}

export default function SettingsPage() {
  const [navStack, setNavStack] = useState<NavPage[]>([
    { id: "home", title: "Settings" },
  ]);
  const [animDir, setAnimDir] = useState<"forward" | "back" | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const animTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentPage = navStack[navStack.length - 1];

  const push = useCallback((page: NavPage) => {
    if (isAnimating) return;
    setAnimDir("forward");
    setIsAnimating(true);
    setNavStack((s) => [...s, page]);
    animTimeout.current = setTimeout(() => {
      setAnimDir(null);
      setIsAnimating(false);
    }, 300);
  }, [isAnimating]);

  const pop = useCallback(() => {
    if (isAnimating || navStack.length <= 1) {
      // If at root, go back to chat
      if (navStack.length <= 1) window.location.assign("/chat");
      return;
    }
    setAnimDir("back");
    setIsAnimating(true);
    animTimeout.current = setTimeout(() => {
      setNavStack((s) => s.slice(0, -1));
      setAnimDir(null);
      setIsAnimating(false);
    }, 280);
  }, [isAnimating, navStack.length]);

  const replace = useCallback((page: NavPage) => {
    setNavStack((s) => [...s.slice(0, -1), page]);
  }, []);

  useEffect(() => {
    return () => {
      if (animTimeout.current) clearTimeout(animTimeout.current);
    };
  }, []);

  const nav: NavContext = { push, pop, replace };

  const renderPage = (page: NavPage) => {
    switch (page.id) {
      case "home":
        return <SettingsHome nav={nav} />;
      case "display":
        return <DisplaySettings nav={nav} />;
      case "assistants":
        return <AssistantList nav={nav} />;
      case "assistant-edit":
        return <AssistantEdit nav={nav} assistantId={page.props?.assistantId as string | null} />;
      case "default-model":
        return <DefaultModel nav={nav} />;
      case "api-config":
        return <ApiConfig nav={nav} />;
      case "search-service":
        return <SearchService nav={nav} />;
      case "voice-service":
        return <VoiceService nav={nav} />;
      case "global-memory":
        return <GlobalMemory nav={nav} />;
      case "data-backup":
        return <DataBackup nav={nav} />;
      case "user-profile":
        return <UserProfile nav={nav} />;
      case "memory-manage":
        return (
          <MemoryManage
            nav={nav}
            assistantId={page.props?.assistantId as string | undefined}
            assistantName={page.props?.assistantName as string | undefined}
          />
        );
      default:
        return <SettingsHome nav={nav} />;
    }
  };

  // For back animation, we need to show previous page underneath
  const prevPage = navStack.length > 1 ? navStack[navStack.length - 2] : null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--bg-primary)",
        overflow: "hidden",
        zIndex: 100,
      }}
    >
      {/* Previous page (visible during back animation) */}
      {animDir === "back" && prevPage && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
          }}
        >
          {renderPage(prevPage)}
        </div>
      )}

      {/* Current page */}
      <div
        key={`${currentPage.id}-${navStack.length}`}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          animation:
            animDir === "forward"
              ? "settings-slide-in 280ms cubic-bezier(0.25, 0.1, 0.25, 1) forwards"
              : animDir === "back"
              ? "settings-slide-out 280ms cubic-bezier(0.25, 0.1, 0.25, 1) forwards"
              : "none",
        }}
      >
        {renderPage(currentPage)}
      </div>

      <style>{`
        @keyframes settings-slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes settings-slide-out {
          from { transform: translateX(0); }
          to { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
