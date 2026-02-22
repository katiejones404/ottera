"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  fetchNonprofitProfile,
  fetchNonprofitSubscriptionStatus,
  subscribeToNonprofit,
  unsubscribeFromNonprofit,
  type NonprofitProfile,
} from "../lib/api";
import { loadSession } from "../lib/session";

type NonprofitProfilePageProps = {
  nonprofitId: string;
};

const SUBSCRIBABLE_FOCUS_AREAS = new Set(["food", "shelter", "miscellaneous", "other"]);

const categoryLabel = (slug: "pantry" | "closet" | "shelters") => {
  if (slug === "pantry") return "Pantry";
  if (slug === "shelters") return "Distribution";
  return "Clothes";
};

export default function NonprofitProfilePage({ nonprofitId }: NonprofitProfilePageProps) {
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const session = isHydrated ? loadSession() : null;

  const [profile, setProfile] = useState<NonprofitProfile | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const photoSlots = (profile?.photo_urls || []).slice(0, 4);

  const canSubscribe = useMemo(() => {
    const focus = profile?.focus_area || "";
    return SUBSCRIBABLE_FOCUS_AREAS.has(focus);
  }, [profile?.focus_area]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const nextProfile = await fetchNonprofitProfile(nonprofitId);
        if (!cancelled) setProfile(nextProfile);

        if (session?.accessToken) {
          const status = await fetchNonprofitSubscriptionStatus(nonprofitId, session.accessToken);
          if (!cancelled) setSubscribed(status);
        } else if (!cancelled) {
          setSubscribed(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load nonprofit profile.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [nonprofitId, session?.accessToken]);

  const onToggleSubscribe = async () => {
    if (!session?.accessToken) return;
    if (!profile || !canSubscribe) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      if (subscribed) {
        await unsubscribeFromNonprofit(nonprofit.id, session.accessToken);
        setSubscribed(false);
        setSuccess("You are unsubscribed from this channel.");
      } else {
        await subscribeToNonprofit(nonprofit.id, session.accessToken);
        setSubscribed(true);
        setSuccess("You are subscribed to this nonprofit channel.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update subscription.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="partner-main">
        <section className="partner-card">
          <h1>Nonprofit Profile</h1>
          <p>Loading...</p>
        </section>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="partner-main">
        <section className="partner-card">
          <h1>Nonprofit Profile</h1>
          <p className="form-error">{error || "Profile not found."}</p>
          <Link href="/resources" className="portal-tool-link">
            Back to resources
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="partner-main nonprofit-profile-main">
      <section className="partner-card nonprofit-profile-card">
        <div className="nonprofit-topbar">
          <Link href="/resources" className="portal-tool-link">
            Back to resources
          </Link>
        </div>

        <p className="eyebrow">Nonprofit Profile</p>
        <h1>{profile.name}</h1>
        <p className="muted-text">{profile.description || "No description provided yet."}</p>

        <div className="nonprofit-collage" aria-label="Nonprofit image collage">
          <div className="nonprofit-collage-grid">
            {[0, 1, 2, 3].map((slot) => {
              const slotPhoto = photoSlots[slot];
              return (
                <div
                  key={slot}
                  className={`nonprofit-collage-cell nonprofit-collage-${["a", "b", "c", "d"][slot]}`}
                >
                  {slotPhoto ? (
                    <img src={slotPhoto} alt={`${profile.name} photo ${slot + 1}`} className="nonprofit-collage-image" />
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="nonprofit-logo-center">
            <img src={profile.logo_url || "/logo.png"} alt={`${profile.name} logo`} />
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}
        {success && <p className="form-success">{success}</p>}

        {canSubscribe ? (
          session ? (
            <button className="solid" type="button" onClick={onToggleSubscribe} disabled={submitting}>
              {submitting ? "Saving..." : subscribed ? "Unsubscribe" : "Subscribe"}
            </button>
          ) : (
            <Link href="/login" className="portal-tool-link">
              Log in to subscribe
            </Link>
          )
        ) : (
          <p className="muted-text">Subscriptions are enabled for pantry, distribution, and miscellaneous channels.</p>
        )}

        <div className="nonprofit-meta-grid">
          <div className="admin-item">
            <h3>Meeting Times</h3>
            <p>{profile.distribution_schedule || "Not provided"}</p>
          </div>
          <div className="admin-item">
            <h3>Website</h3>
            <p>{profile.website || "Not provided"}</p>
          </div>
        </div>

        <h2>Service ZIP Codes</h2>
        <p className="muted-text">{(profile.zip_codes || []).join(", ") || "Not provided"}</p>

        <h2>Addresses</h2>
        <div className="admin-list">
          {(profile.addresses || []).length === 0 ? (
            <p className="muted-text">No addresses listed.</p>
          ) : (
            profile.addresses.map((address, index) => (
              <article key={`${address.line1 || "address"}-${index}`} className="admin-item">
                <p>{[address.line1, address.city, address.state, address.zip].filter(Boolean).join(", ")}</p>
              </article>
            ))
          )}
        </div>

        <h2>Verified Employee Usernames</h2>
        <p className="muted-text">
          {(profile.verified_usernames || []).length > 0
            ? profile.verified_usernames.join(", ")
            : "No verified usernames listed."}
        </p>

        <h2>Nearby Listings</h2>
        <div className="admin-list">
          {(profile.listings || []).length === 0 ? (
            <p className="muted-text">No active listings available.</p>
          ) : (
            profile.listings.map((listing) => (
              <article key={listing.id} className="admin-item">
                <h3>{listing.title}</h3>
                <p>{listing.description}</p>
                <p className="muted-text">
                  {categoryLabel(listing.category_slug)} | {listing.location_label}
                </p>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
