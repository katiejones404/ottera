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
          At Ottera, we believe communities are strongest when we hold onto each other, just like otters do. 
          Otters float together by holding hands, making sure no one drifts away.
          That image inspired our name and our mission: to build a place where neighbors
          can support neighbors, and nobody has to navigate hardship alone.
        </p>
      </article>

      <section className="about-mission">
        <h2>Our Mission</h2>
        <p>
          Ottera connects <strong>community members in need</strong>, <strong>local
          nonprofits</strong>, and <strong>volunteers</strong> in one simple space.
          When someone needs food, clothing, shelter, or other help, they shouldn’t 
          have to sign up for random email lists or have to search the whole web. 
          On Ottera, organizations have the resources to post events and send out urgent 
          updates, which you can't get from just an email list. And, Ottera makes it 
          easy to connect organizations with voluteers. Create an account today to learn more.
        </p>
      </section>

      <section className="about-how">
        <h2>How We Can Help You</h2>

        <div className="about-grid">
          <div className="about-card">
            <h3>Community members</h3>
            <p>
              Connect with trusted organizations near you to find local resources, 
              events, and recieve notifications when an event has changed to prevent miscommunication.
            </p>
          </div>

          <div className="about-card">
            <h3>Nonprofits, Shelters, Churches, and other Organizations</h3>
            <p>
              Post events, announce updates, request volunteers, track attendance metrics, and communicate directly
              with the community all in one place.
            </p>
          </div>

          <div className="about-card">
            <h3>Volunteers</h3>
            <p>
              Find volunteer opportunities easily and stay informed about where help
              is needed most, recieve notifications for your favorite organizations.
            </p>
          </div>
        </div>
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
    </main>
  );
}