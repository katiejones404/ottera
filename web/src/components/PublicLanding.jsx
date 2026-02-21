export default function PublicLanding({ activePage, onEnterPortal }) {
  if (activePage === "about") {
    return (
      <section className="panel">
        <h1>About Ottera</h1>
        <p>
          Ottera is a community message board where people facing financial hardship can find nearby help.
          Nonprofits, shelters, volunteers, and distributors share trusted opportunities in one place.
        </p>
      </section>
    );
  }

  if (activePage === "resources") {
    return (
      <section className="panel">
        <h1>Find Resources</h1>
        <div className="card-grid">
          <article className="card">
            <h2>Food</h2>
            <p>Search pantries and free meal events by city and day.</p>
            <button type="button" className="solid" disabled>Subscribe to Distributor (Log in required)</button>
          </article>
          <article className="card">
            <h2>Clothing</h2>
            <p>Browse shelters and clothing closets accepting visitors this week.</p>
            <button type="button" className="solid" disabled>Message Clothing Shelter (Log in required)</button>
          </article>
          <article className="card">
            <h2>Shelter + Events</h2>
            <p>View overnight shelter availability and free community events.</p>
            <button type="button" className="solid" onClick={onEnterPortal}>Create account to RSVP</button>
          </article>
        </div>
      </section>
    );
  }

  return (
    <section className="panel">
      <p className="eyebrow">Community aid, simplified</p>
      <h1>Find help fast. Share help locally.</h1>
      <p>
        Ottera helps community members discover food, clothing, shelter, and free events in their city.
        Make an account to connect with volunteers and distributors.
      </p>
      <div className="hero-actions">
        <button type="button" className="solid" onClick={onEnterPortal}>Find Resources</button>
        <button type="button">How It Works</button>
      </div>
    </section>
  );
}
