"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Header from "./Header";
import { clearSession, loadSession } from "../lib/session";

function getActivePage(pathname: string, searchParams: URLSearchParams): string {
  if (pathname.startsWith("/resources")) return "resources";
  const requested = searchParams.get("page");
  if (requested === "about" || requested === "resources" || requested === "home") {
    return requested;
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
      router.push("/?page=about");
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
