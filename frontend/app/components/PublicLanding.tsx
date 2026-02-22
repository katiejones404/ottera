import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DISTANCE_FILTERS,
  RESOURCE_CATEGORIES,
  getFilteredPosts,
} from "../data/resources";

type PublicLandingProps = {
  activePage: string;
  onEnterPortal: () => void;
};

export default function PublicLanding({
  activePage,
  onEnterPortal,
}: PublicLandingProps) {
  const router = useRouter();
  const [zipcode, setZipcode] = useState("");
  const [distanceLimit, setDistanceLimit] = useState<number>(10);

  const rowsToDisplay = useMemo(() => {
    return RESOURCE_CATEGORIES.map((category) => ({
      ...category,
      visiblePosts: getFilteredPosts(category.posts, zipcode, distanceLimit).slice(0, 3),
    }));
  }, [zipcode, distanceLimit]);

  if (activePage === "about") {
    return (
      <section className="panel">
        <h1>About Ottera</h1>
        <p>
          Ottera is a community message board where people facing financial hardship
          can find nearby help. Nonprofits, shelters, volunteers, and distributors
          share trusted opportunities in one place.
        </p>
      </section>
    );
  }

  if (activePage === "resources") {
    return (
      <section className="resources-panel">
        <h1 className="resources-title">Find Resources</h1>

        <div className="zip-filter-wrap">
          <label htmlFor="zip-filter" className="sr-only">
            Enter your zipcode
          </label>
          <input
            id="zip-filter"
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
        </div>

        {rowsToDisplay.map((row) => (
          <article key={row.slug} className="resource-row">
            <div className="resource-row-header">
              <h2>{row.title}</h2>
              <p>{row.sectionDescription}</p>
            </div>

            <div className="resource-row-track" aria-label={`${row.title} posts`}>
              {row.visiblePosts.map((post) => (
                <article key={post.id} className="post-card">
                  <div className="post-image">{post.imageLabel}</div>
                  <h3>{post.title}</h3>
                  <p>{post.description}</p>
                  <p className="post-meta">{post.location}</p>
                </article>
              ))}
            </div>

            <button
              type="button"
              className="solid resource-cta"
              onClick={() => router.push(`/resources/${row.slug}`)}
            >
              {row.ctaLabel}
            </button>
          </article>
        ))}
      </section>
    );
  }

  return (
    <section className="panel">
      <p className="eyebrow">Community aid, simplified</p>
      <h1>Find help fast. Share help locally.</h1>
      <p>
        Ottera helps community members discover food, clothing, shelter, and free
        events in their city. Make an account to connect with volunteers and
        distributors.
      </p>
      <div className="hero-actions">
        <button type="button" className="solid" onClick={onEnterPortal}>
          Find Resources
        </button>
        <button type="button">How It Works</button>
      </div>
    </section>
  );
}
