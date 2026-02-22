"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  addVerifiedNonprofitUsername,
  fetchManagedNonprofits,
  removeVerifiedNonprofitUsername,
  type ManagedNonprofit,
  uploadNonprofitMedia,
  updateManagedNonprofit,
} from "../lib/api";
import { loadSession } from "../lib/session";

function formatAddressesForInput(addresses: ManagedNonprofit["addresses"]) {
  return (addresses || [])
    .map((address) => [address.line1, address.city, address.state, address.zip].filter(Boolean).join(", "))
    .join("\n");
}

function parseAddresses(raw: string) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [line1 = "", city = "", state = "", zip = ""] = line.split(",").map((part) => part.trim());
      return { line1, city, state, zip: zip.replace(/\D/g, "").slice(0, 5) };
    });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

export default function NonprofitPortalPage() {
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const session = isHydrated ? loadSession() : null;
  const roles = session?.roles || [];
  const canAccess = roles.includes("nonprofit_employee");

  const [nonprofits, setNonprofits] = useState<ManagedNonprofit[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [description, setDescription] = useState("");
  const [meetingTimes, setMeetingTimes] = useState("");
  const [zipCodesRaw, setZipCodesRaw] = useState("");
  const [addressesRaw, setAddressesRaw] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [photoFiles, setPhotoFiles] = useState<Array<File | null>>([null, null, null, null]);
  const [newVerifiedUsername, setNewVerifiedUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedNonprofit = useMemo(
    () => nonprofits.find((item) => item.id === selectedId) || null,
    [nonprofits, selectedId]
  );

  const hydrateEditor = (nonprofit: ManagedNonprofit | null) => {
    if (!nonprofit) return;
    setDescription(nonprofit.description || "");
    setMeetingTimes(nonprofit.distribution_schedule || "");
    setZipCodesRaw((nonprofit.zip_codes || []).join(", "));
    setAddressesRaw(formatAddressesForInput(nonprofit.addresses));
    setLogoFile(null);
    setPhotoFiles([null, null, null, null]);
  };

  const loadData = async () => {
    if (!session?.accessToken || !canAccess) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchManagedNonprofits(session.accessToken);
      setNonprofits(rows);
      const nextId = rows[0]?.id || "";
      setSelectedId(nextId);
      hydrateEditor(rows[0] || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load nonprofit manager data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken, canAccess]);

  useEffect(() => {
    hydrateEditor(selectedNonprofit);
  }, [selectedNonprofit]);

  const onSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session?.accessToken || !selectedNonprofit) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const zipCodes = zipCodesRaw
        .split(",")
        .map((item) => item.replace(/\D/g, "").slice(0, 5))
        .filter((item) => item.length === 5);
      const addresses = parseAddresses(addressesRaw);

      const updated = await updateManagedNonprofit(
        selectedNonprofit.id,
        {
          description: description.trim(),
          distribution_schedule: meetingTimes.trim(),
          zip_codes: zipCodes,
          addresses,
        },
        session.accessToken
      );

      if (logoFile) {
        const logoDataUrl = await fileToDataUrl(logoFile);
        await uploadNonprofitMedia(
          selectedNonprofit.id,
          { kind: "logo", data_url: logoDataUrl },
          session.accessToken
        );
      }

      for (let slot = 0; slot < photoFiles.length; slot += 1) {
        const file = photoFiles[slot];
        if (!file) continue;
        const photoDataUrl = await fileToDataUrl(file);
        await uploadNonprofitMedia(
          selectedNonprofit.id,
          { kind: "photo", slot, data_url: photoDataUrl },
          session.accessToken
        );
      }

      setNonprofits((current) =>
        current.map((row) => (row.id === updated.id ? updated : row))
      );
      await loadData();
      setSuccess("Nonprofit settings updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update nonprofit settings.");
    } finally {
      setSaving(false);
    }
  };

  const onAddVerifiedUsername = async () => {
    if (!session?.accessToken || !selectedNonprofit) return;
    const username = newVerifiedUsername.trim();
    if (!username) return;

    setError(null);
    setSuccess(null);
    try {
      await addVerifiedNonprofitUsername(selectedNonprofit.id, username, session.accessToken);
      await loadData();
      setNewVerifiedUsername("");
      setSuccess("Verified username added.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add verified username.");
    }
  };

  const onRemoveVerifiedUsername = async (username: string) => {
    if (!session?.accessToken || !selectedNonprofit) return;
    setError(null);
    setSuccess(null);
    try {
      await removeVerifiedNonprofitUsername(selectedNonprofit.id, username, session.accessToken);
      await loadData();
      setSuccess("Verified username removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove verified username.");
    }
  };

  if (!session) {
    return (
      <main className="partner-main">
        <section className="partner-card">
          <h1>Nonprofit Portal</h1>
          <p>Please log in first.</p>
          <Link className="solid auth-link-btn" href="/login">
            Log in
          </Link>
        </section>
      </main>
    );
  }

  if (!canAccess) {
    return (
      <main className="partner-main">
        <section className="partner-card">
          <h1>Nonprofit Portal</h1>
          <p>Your account is not authorized as a nonprofit employee.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="partner-main">
      <section className="partner-card">
        <p className="eyebrow">Nonprofit</p>
        <h1>Nonprofit Portal</h1>
        <p>Manage nonprofit description, meeting times, ZIP codes, addresses, and verified usernames.</p>

        {error && <p className="form-error">{error}</p>}
        {success && <p className="form-success">{success}</p>}
        {loading && <p>Loading...</p>}

        <div className="portal-tools">
          <Link href="/portal" className="portal-tool-link">
            User Portal
          </Link>
          <Link href="/nonprofit-portal" className="portal-tool-link">
            Nonprofit Portal
          </Link>
          {roles.includes("admin") && (
            <Link href="/admin-portal" className="portal-tool-link">
              Admin Portal
            </Link>
          )}
        </div>

        {nonprofits.length === 0 ? (
          <p className="muted-text">No manageable nonprofit profiles found for your account.</p>
        ) : (
          <>
            <label>
              Select Nonprofit
              <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
                {nonprofits.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <form className="partner-form" onSubmit={onSave}>
              <label>
                Description
                <textarea
                  required
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>
              <label>
                Meeting Times
                <input
                  value={meetingTimes}
                  onChange={(event) => setMeetingTimes(event.target.value)}
                  placeholder="e.g. Tue/Thu 6:00 PM - 7:30 PM"
                />
              </label>
              <label>
                ZIP Codes (comma-separated)
                <input
                  value={zipCodesRaw}
                  onChange={(event) => setZipCodesRaw(event.target.value)}
                />
              </label>
              <label>
                Addresses (one per line: line1, city, state, zip)
                <textarea
                  value={addressesRaw}
                  onChange={(event) => setAddressesRaw(event.target.value)}
                  placeholder="120 Harbor St, Raleigh, NC, 27601"
                />
              </label>
              <label>
                Logo Photo
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setLogoFile(file);
                  }}
                />
                {!logoFile && selectedNonprofit?.logo_url ? (
                  <span className="muted-text">Current: logo already uploaded.</span>
                ) : null}
              </label>
              {[0, 1, 2, 3].map((slot) => (
                <label key={`photo-slot-${slot}`}>
                  Photo {slot + 1}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null;
                      setPhotoFiles((current) => {
                        const next = [...current];
                        next[slot] = file;
                        return next;
                      });
                    }}
                  />
                  {!photoFiles[slot] && selectedNonprofit?.photo_urls?.[slot] ? (
                    <span className="muted-text">Current: photo {slot + 1} already uploaded.</span>
                  ) : null}
                </label>
              ))}
              <button className="solid" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Nonprofit Settings"}
              </button>
            </form>

            <h2>Verified Nonprofit Employee Usernames</h2>
            <div className="admin-list">
              {(selectedNonprofit?.verified_usernames || []).length === 0 ? (
                <p className="muted-text">No verified usernames yet.</p>
              ) : (
                selectedNonprofit?.verified_usernames.map((username) => (
                  <article key={username} className="admin-item">
                    <p>{username}</p>
                    <div className="admin-actions">
                      <button type="button" onClick={() => onRemoveVerifiedUsername(username)}>
                        Remove
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="partner-row">
              <label>
                Add Verified Username
                <input
                  value={newVerifiedUsername}
                  onChange={(event) => setNewVerifiedUsername(event.target.value)}
                  placeholder="username"
                />
              </label>
              <button type="button" className="solid" onClick={onAddVerifiedUsername}>
                Add Username
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
