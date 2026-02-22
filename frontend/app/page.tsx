"use client";

import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import PublicLanding from "./components/PublicLanding";
import { loadSession } from "./lib/session";

export default function Home() {
  const router = useRouter();
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const sessionData = isHydrated ? loadSession() : null;
  const session = sessionData?.account ?? null;
  const defaultZip = sessionData?.zipCode ?? "";

  const currentPage = "home";

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
    </div>
  );
}
