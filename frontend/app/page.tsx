"use client";

import { useMemo, useState } from "react";
import Header from "./components/Header";
import PortalShell from "./components/PortalShell";
import PublicLanding from "./components/PublicLanding";
import { MOCK_ACCOUNTS } from "./data/roles";

function getInitialPage(): string {
  if (typeof window === "undefined") {
    return "home";
  }

  const requestedPage = new URLSearchParams(window.location.search).get("page");
  if (
    requestedPage === "home" ||
    requestedPage === "resources" ||
    requestedPage === "about"
  ) {
    return requestedPage;
  }

  return "home";
}

export default function Home() {
  const [activePage, setActivePage] = useState(getInitialPage);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const session = useMemo(
    () => MOCK_ACCOUNTS.find((account) => account.id === sessionId) ?? null,
    [sessionId]
  );

  const cycleDemoSignIn = () => {
    if (!sessionId) {
      setSessionId(MOCK_ACCOUNTS[1].id);
      return;
    }

    const currentIndex = MOCK_ACCOUNTS.findIndex(
      (account) => account.id === sessionId
    );
    const nextIndex = (currentIndex + 1) % MOCK_ACCOUNTS.length;
    setSessionId(MOCK_ACCOUNTS[nextIndex].id);
  };

  return (
    <div className="app-shell">
      <Header
        activePage={activePage}
        onNavigate={setActivePage}
        session={session}
        onSignIn={cycleDemoSignIn}
        onSignOut={() => setSessionId(null)}
      />

      <main>
        {session ? (
          <PortalShell
            session={session}
            onReturnToLanding={() => setSessionId(null)}
          />
        ) : (
          <PublicLanding
            activePage={activePage}
            onEnterPortal={cycleDemoSignIn}
          />
        )}
      </main>

      <footer className="footer">Ottera PearlHacks 2026 prototype</footer>
    </div>
  );
}
