"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  MAX_SEARCH_DISTANCE_MILES,
  MIN_SEARCH_DISTANCE_MILES,
  type ResourceCategory,
  type ResourceListingRecord,
  buildCategoriesFromListings,
  getFilteredPosts,
} from "../data/resources";
import { getNearestDistanceMilesForZip } from "../lib/zipDistance";
import { fetchResourceListings } from "../lib/api";

type ResourceCategoryPageProps = {
  category: ResourceCategory;
};

export default function ResourceCategoryPage({ category }: ResourceCategoryPageProps) {
  const router = useRouter();
  const [zipcode, setZipcode] = useState("");
  const [distanceLimit, setDistanceLimit] = useState<number>(25);
  const [resolvedDistances, setResolvedDistances] = useState<Record<string, number>>({});
  const [posts, setPosts] = useState(category.posts);

  useEffect(() => {
    let cancelled = false
    fetchResourceListings()
      .then((rows) => {
        if (cancelled) return
        const categories = buildCategoriesFromListings(rows as ResourceListingRecord[])
        const match = categories.find((item) => item.slug === category.slug)
        if (match) setPosts(match.posts)
      })
      .catch(() => {
        // fallback to static demo posts
      })

    return () => {
      cancelled = true
    }
  }, [category.slug])

  useEffect(() => {
    let cancelled = false;
    const normalizedZip = zipcode.trim().slice(0, 5);

    if (!/^\d{5}$/.test(normalizedZip)) {
      return () => {
        cancelled = true;
      };
    }

    Promise.all(
      posts.map(async (post) => {
        const nearest = await getNearestDistanceMilesForZip(normalizedZip, post.zipcodes);
        return [post.id, nearest ?? post.distanceMiles] as const;
      })
    ).then((entries) => {
      if (cancelled) return;
      setResolvedDistances(Object.fromEntries(entries));
    });

    return () => {
      cancelled = true;
    };
  }, [zipcode, posts]);

  const filteredPosts = useMemo(() => {
    const distanceMap = /^\d{5}$/.test(zipcode.trim().slice(0, 5)) ? resolvedDistances : {};
    return getFilteredPosts(posts, zipcode, distanceLimit, distanceMap);
  }, [posts, zipcode, distanceLimit, resolvedDistances]);

  const handleBack = () => {
    if (window.history.length > 1) {
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
              ).toFixed(1)} miles away
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}
