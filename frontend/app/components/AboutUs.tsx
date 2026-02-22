// frontend/components/AboutUs.tsx
import React from "react";

type AboutUsProps = {
  onEnterPortal?: () => void; // optional CTA handler (signup / go to portal)
  onNavigate?: (page: string) => void; // optional nav callback
  className?: string;
};

export default function AboutUs({ onEnterPortal, onNavigate, className = "" }: AboutUsProps) {
  const handleGetStarted = () => {
    if (onNavigate) onNavigate("resources");
    else if (onEnterPortal) onEnterPortal();
  };

  return (
    <main className={`about-root ${className}`}>
      <article className="about-hero">
        <header>
          <p className="eyebrow">Our story</p>
          <h1>About Ottera</h1>
        </header>

        <p className="lead">
          At Ottera, we believe communities are strongest when we hold onto each other —
          just like otters do. Otters float together, hand in hand, so no one drifts away.
          That image inspired our name and our mission: to build a place where neighbors
          can support neighbors, and nobody has to navigate hardship alone.
        </p>
      </article>

      <section className="about-mission">
        <h2>Our mission</h2>
        <p>
          Ottera connects <strong>community members in need</strong>, <strong>local
          nonprofits</strong>, and <strong>volunteers</strong> in one simple, trusted space.
          When someone needs food, clothing, shelter, or other help, they shouldn’t have to
          search forever. When organizations have resources or urgent updates, they deserve
          a direct way to reach people who need them now.
        </p>
      </section>

      <section className="about-how">
        <h2>How we bring people together</h2>

        <div className="about-grid">
          <div className="about-card">
            <h3>Community members</h3>
            <p>
              Find local resources, view events, and connect with trusted organizations
              in your neighborhood — fast and without friction.
            </p>
          </div>

          <div className="about-card">
            <h3>Nonprofits & shelters</h3>
            <p>
              Post updates, announce openings, share urgent needs, and communicate directly
              with volunteers and the community.
            </p>
          </div>

          <div className="about-card">
            <h3>Volunteers</h3>
            <p>
              Discover opportunities, RSVP to events, and stay informed about where help
              is needed most — all in one place.
            </p>
          </div>
        </div>
      </section>

      <section className="about-values">
        <h2>Our values</h2>
        <ul>
          <li><strong>Trust:</strong> We prioritize verified organizations and clear posts.</li>
          <li><strong>Accessibility:</strong> Information should be easy to find and understand.</li>
          <li><strong>Community-first:</strong> We design for volunteers and people seeking help.</li>
        </ul>
      </section>

      <section className="about-cta">
        <p>
          We built Ottera because when communities stay connected, we all stay afloat.
          Want to help or need help? Click below to get started.
        </p>

        <div className="cta-actions">
          <button className="btn btn-primary" onClick={handleGetStarted}>
            Get started
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => (onNavigate ? onNavigate("contact") : undefined)}
          >
            Contact us
          </button>
        </div>
      </section>

      <footer className="about-footer" aria-hidden>
        <p className="small">
          Tiny reminder: like otters holding hands, Ottera keeps neighbors connected — hand in
          hand, so no one drifts away.
        </p>
      </footer>
    </main>
  );
}