// frontend/app/components/ResourceCategoryPage.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  MAX_SEARCH_DISTANCE_MILES,
  MIN_SEARCH_DISTANCE_MILES,
  type ResourceCategory,
  getFilteredPosts,
} from "../data/resources";
import { getNearestDistanceMilesForZip } from "../lib/zipDistance";

type ResourceCategoryPageProps = {
  category: ResourceCategory;
  initialZip?: string;
};

export default function ResourceCategoryPage({
  category,
  initialZip,
}: ResourceCategoryPageProps) {
  const router = useRouter();

  if (!category) {
    return (
      <div className="resource-detail-page">
        <header className="resource-detail-header">
          <button type="button" className="back-link" onClick={() => router.push("/resources")}>
            Back
          </button>
        </header>
        <main className="resource-detail-hero">
          <h1>Category not found</h1>
          <p>We couldn't find that category. Please return to the resources list.</p>
        </main>
      </div>
    );
  }

  // seed zipcode from initialZip if provided
  const [zipcode, setZipcode] = useState(() => (initialZip ? initialZip.slice(0, 5) : ""));
  const [distanceLimit, setDistanceLimit] = useState<number>(25);
  const [resolvedDistances, setResolvedDistances] = useState<Record<string, number>>({});

  // memoize posts so identity doesn't change every render
  const posts = useMemo(() => category.posts ?? [], [category]);

  useEffect(() => {
    let cancelled = false;
    const normalizedZip = zipcode.trim().slice(0, 5);

    // if zip isn't a valid 5-digit zip, don't run the resolver
    if (!/^\d{5}$/.test(normalizedZip)) {
      // avoid forcing state updates on every render when zip invalid
      return () => {
        cancelled = true;
      };
    }

    // if there are no posts, ensure resolvedDistances is empty but only update if needed
    if (posts.length === 0) {
      setResolvedDistances((prev) => {
        if (Object.keys(prev).length === 0) return prev; // no-op if already empty
        return {};
      });
      return () => {
        cancelled = true;
      };
    }

    // Resolve distances for all posts (async)
    Promise.all(
      posts.map(async (post) => {
        // getNearestDistanceMilesForZip may return undefined; fallback to post.distanceMiles
        const nearest = await getNearestDistanceMilesForZip(normalizedZip, post.zipcodes);
        return [post.id, nearest ?? post.distanceMiles] as const;
      })
    )
      .then((entries) => {
        if (cancelled) return;
        setResolvedDistances(Object.fromEntries(entries));
      })
      .catch(() => {
        if (!cancelled) setResolvedDistances({});
      });

    return () => {
      cancelled = true;
    };
    // posts is memoized above, so its identity only changes when category changes
  }, [zipcode, posts]);

  // allow parent to change initialZip after mount (optional)
  useEffect(() => {
    if (initialZip && initialZip.slice(0, 5) !== zipcode) {
      setZipcode(initialZip.slice(0, 5));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialZip]);

  const filteredPosts = useMemo(() => {
    const distanceMap = /^\d{5}$/.test(zipcode.trim().slice(0, 5)) ? resolvedDistances : {};
    return getFilteredPosts(posts, zipcode, distanceLimit, distanceMap);
  }, [posts, zipcode, distanceLimit, resolvedDistances]);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/resources");
  };

  return (
    <div className="resource-detail-page">
      <header className="resource-detail-header">
        <button type="button" className="back-link" onClick={handleBack}>
          Back
        </button>
      </header>

      <section className="resource-detail-hero">
        <h1>{category.title}</h1>
        <p>{category.detailDescription}</p>
      </section>

      <section className="resource-detail-filters">
        <label htmlFor="detail-zip-filter" className="sr-only">
          Enter your zipcode
        </label>
        <input
          id="detail-zip-filter"
          type="text"
          inputMode="numeric"
          maxLength={5}
          placeholder="Enter your zipcode"
          value={zipcode}
          onChange={(event) => {
            const numericValue = event.target.value.replace(/\D/g, "").slice(0, 5);
            setZipcode(numericValue);
          }}
        />

        <div className="distance-filter-buttons" role="group" aria-label="Distance filter">
          <label htmlFor="detail-distance-slider" className="distance-slider-label">
            Distance: <strong>{distanceLimit} miles</strong>
          </label>
          <input
            id="detail-distance-slider"
            className="distance-slider"
            type="range"
            min={MIN_SEARCH_DISTANCE_MILES}
            max={MAX_SEARCH_DISTANCE_MILES}
            step={1}
            value={distanceLimit}
            onChange={(event) => setDistanceLimit(Number(event.target.value))}
          />
        </div>

        <p className="results-caption">
          Showing results for: <strong>{zipcode || "all nearby zipcodes"}</strong>
        </p>
      </section>

      <section className="resource-results-grid" aria-label={`${category.title} results`}>
        {filteredPosts.map((post) => (
          <article key={post.id} className="post-card detail-post-card">
            <div className="post-image">{post.imageLabel}</div>
            <h3>{post.title}</h3>
            <p>{post.description}</p>
            <p className="post-meta">{post.location}</p>
            <p className="post-meta">
              {(
                (/^\d{5}$/.test(zipcode.trim().slice(0, 5))
                  ? resolvedDistances[post.id]
                  : undefined) ?? post.distanceMiles
              ).toFixed(1)}{" "}
              miles away
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}