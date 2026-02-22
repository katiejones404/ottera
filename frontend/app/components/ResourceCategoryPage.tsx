"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  DISTANCE_FILTERS,
  type ResourceCategory,
  getFilteredPosts,
} from "../data/resources";

type ResourceCategoryPageProps = {
  category: ResourceCategory;
};

export default function ResourceCategoryPage({ category }: ResourceCategoryPageProps) {
  const router = useRouter();
  const [zipcode, setZipcode] = useState("");
  const [distanceLimit, setDistanceLimit] = useState<number>(10);

  const filteredPosts = useMemo(() => {
    return getFilteredPosts(category.posts, zipcode, distanceLimit);
  }, [category.posts, zipcode, distanceLimit]);

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
          {DISTANCE_FILTERS.map((filter) => (
            <button
              key={filter.label}
              type="button"
              className={distanceLimit === filter.value ? "active" : ""}
              onClick={() => setDistanceLimit(filter.value)}
            >
              {filter.label}
            </button>
          ))}
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
          </article>
        ))}
      </section>
    </div>
  );
}
