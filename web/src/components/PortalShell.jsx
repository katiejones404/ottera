import { ROLES } from "../data/roles";

const tabs = ["Events", "Find Help", "Profile/Settings"];

export default function PortalShell({ session, onReturnToLanding }) {
  return (
    <section className="portal-layout">
      <aside className="sidebar">
        <button type="button" onClick={onReturnToLanding}>Return to Public Landing</button>
        <h2>Portal</h2>
        <ul>
          {tabs.map((tab) => (
            <li key={tab}>{tab}</li>
          ))}
        </ul>
      </aside>

      <div className="portal-main">
        <div className="portal-topbar">
          <h1>{session.role} Portal</h1>
          <button type="button" className="chat-btn">Chat ({session.notifications})</button>
        </div>

        <div className="portal-cards">
          <article className="card">
            <h3>Your Events</h3>
            <p>Like and RSVP to free community events near your city.</p>
          </article>
          <article className="card">
            <h3>Resource Feed</h3>
            <p>Latest posts from nonprofits, shelters, and local partners.</p>
          </article>
          <article className="card">
            <h3>Profile/Settings</h3>
            <p>Manage your account, city, alert topics, and privacy controls.</p>
          </article>
        </div>

        {session.role === ROLES.ADMIN && (
          <article className="card moderation">
            <h3>Admin Moderation</h3>
            <p>Remove or block harmful users, volunteers, and distributors.</p>
            <div className="moderation-grid">
              <button type="button">Block User</button>
              <button type="button">Block Volunteer</button>
              <button type="button">Block Distributor</button>
            </div>
          </article>
        )}

        {session.role === ROLES.VOLUNTEER && (
          <article className="card">
            <h3>Volunteer Queue</h3>
            <p>Review incoming requests and mark deliveries completed.</p>
          </article>
        )}

        {session.role === ROLES.DISTRIBUTOR && (
          <article className="card">
            <h3>Distributor Posts</h3>
            <p>Publish available inventory and schedule pickup windows.</p>
          </article>
        )}
      </div>
    </section>
  );
}
