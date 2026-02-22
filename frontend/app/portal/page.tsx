"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { submitEvent, updateMyPassword, updateMyProfile } from "../lib/api";
import { clearSession, loadSession, saveSession } from "../lib/session";

export default function PortalPage() {
  const router = useRouter();
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const session = isHydrated ? loadSession() : null;
  const roles = session?.roles || [];

  const [email, setEmail] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventStartAt, setEventStartAt] = useState("");
  const [eventEndAt, setEventEndAt] = useState("");
  const [eventZipCodesRaw, setEventZipCodesRaw] = useState("");
  const [eventWebsite, setEventWebsite] = useState("");
  const [eventIsFree, setEventIsFree] = useState(true);
  const [submittingEvent, setSubmittingEvent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    setEmail(session.email || "");
    setZipCode((session.zipCode || "").replace(/\D/g, "").slice(0, 5));
  }, [session]);

  const onSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session?.accessToken) return;

    const normalizedZip = zipCode.replace(/\D/g, "").slice(0, 5);
    if (normalizedZip && normalizedZip.length !== 5) {
      setError("ZIP code must be 5 digits.");
      return;
    }

    setSavingProfile(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await updateMyProfile(
        {
          email: email.trim(),
          zip_code: normalizedZip || null,
        },
        session.accessToken
      );

      saveSession({
        ...session,
        email: updated.email,
        zipCode: (updated.zip_code || "").trim(),
      });
      setSuccess("Profile settings updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile settings.");
    } finally {
      setSavingProfile(false);
    }
  };

  const onChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session?.accessToken) return;

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSavingPassword(true);
    setError(null);
    setSuccess(null);
    try {
      await updateMyPassword(newPassword, session.accessToken);
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Password updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setSavingPassword(false);
    }
  };

  const onSubmitEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session?.accessToken) return;

    const zipCodes = eventZipCodesRaw
      .split(",")
      .map((z) => z.replace(/\D/g, "").slice(0, 5))
      .filter((z) => z.length === 5);

    setSubmittingEvent(true);
    setError(null);
    setSuccess(null);
    try {
      await submitEvent(
        {
          title: eventTitle.trim(),
          description: eventDescription.trim(),
          location_label: eventLocation.trim(),
          start_at: new Date(eventStartAt).toISOString(),
          end_at: eventEndAt ? new Date(eventEndAt).toISOString() : undefined,
          zip_codes: zipCodes,
          website: eventWebsite.trim() || undefined,
          is_free: eventIsFree,
        },
        session.accessToken
      );
      setEventTitle("");
      setEventDescription("");
      setEventLocation("");
      setEventStartAt("");
      setEventEndAt("");
      setEventZipCodesRaw("");
      setEventWebsite("");
      setEventIsFree(true);
      setSuccess("Event submitted for admin review.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit event.");
    } finally {
      setSubmittingEvent(false);
    }
  };

  const onLogout = () => {
    clearSession();
    router.push("/login");
  };

  if (!session) {
    return (
      <main className="partner-main">
        <section className="partner-card">
          <h1>User Portal</h1>
          <p>Please log in first.</p>
          <Link className="solid auth-link-btn" href="/login">
            Log in
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="partner-main">
      <section className="partner-card">
        <p className="eyebrow">Account</p>
        <h1>User Portal</h1>
        <p>Update your account settings and access your available portals.</p>

        {error && <p className="form-error">{error}</p>}
        {success && <p className="form-success">{success}</p>}

        <div className="portal-tools">
          <Link href="/portal" className="portal-tool-link">
            User Portal
          </Link>
          {roles.includes("nonprofit_employee") && (
            <Link href="/nonprofit-portal" className="portal-tool-link">
              Nonprofit Portal
            </Link>
          )}
          {roles.includes("admin") && (
            <Link href="/admin-portal" className="portal-tool-link">
              Admin Portal
            </Link>
          )}
        </div>

        <h2>User Settings</h2>
        <form className="partner-form" onSubmit={onSaveProfile}>
          <label>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            Default ZIP code
            <input
              inputMode="numeric"
              maxLength={5}
              value={zipCode}
              onChange={(event) => setZipCode(event.target.value.replace(/\D/g, "").slice(0, 5))}
            />
          </label>
          <button className="solid" type="submit" disabled={savingProfile}>
            {savingProfile ? "Saving..." : "Save Settings"}
          </button>
        </form>

        <h2>Submit a Community Event</h2>
        <p>Free events will be reviewed by an admin before appearing publicly.</p>
        <form className="partner-form" onSubmit={onSubmitEvent}>
          <label>
            Event Title
            <input required value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} />
          </label>
          <label>
            Description
            <textarea required value={eventDescription} onChange={(e) => setEventDescription(e.target.value)} />
          </label>
          <label>
            Location
            <input required value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} />
          </label>
          <div className="partner-row">
            <label>
              Start Time
              <input type="datetime-local" required value={eventStartAt} onChange={(e) => setEventStartAt(e.target.value)} />
            </label>
            <label>
              End Time
              <input type="datetime-local" value={eventEndAt} onChange={(e) => setEventEndAt(e.target.value)} />
            </label>
          </div>
          <label>
            ZIP Codes (comma-separated)
            <input value={eventZipCodesRaw} onChange={(e) => setEventZipCodesRaw(e.target.value)} />
          </label>
          <label>
            Website URL
            <input type="url" value={eventWebsite} onChange={(e) => setEventWebsite(e.target.value)} />
          </label>
          <label style={{ flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
            <input
              type="checkbox"
              checked={eventIsFree}
              onChange={(e) => setEventIsFree(e.target.checked)}
            />
            This event is free to attend
          </label>
          {!eventIsFree && (
            <p className="form-error">Only free events can be approved by admins.</p>
          )}
          <button className="solid" type="submit" disabled={submittingEvent}>
            {submittingEvent ? "Submitting..." : "Submit Event"}
          </button>
        </form>

        <h2>Change Password</h2>
        <form className="partner-form" onSubmit={onChangePassword}>
          <label>
            New Password
            <input
              type="password"
              minLength={8}
              required
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </label>
          <label>
            Confirm New Password
            <input
              type="password"
              minLength={8}
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </label>
          <button className="solid" type="submit" disabled={savingPassword}>
            {savingPassword ? "Updating..." : "Update Password"}
          </button>
        </form>

        <button type="button" onClick={onLogout}>
          Log out
        </button>
      </section>
    </main>
  );
}
