// app/page.tsx
"use client";

import React from "react";
import Link from "next/link";
import HomeLanding from "./components/PublicLanding"; // adjust name/path if different

export default function HomePage() {
  const scrollToHowItWorks = () => {
    const element = document.getElementById("how-it-works");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <main>
      {/* If HomeLanding is a client component, passing handlers from a client parent is allowed */}
      <HomeLanding
        activePage="home"
        isAuthenticated={false}
        defaultZipcode=""
        // pass handlers that the landing expects (adjust names to match your component props)
        onEnterPortal={() => {}}
        onNavigate={() => {}}
        onScrollToHowItWorks={scrollToHowItWorks} // optional: if HomeLanding expects this prop
      />

import { useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PublicLanding from "./components/PublicLanding";
import { loadSession } from "./lib/session";

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const sessionData = isHydrated ? loadSession() : null;
  const session = sessionData?.account ?? null;
  const defaultZip = sessionData?.zipCode ?? "";

  const requestedPage = searchParams.get("page");

  const currentPage =
    requestedPage === "home"
      ? requestedPage
      : "home";

  return (
    <div className="app-shell">
      <main>
        <PublicLanding
          activePage={currentPage}
          onEnterPortal={() => router.push(session ? "/resources" : "/resources/zipcode")}
          onNavigate={(page) => {
            if (page === "about") router.push("/aboutus");
            if (page === "home") router.push("/");
            if (page === "resources") router.push(session ? "/resources" : "/resources/zipcode");
            if (page === "partner") router.push("/partner-with-us");
          }}
          isAuthenticated={Boolean(session)}
          defaultZipcode={defaultZip}
        />
      </main>

      {/* If you keep the JSX directly here instead of a component, keep the same "use client"; at top */}
      {/* Or you can inline your landing JSX here (previous markup you pasted) */}
    </main>
  );
}
