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

      {/* If you keep the JSX directly here instead of a component, keep the same "use client"; at top */}
      {/* Or you can inline your landing JSX here (previous markup you pasted) */}
    </main>
  );
}