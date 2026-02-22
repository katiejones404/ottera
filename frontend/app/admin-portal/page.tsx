"use client";

import { FormEvent, useEffect, useState, useSyncExternalStore } from "react";
import {
  approvePartnerApplication,
  createEvent,
  denyPartnerApplication,
  fetchEvents,
  fetchPartnerApplications,
  type CommunityEvent,
  type PartnerApplication,
} from "../lib/api";
import { loadSession } from "../lib/session";

export default function AdminPortalPage() {
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const session = isHydrated ? loadSession() : null;
  const isAdmin = Boolean(session?.roles?.includes("admin"));
  const token = session?.accessToken || "";

  const [applications, setApplications] = useState<PartnerApplication[]>([]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [zipCodesRaw, setZipCodesRaw] = useState("");
  const [website, setWebsite] = useState("");
  const [submittingEvent, setSubmittingEvent] = useState(false);

  const loadData = async () => {
    if (!token || !isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const [apps, evts] = await Promise.all([fetchPartnerApplications(token), fetchEvents()]);
      setApplications(apps);
      setEvents(evts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin portal data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAdmin]);

  const onApprove = async (id: string) => {
    try {
      await approvePartnerApplication(id, token);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approve failed.");
    }
  };

  const onDeny = async (id: string) => {
    try {
      await denyPartnerApplication(id, token);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deny failed.");
    }
  };

  const onCreateEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const zipCodes = zipCodesRaw
      .split(",")
      .map((item) => item.replace(/\D/g, "").slice(0, 5))
      .filter((item) => item.length === 5);

    if (!title.trim() || !description.trim() || !locationLabel.trim() || !startAt) {
      setError("Event title, description, location, and start time are required.");
      return;
    }

    setSubmittingEvent(true);
    try {
      await createEvent(
        {
          title: title.trim(),
          description: description.trim(),
          location_label: locationLabel.trim(),
          start_at: new Date(startAt).toISOString(),
          end_at: endAt ? new Date(endAt).toISOString() : undefined,
          zip_codes: zipCodes,
          website: website.trim() || undefined,
        },
        token
      );
      setTitle("");
      setDescription("");
      setLocationLabel("");
      setStartAt("");
      setEndAt("");
      setZipCodesRaw("");
      setWebsite("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event.");
    } finally {
      setSubmittingEvent(false);
    }
  };

  if (!session) {
    return (
      <main className="partner-main">
        <section className="partner-card">
          <h1>Admin Portal</h1>
          <p>Please log in first.</p>
        </section>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="partner-main">
        <section className="partner-card">
          <h1>Admin Portal</h1>
          <p>Your account is not authorized as an admin.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="partner-main">
      <section className="partner-card">
        <p className="eyebrow">Admin</p>
        <h1>Admin Portal</h1>
        <p>Approve/deny nonprofit applications and publish events for users.</p>

        {error && <p className="form-error">{error}</p>}
        {loading && <p>Loading...</p>}

        <h2>Pending Partner Applications</h2>
        <div className="admin-list">
          {applications.filter((app) => app.status === "pending").length === 0 ? (
            <p className="muted-text">No pending applications.</p>
          ) : (
            applications
              .filter((app) => app.status === "pending")
              .map((app) => (
                <article key={app.id} className="admin-item">
                  <h3>{app.client_name}</h3>
                  <p>{app.description}</p>
                  <p className="muted-text">
                    Focus: {app.focus_area === "other" ? "miscellaneous" : app.focus_area}
                  </p>
                  <div className="admin-actions">
                    <button type="button" className="solid" onClick={() => onApprove(app.id)}>
                      Approve
                    </button>
                    <button type="button" onClick={() => onDeny(app.id)}>
                      Deny
                    </button>
                  </div>
                </article>
              ))
          )}
        </div>

        <h2>Create Current Event</h2>
        <form className="partner-form" onSubmit={onCreateEvent}>
          <label>
            Event Title
            <input required value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label>
            Description
            <textarea required value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label>
            Location
            <input required value={locationLabel} onChange={(e) => setLocationLabel(e.target.value)} />
          </label>
          <div className="partner-row">
            <label>
              Start Time
              <input type="datetime-local" required value={startAt} onChange={(e) => setStartAt(e.target.value)} />
            </label>
            <label>
              End Time
              <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
            </label>
          </div>
          <label>
            ZIP Codes (comma-separated)
            <input value={zipCodesRaw} onChange={(e) => setZipCodesRaw(e.target.value)} />
          </label>
          <label>
            Website URL
            <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </label>
          <button className="solid" type="submit" disabled={submittingEvent}>
            {submittingEvent ? "Posting..." : "Post Event"}
          </button>
        </form>

        <h2>Current Events Database</h2>
        <div className="admin-list">
          {events.length === 0 ? (
            <p className="muted-text">No events posted yet.</p>
          ) : (
            events.map((evt) => (
              <article key={evt.id} className="admin-item">
                <h3>{evt.title}</h3>
                <p>{evt.description}</p>
                <p className="muted-text">
                  {evt.location_label} | {new Date(evt.start_at).toLocaleString()}
                </p>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
