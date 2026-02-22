import { useEffect, useRef, useState } from "react";
import type { Account } from "../data/roles";

type HeaderProps = {
  activePage: string;
  onNavigate: (page: string) => void;
  session: Account | null;
  onSignIn: () => void;
  onSignOut: () => void;
};

export default function Header({
  activePage,
  onNavigate,
  session,
  onSignIn,
  onSignOut,
}: HeaderProps) {
  const navRef = useRef<HTMLElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const activeBtn = nav.querySelector<HTMLButtonElement>("button.active");
    if (!activeBtn) return;
    const navRect = nav.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();
    setIndicator({
      left: btnRect.left - navRect.left,
      width: btnRect.width,
    });
  }, [activePage]);

  return (
    <header className="main-header">
      <button type="button" className="logo-wrap" onClick={() => onNavigate("home")}>
        <img
          src="/logo.png"
          alt="Ottera logo"
          className="logo"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
        <span className="brand">Ottera</span>
      </button>

      <nav ref={navRef} className="center-nav" aria-label="Primary navigation">
        <button
          type="button"
          className={activePage === "home" ? "active" : ""}
          onClick={() => onNavigate("home")}
        >
          Home
        </button>
        <button
          type="button"
          className={activePage === "resources" ? "active" : ""}
          onClick={() => onNavigate("resources")}
        >
          Find Resources
        </button>
        <button
          type="button"
          className={activePage === "about" ? "active" : ""}
          onClick={() => onNavigate("about")}
        >
          About Us
        </button>

        {/* sliding underline */}
        <span
          className="nav-indicator"
          style={{ left: indicator.left, width: indicator.width }}
        />
      </nav>

      <div className="auth-actions">
        {session ? (
          <>
            <span className="username">{session.name}</span>
            <button type="button" onClick={onSignOut}>
              Log out
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={onSignIn}>
              Log in
            </button>
            <button type="button" className="solid" onClick={onSignIn}>
              Sign up
            </button>
          </>
        )}
      </div>
    </header>
  );
}