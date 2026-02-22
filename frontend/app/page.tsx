"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PortalShell from "./components/PortalShell";
import PublicLanding from "./components/PublicLanding";
import type { Account } from "./data/roles";
import { clearSession, loadSession, type StoredSession } from "./lib/session";

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessionData, setSessionData] = useState<StoredSession | null>(() => loadSession());
  const session: Account | null = sessionData?.account ?? null;
  const defaultZip = sessionData?.zipCode ?? "";

  // Read directly from URL on every render — no stale useState
  const requestedPage = searchParams.get("page");
  const currentPage =
    requestedPage === "about" || requestedPage === "resources" || requestedPage === "home"
      ? requestedPage
      : "home";

  const handleSignOut = () => {
    clearSession();
    setSessionData(null);
  };

  return (
    <div className="app-shell">
      <main>
        {currentPage === "resources" ? (
          <PublicLanding
            activePage="resources"
            onEnterPortal={() => router.push(session ? "/resources" : "/resources/zipcode")}
            onNavigate={() => router.push(session ? "/resources" : "/resources/zipcode")}
            isAuthenticated={Boolean(session)}
            defaultZipcode={defaultZip}
          />
        ) : session ? (
          <PortalShell session={session} onReturnToLanding={handleSignOut} />
        ) : (
          <PublicLanding
            activePage={currentPage}
            onEnterPortal={() => router.push("/resources/zipcode")}
            onNavigate={(page) => {
              if (page === "about") router.push("/?page=about");
              if (page === "home") router.push("/");
              if (page === "resources") router.push("/resources/zipcode");
            }}
            isAuthenticated={false}
            defaultZipcode=""
          />
        )}
      </main>

      <footer className="footer">Ottera PearlHacks 2026 prototype</footer>
    </div>
  );
}