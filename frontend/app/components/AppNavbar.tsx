"use client";

import { useSyncExternalStore } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Header from "./Header";
import { clearSession, loadSession } from "../lib/session";

function getActivePage(pathname: string, searchParams: URLSearchParams): string {
  if (pathname.startsWith("/aboutus")) return "about";
  if (pathname.startsWith("/resources")) return "resources";
  if (pathname.startsWith("/partner-with-us")) return "partner";
  const requested = searchParams.get("page");
  if (requested === "about" || requested === "home") {
    return requested;
  }
  return "home";
}

export default function AppNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const stored = isHydrated ? loadSession() : null;
  const session = stored?.account ?? null;
  const sessionRoles = stored?.roles ?? [];

  const activePage = getActivePage(pathname, searchParams);

  const onNavigate = (page: string) => {
    if (page === "home") {
      router.push("/");
      return;
    }

    if (page === "about") {
      router.push("/aboutus");
      return;
    }

    if (page === "resources") {
      if (session) {
        router.push("/resources");
      } else {
        router.push("/resources/zipcode");
      }
      return;
    }

    if (page === "partner") {
      router.push("/partner-with-us");
      return;
    }
  };

  const onSignOut = () => {
    clearSession();
    router.push("/");
  };

  // Keep SSR and first client paint consistent to avoid hydration mismatch.
  if (!isHydrated) {
    return (
      <Header
        activePage={activePage}
        onNavigate={onNavigate}
        session={null}
        sessionRoles={[]}
        onSignOut={onSignOut}
      />
    );
  }

  return (
    <Header
      activePage={activePage}
      onNavigate={onNavigate}
      session={session}
      sessionRoles={sessionRoles}
      onSignOut={onSignOut}
    />
  );
}
