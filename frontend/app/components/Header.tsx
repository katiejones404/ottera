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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

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

      <nav className="center-nav" aria-label="Primary navigation">
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
