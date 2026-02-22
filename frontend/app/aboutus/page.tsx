"use client";

import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import AboutUs from "../components/AboutUs";
import { loadSession } from "../lib/session";

export default function AboutUsPage() {
  const router = useRouter();
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const session = isHydrated ? loadSession() : null;

  return (
    <AboutUs
      onNavigate={(page) => {
        if (page === "resources") router.push(session ? "/resources" : "/resources/zipcode");
      }}
      onEnterPortal={() => router.push(session ? "/resources" : "/resources/zipcode")}
    />
  );
}
