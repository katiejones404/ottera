"use client";

import { useState } from "react";
import Header from "./components/Header";
import PortalShell from "./components/PortalShell";
import PublicLanding from "./components/PublicLanding";
import type { Account } from "./data/roles";
import { clearSession, loadSession } from "./lib/session";

export default function Home() {
  const [activePage, setActivePage] = useState("home");
  const [session, setSession] = useState<Account | null>(
    () => loadSession()?.account ?? null
  );

  const handleSignOut = () => {
    clearSession();
    setSession(null);
  };

  return (
    <div className="app-shell">
      <Header
        activePage={activePage}
        onNavigate={setActivePage}
        session={session}
        onSignOut={handleSignOut}
      />

      <main>
        {session ? (
          <PortalShell
            session={session}
            onReturnToLanding={handleSignOut}
          />
        ) : (
          <PublicLanding
            activePage={activePage}
            onEnterPortal={() => setActivePage("resources")}
          />
        )}
      </main>

      <footer className="footer">Ottera PearlHacks 2026 prototype</footer>
    </div>
  );
}
