// frontend/app/page.tsx  (replace the file contents with this)
"use client";

import { useMemo, useState } from "react";
import Header from "./components/Header";
import PortalShell from "./components/PortalShell";
import PublicLanding from "./components/PublicLanding";
import AboutUs from "./components/AboutUs";
import { MOCK_ACCOUNTS } from "./data/roles";

export default function Home() {
  const [activePage, setActivePage] = useState("home");
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
          // Render pages based on activePage
          <>
            {activePage === "home" && (
              <PublicLanding
                onEnterPortal={cycleDemoSignIn}
                onNavigate={(p: string) => setActivePage(p)}
              />
            )}

            {activePage === "about" && (
              <AboutUs
                onEnterPortal={cycleDemoSignIn}
                onNavigate={(p: string) => setActivePage(p)}
              />
            )}

            {activePage === "resources" && (
              // Small placeholder until you add the real Resources component.
              // Replace this <section> with your Resources component import/render later.
              <section className="resources-placeholder">
                <h1>Find Resources</h1>
                <p>
                  This is a temporary placeholder for the Find Resources page.
                  Hook up your real Resources component here (or replace this
                  block with <code>&lt;Resources /&gt;</code> once it's ready).
                </p>
                <p>
                  For now, click the button below to create an account (demo).
                </p>
                <div>
                  <button className="btn btn-primary" onClick={cycleDemoSignIn}>
                    Create account / Sign up (demo)
                  </button>
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <footer className="footer">Ottera PearlHacks 2026 prototype</footer>
    </div>
  );
}