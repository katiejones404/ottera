"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import PublicLanding from "../components/PublicLanding";
import { loadSession } from "../lib/session";

type ResourcesClientProps = {
  initialZip: string;
};

export default function ResourcesClient({ initialZip }: ResourcesClientProps) {
  const router = useRouter();
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const session = isHydrated ? loadSession() : null;
  const fallbackZip = (session?.zipCode || "").replace(/\D/g, "").slice(0, 5);
  const defaultZipcode = initialZip || fallbackZip;

  useEffect(() => {
    if (!isHydrated) return;
    if (!session && !defaultZipcode) {
      router.replace("/resources/zipcode");
    }
  }, [isHydrated, session, defaultZipcode, router]);

  return (
    <main>
      <PublicLanding
        key={`resources-${defaultZipcode}-${session ? "auth" : "guest"}-${isHydrated ? "hydrated" : "ssr"}`}
        activePage="resources"
        onEnterPortal={() => {}}
        isAuthenticated={Boolean(session)}
        defaultZipcode={defaultZipcode}
      />
    </main>
  );
}
