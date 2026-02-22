"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  MAX_SEARCH_DISTANCE_MILES,
  MIN_SEARCH_DISTANCE_MILES,
  type ResourceCategory,
  buildCategoriesFromListings,
  getFilteredPosts,
} from "../lib/resourceMapping";
import { getNearestDistanceMilesForZip } from "../lib/zipDistance";
import { fetchResourceListings } from "../lib/api";

type ResourceCategoryPageProps = {
  category: ResourceCategory;
  initialZip?: string;
};

export default function ResourceCategoryPage({
  category,
  initialZip,
}: ResourceCategoryPageProps) {
  const router = useRouter();
  const [zipcode, setZipcode] = useState(() => (initialZip ? initialZip.slice(0, 5) : ""));
  const [distanceLimit, setDistanceLimit] = useState<number>(25);
  const [resolvedDistances, setResolvedDistances] = useState<Record<string, number>>({});
  const [posts, setPosts] = useState(category.posts);

  useEffect(() => {
    let cancelled = false;

    fetchResourceListings()
      .then((rows) => {
        if (cancelled) return;
        const categories = buildCategoriesFromListings(rows);
        const match = categories.find((item) => item.slug === category.slug);
        if (match) setPosts(match.posts);
      })
      .catch(() => {
        setPosts(category.posts);
      });

    return () => {
      cancelled = true;
    };
  }, [category.slug, category.posts]);

  useEffect(() => {
    let cancelled = false;
    const normalizedZip = zipcode.trim().slice(0, 5);

    if (!/^\d{5}$/.test(normalizedZip)) {
      return () => {
        cancelled = true;
      };
    }

    if (posts.length === 0) return;

    Promise.all(
      posts.map(async (post) => {
        const nearest = await getNearestDistanceMilesForZip(normalizedZip, post.zipcodes);
        if (typeof nearest === "number" && Number.isFinite(nearest)) {
          return [post.id, nearest] as const;
        }
        if (post.zipcodes.includes(normalizedZip)) {
          return [post.id, 0] as const;
        }
        return null;
      })
    )
      .then((entries) => {
        if (cancelled) return;
        const validEntries = entries.filter(
          (entry): entry is readonly [string, number] => Array.isArray(entry)
        );
        setResolvedDistances(Object.fromEntries(validEntries));
      })
      .catch(() => {
        if (!cancelled) setResolvedDistances({});
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
          <article
            key={post.id}
            className={`post-card detail-post-card${post.nonprofitId ? " nonprofit-link-card" : ""}`}
            role={post.nonprofitId ? "button" : undefined}
            tabIndex={post.nonprofitId ? 0 : undefined}
            onClick={() => {
              if (!post.nonprofitId) return;
              router.push(`/nonprofits/${post.nonprofitId}`);
            }}
            onKeyDown={(event) => {
              if (!post.nonprofitId) return;
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                router.push(`/nonprofits/${post.nonprofitId}`);
              }
            }}
            aria-label={post.nonprofitId ? `View nonprofit profile for ${post.title}` : undefined}
          >
            <div className="post-image">
              {post.imageUrl ? (
                <img src={post.imageUrl} alt={`${post.title} preview`} className="post-image-preview" />
              ) : (
                post.imageLabel
              )}
            </div>
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
