"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import PublicLanding from "../components/PublicLanding";
import { loadSession } from "../lib/session";

type ResourcesClientProps = {
  initialZip: string;
};

export default function ResourcesClient({ initialZip }: ResourcesClientProps) {
  const router = useRouter();
  const session = useMemo(() => loadSession(), []);
  const fallbackZip = (session?.zipCode || "").replace(/\D/g, "").slice(0, 5);
  const defaultZipcode = initialZip || fallbackZip;

  useEffect(() => {
    if (!session && !defaultZipcode) {
      router.replace("/resources/zipcode");
    }
  }, [session, defaultZipcode, router]);

  return (
    <main>
      <PublicLanding
        key={`resources-${defaultZipcode}-${session ? "auth" : "guest"}`}
        activePage="resources"
        onEnterPortal={() => {}}
        isAuthenticated={Boolean(session)}
        defaultZipcode={defaultZipcode}
      />
    </main>
  );
}
