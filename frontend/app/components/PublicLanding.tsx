// frontend/.../PublicLanding.tsx
import React, { useRef } from "react";

type PublicLandingProps = {
  onEnterPortal: () => void; // existing: opens portal / sign-up or navigates to portal
  onNavigate?: (page: string) => void; // optional parent nav handler (e.g., "resources")
};

export default function PublicLanding({ onEnterPortal, onNavigate }: PublicLandingProps) {
  const howRef = useRef<HTMLElement | null>(null);

  const goToResources = () => {
    if (onNavigate) onNavigate("resources");
    else onEnterPortal();
  };

  const scrollToHowItWorks = () => {
    if (howRef.current) {
      howRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.location.hash = "#how-it-works";
    }
  };

  return (
    <main className="landing-root">
      <section className="hero">
        <div className="hero-left">
          <h1 className="hero-title">
            Ottera
          </h1>
          <h2 className="slogan">
            Keeping communities afloat.
          </h2>

          <p className="hero-copy">
            Ottera helps connect organizations with volunteers and community members in need so they can easily 
            find food, clothing, shelter, and other resources all in one place.
          </p>

          <div className="hero-actions">
            <button className="btn btn-primary" onClick={goToResources}>
              Find Resources
            </button>

            <button className="btn btn-secondary" onClick={scrollToHowItWorks}>
              How It Works
            </button>
          </div>
        </div>

        <div className="hero-right" aria-hidden>
          {/* Put the otter image at public/images/otters.png (ask CSS teammate for size) */}
          <img
            src="/images/otters.png"
            alt="Group of otters holding hands"
            className="hero-otter"
          />
        </div>
      </section>

      <section id="how-it-works" ref={howRef} className="how-it-works">
        <h2>How Ottera Works</h2>
        <ol>
          <li><strong>Create an account:</strong> Sign up to find local resources, recieve message from organizations, or find volunteer options.</li>
          <li><strong>Find resources:</strong> Browse food, clothing, shelter, and events by category and location.</li>
          <li><strong>Organization updates:</strong> Nonprofits and shelters can announce openings and urgent needs.</li>
        </ol>

        <p className="how-cta">
          <button className="btn btn-primary" onClick={goToResources}>Get started</button>
        </p>
      </section>
    </main>
  );
}