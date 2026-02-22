import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Account } from "../data/roles";

type HeaderProps = {
  activePage: string;
  onNavigate: (page: string) => void;
  session: Account | null;
  onSignOut: () => void;
};

export default function Header({
  activePage,
  onNavigate,
  session,
  onSignOut,
}: HeaderProps) {
  const navRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const [menuOpen, setMenuOpen] = useState(false);

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
          src="/icons/logo1.png"
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
          className={`nav-tab ${activePage === "home" ? "active" : ""}`}
          onClick={() => onNavigate("home")}
        >
          <img
            src="/icons/home.png"
            alt="home icon"
            className="nav-tab-icon"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
          <span>Home</span>
        </button>
        <button
          type="button"
          className={`nav-tab ${activePage === "resources" ? "active" : ""}`}
          onClick={() => onNavigate("resources")}
        >
          <img
            src="/icons/find.png"
            alt="find resources icon"
            className="nav-tab-icon"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
          <span>Find Resources</span>
        </button>
        <button
          type="button"
          className={`nav-tab ${activePage === "about" ? "active" : ""}`}
          onClick={() => onNavigate("about")}
        >
          <img
            src="/icons/about.png"
            alt="about us icon"
            className="nav-tab-icon"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
          <span>About Us</span>
        </button>
        {/* sliding underline */}
        <span
          className="nav-indicator"
          style={{ left: indicator.left, width: indicator.width }}
        />
      </nav>

      <div className="auth-actions">
        {session ? (
          <div className="user-menu" ref={menuRef}>
            <button
              type="button"
              className="username-btn"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {session.name}
            </button>
            {menuOpen && (
              <div className="user-dropdown">
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setMenuOpen(false);
                    onSignOut();
                  }}
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <Link href="/login" className="auth-link-btn">
              Log in
            </Link>
            <Link href="/signup" className="solid auth-link-btn">
              Sign up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
