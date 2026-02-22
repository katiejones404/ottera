"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { updateMyPassword, updateMyProfile } from "../lib/api";
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
