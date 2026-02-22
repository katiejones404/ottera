"use client";
import { useState, useEffect, useCallback } from "react";
import { CommunityEvent, RsvpEntry, fetchEvents, submitRsvp, fetchEventRsvps } from "../lib/api";
import { loadSession } from "../lib/session";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<number | null> = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

function isSameDay(date1: Date, date2: Date) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export default function EventsCalendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CommunityEvent | null>(null);
  const [rsvpSuccess, setRsvpSuccess] = useState(false);
  const [rsvpError, setRsvpError] = useState("");
  const [rsvpList, setRsvpList] = useState<RsvpEntry[]>([]);
  const [rsvpCount, setRsvpCount] = useState(0);
  const [loadingRsvps, setLoadingRsvps] = useState(false);

  useEffect(() => {
    fetchEvents()
      .then(setEvents)
      .catch(() => {});
  }, []);

  const cells = getCalendarDays(year, month);

  const eventsForDay = useCallback(
    (day: number) => {
      const target = new Date(year, month, day);
      return events.filter((e) => isSameDay(new Date(e.start_at), target));
    },
    [events, year, month]
  );

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  // Load RSVP list whenever creator selects an event
  useEffect(() => {
    if (!selectedEvent) { setRsvpList([]); setRsvpCount(0); return; }
    const session = loadSession();
    if (!session || session.account.id !== selectedEvent.posted_by_user_id) return;
    setLoadingRsvps(true);
    fetchEventRsvps(selectedEvent.id, session.accessToken)
      .then(({ data, count }) => { setRsvpList(data); setRsvpCount(count); })
      .catch(() => {})
      .finally(() => setLoadingRsvps(false));
  }, [selectedEvent]);

  const handleRsvp = async () => {
    if (!selectedEvent) return;
    const session = loadSession();
    if (!session) { setRsvpError("Log in to RSVP."); return; }
    try {
      await submitRsvp(selectedEvent.id, session.accessToken);
      setRsvpSuccess(true);
      setRsvpError("");
    } catch (e: unknown) {
      setRsvpError(e instanceof Error ? e.message : "RSVP failed");
    }
  };

  if (events.length === 0) return null;

  return (
    <section className="events-calendar-section">
      <div className="events-calendar-inner">
        <div className="events-cal-header">
          <h2 className="events-cal-title">Community Events</h2>
          <div className="events-cal-nav">
            <button className="cal-nav-btn" onClick={prevMonth} aria-label="Previous month">&#8249;</button>
            <span className="cal-month-label">{MONTHS[month]} {year}</span>
            <button className="cal-nav-btn" onClick={nextMonth} aria-label="Next month">&#8250;</button>
          </div>
        </div>

        <div className="calendar-grid-wrapper">
          <div className="calendar-grid">
            {DAYS.map((d) => (
              <div key={d} className="calendar-day-header">{d}</div>
            ))}
            {cells.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} className="calendar-day empty" />;
              const dayEvents = eventsForDay(day);
              const isToday = isSameDay(new Date(year, month, day), today);
              return (
                <div key={day} className={`calendar-day${isToday ? " today" : ""}`}>
                  <span className="cal-day-num">{day}</span>
                  <div className="cal-day-events">
                    {dayEvents.map((ev) => (
                      <button
                        key={ev.id}
                        className={`event-pill${selectedEvent?.id === ev.id ? " selected" : ""}`}
                        onClick={() => { setSelectedEvent(ev); setRsvpSuccess(false); setRsvpError(""); }}
                        title={ev.title}
                      >
                        {ev.title}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {selectedEvent && (
          <div className="event-detail-card">
            <button className="event-detail-close" onClick={() => setSelectedEvent(null)} aria-label="Close">&#x2715;</button>
            <div className="event-detail-eyebrow">Event Details</div>
            <h3 className="event-detail-title">{selectedEvent.title}</h3>
            <p className="event-detail-desc">{selectedEvent.description}</p>
            <div className="event-detail-meta">
              <span>📍 {selectedEvent.location_label}</span>
              <span>🗓 {new Date(selectedEvent.start_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</span>
              {selectedEvent.end_at && (
                <span>→ {new Date(selectedEvent.end_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</span>
              )}
              {selectedEvent.website && (
                <a href={selectedEvent.website} target="_blank" rel="noreferrer" className="event-detail-link">
                  Visit Website
                </a>
              )}
            </div>
            {/* RSVP list — visible only to the event creator */}
            {(() => {
              const session = typeof window !== "undefined" ? loadSession() : null;
              if (!session || session.account.id !== selectedEvent.posted_by_user_id) return null;
              return (
                <div className="event-rsvp-list">
                  <div className="event-rsvp-list-header">
                    {loadingRsvps ? "Loading RSVPs…" : `${rsvpCount} RSVP${rsvpCount !== 1 ? "s" : ""}`}
                  </div>
                  {rsvpList.length > 0 && (
                    <ul className="event-rsvp-names">
                      {rsvpList.map((r) => (
                        <li key={r.user_id}>@{r.username || "user"}</li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })()}
            {rsvpSuccess ? (
              <p className="form-success">You&apos;re RSVPed!</p>
            ) : (
              <button className="btn solid event-rsvp-btn" onClick={handleRsvp}>
                RSVP to this event
              </button>
            )}
            {rsvpError && <p className="form-error">{rsvpError}</p>}
          </div>
        )}
      </div>
    </section>
  );
}
