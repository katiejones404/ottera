// app/components/AppNavbar.tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Header from "./Header";
import { clearSession, loadSession } from "../lib/session";

function getActivePage(pathname: string | null, searchParams: ReturnType<typeof useSearchParams>) {
  if (pathname?.startsWith("/resources")) return "resources";
  if (pathname === "/about") return "about";

  // If we're at root ("/") we may have a legacy query param like "?page=about".
  // Only use the query param as a fallback when pathname is "/" or null/undefined.
  if (!pathname || pathname === "/") {
    const requested = searchParams?.get?.("page");
    if (requested === "about" || requested === "resources" || requested === "home") {
      return requested;
    }
  }

  return "home";
}

export default function AppNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const session = loadSession()?.account ?? null;

  const activePage = getActivePage(pathname, searchParams);

  const onNavigate = (page: string) => {
    if (page === "home") {
      router.push("/");
      return;
    }

    if (page === "about") {
      // <--- navigate to the canonical route (no query string)
      router.push("/about");
      return;
    }

    if (page === "resources") {
      if (session) {
        router.push("/resources");
      } else {
        router.push("/resources/zipcode");
      }
    }
  };

  const onSignOut = () => {
    clearSession();
    router.push("/");
  };

  return (
    <Header
      activePage={activePage}
      onNavigate={onNavigate}
      session={session}
      onSignOut={onSignOut}
    />
  );
}