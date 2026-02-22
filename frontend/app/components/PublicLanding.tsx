"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MAX_SEARCH_DISTANCE_MILES,
  MIN_SEARCH_DISTANCE_MILES,
  RESOURCE_CATEGORIES,
  type ResourceListingRecord,
  buildCategoriesFromListings,
  getFilteredPosts,
} from "../data/resources";
import { getNearestDistanceMilesForZip } from "../lib/zipDistance";
import { fetchResourceListings } from "../lib/api";

type PublicLandingProps = {
  activePage: string;
  onEnterPortal: () => void;
  onNavigate?: (page: string) => void;
  isAuthenticated?: boolean;
  defaultZipcode?: string;
};

type PreviewSection = {
  key: "pantry" | "distribution" | "miscellaneous" | "clothes";
  title: string;
  sectionDescription: string;
  ctaLabel: string;
  detailSlug: "pantry" | "shelters" | "closet" | null;
};

const PREVIEW_SECTIONS: PreviewSection[] = [
  {
    key: "pantry",
    title: "Pantry",
    sectionDescription: "Closest pantry resources near you.",
    ctaLabel: "Explore all pantry resources",
    detailSlug: "pantry",
  },
  {
    key: "distribution",
    title: "Distribution",
    sectionDescription: "Closest food distribution and shelter options.",
    ctaLabel: "Explore all distribution resources",
    detailSlug: "shelters",
  },
  {
    key: "clothes",
    title: "Clothes",
    sectionDescription: "Closest clothing and closet resources near you.",
    ctaLabel: "Explore all clothing resources",
    detailSlug: "closet",
  },
  {
    key: "miscellaneous",
    title: "Miscellaneous",
    sectionDescription: "Closest miscellaneous support options from approved partners.",
    ctaLabel: "More miscellaneous resources coming soon",
    detailSlug: null,
  },
];

export default function PublicLanding({
  activePage,
  onEnterPortal,
  onNavigate,
  isAuthenticated = false,
  defaultZipcode = "",
}: PublicLandingProps) {
  const router = useRouter();

  const [zipcode, setZipcode] = useState(defaultZipcode.trim().slice(0, 5));
  const [distanceLimit, setDistanceLimit] = useState<number>(25);
  const [resolvedDistances, setResolvedDistances] = useState<Record<string, number>>({});
  const [resourceCategories, setResourceCategories] = useState(RESOURCE_CATEGORIES);

  const goToResources = () => {
    if (onNavigate) onNavigate("resources");
    else onEnterPortal();
  };

  const scrollToHowItWorks = () => {
    const element = document.getElementById("how-it-works");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (activePage !== "resources") return;
    let cancelled = false;

    fetchResourceListings()
      .then((rows) => {
        if (cancelled) return;
        const mapped = buildCategoriesFromListings(rows as ResourceListingRecord[]);
        setResourceCategories(mapped);
      })
      .catch(() => {
        setResourceCategories(RESOURCE_CATEGORIES);
      });

    return () => {
      cancelled = true;
    };
  }, [activePage]);

  useEffect(() => {
    let cancelled = false;
    const normalizedZip = zipcode.trim().slice(0, 5);
    if (!/^\d{5}$/.test(normalizedZip)) return;

    const allPosts = resourceCategories.flatMap((c) => c.posts);
    Promise.all(
      allPosts.map(async (post) => {
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
  }, [zipcode, resourceCategories]);

  const hasValidZip = /^\d{5}$/.test(zipcode.trim().slice(0, 5));

  const rowsToDisplay = useMemo(() => {
    const distanceMap = hasValidZip ? resolvedDistances : {};
    const allPostsWithCategory = resourceCategories.flatMap((category) =>
      category.posts.map((post) => ({ categorySlug: category.slug, post }))
    );

    return PREVIEW_SECTIONS.map((section) => {
      const candidates = allPostsWithCategory
        .filter(({ categorySlug, post }) => {
          if (section.key === "pantry") {
            return post.previewGroup === "pantry" || categorySlug === "pantry";
          }
          if (section.key === "distribution") {
            return post.previewGroup === "distribution" || categorySlug === "shelters";
          }
          if (section.key === "miscellaneous") {
            return post.previewGroup === "other";
          }
          return post.previewGroup === "clothing" || categorySlug === "closet";
        })
        .map(({ post }) => post);

      return {
        ...section,
        slug: section.detailSlug,
        visiblePosts: hasValidZip
          ? getFilteredPosts(candidates, zipcode, distanceLimit, distanceMap).slice(0, 3)
          : [],
      };
    });
  }, [zipcode, distanceLimit, resolvedDistances, hasValidZip, resourceCategories]);

  const sliderFillPercent =
    ((distanceLimit - MIN_SEARCH_DISTANCE_MILES) /
      (MAX_SEARCH_DISTANCE_MILES - MIN_SEARCH_DISTANCE_MILES)) *
    100;

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

    .ottera-root {
      font-family: 'DM Sans', sans-serif;
      --clay: #2A6B9C;
      --clay-mid: #3D8BBF;
      --clay-light: #DCEEF8;
      --clay-pale: #F0F7FC;
      --amber: #A07848;
      --amber-light: #F7F0E4;
      --chalk: #F8F9FA;
      --ink: #1A2733;
      --muted-text: #6B7A8A;
      --border: #D3E5F0;
      --radius-card: 20px;
      --radius-pill: 100px;
      background: var(--chalk);
      color: var(--ink);
      min-height: 100vh;
    }

    .ottera-root * { box-sizing: border-box; }

    .display-serif {
      font-family: 'DM Serif Display', Georgia, serif;
      letter-spacing: -0.02em;
      line-height: 1.1;
    }

    .hero-wrap {
      padding: 80px 24px 96px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .hero-inner {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 64px;
      align-items: center;
    }

    @media (max-width: 768px) {
      .hero-inner { grid-template-columns: 1fr; gap: 40px; }
      .hero-visual { display: none; }
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--amber-light);
      color: var(--amber);
      border: 1px solid #D9C4A0;
      border-radius: var(--radius-pill);
      padding: 6px 14px;
      font-size: 13px;
      font-weight: 500;
      letter-spacing: 0.02em;
      margin-bottom: 20px;
    }

    .badge-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--amber);
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.8); }
    }

    .hero-title {
      font-size: clamp(2.8rem, 5vw, 4.2rem);
      color: var(--ink);
      margin: 0 0 20px;
    }

    .hero-title em {
      font-style: italic;
      color: var(--clay-mid);
    }

    .hero-sub {
      font-size: 1.1rem;
      color: var(--muted-text);
      line-height: 1.7;
      max-width: 460px;
      margin: 0 0 36px;
    }

    .hero-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .btn-primary {
      background: var(--clay);
      color: #fff;
      border: none;
      border-radius: var(--radius-pill);
      padding: 14px 28px;
      font-size: 15px;
      font-weight: 500;
      font-family: 'DM Sans', sans-serif;
      cursor: pointer;
      transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
      box-shadow: 0 4px 16px rgba(42, 107, 156, 0.25);
      display: inline-flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
    }

    .btn-primary:hover {
      background: var(--clay-mid);
      transform: translateY(-1px);
      box-shadow: 0 8px 24px rgba(42, 107, 156, 0.3);
    }

    .btn-ghost {
      background: transparent;
      color: var(--ink);
      border: 1.5px solid var(--border);
      border-radius: var(--radius-pill);
      padding: 13px 26px;
      font-size: 15px;
      font-weight: 400;
      font-family: 'DM Sans', sans-serif;
      cursor: pointer;
      transition: background 0.2s, border-color 0.2s, transform 0.15s;
      text-decoration: none;
    }

    .btn-ghost:hover {
      background: var(--clay-pale);
      border-color: var(--clay-mid);
      transform: translateY(-1px);
    }

    .hero-visual { position: relative; }

    .stat-stack {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .stat-card {
      background: #fff;
      border: 1px solid var(--border);
      border-radius: var(--radius-card);
      padding: 24px 28px;
      box-shadow: 0 4px 20px rgba(42, 107, 156, 0.06);
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .stat-icon {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      flex-shrink: 0;
      background: var(--clay-light);
    }

    .stat-label { font-size: 13px; color: var(--muted-text); margin-bottom: 2px; }
    .stat-value { font-size: 22px; font-weight: 600; color: var(--ink); }

    .float-tag {
      position: absolute;
      top: -16px;
      right: -8px;
      background: var(--amber);
      color: #fff;
      border-radius: var(--radius-pill);
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 8px 20px rgba(160, 120, 72, 0.35);
      white-space: nowrap;
    }

    .trust-bar {
      border-top: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
      padding: 20px 24px;
      background: #fff;
    }

    .trust-bar-inner {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 48px;
      flex-wrap: wrap;
    }

    .trust-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
      color: var(--muted-text);
      font-weight: 400;
    }

    .trust-item strong { color: var(--ink); font-weight: 600; }

    .how-section {
      padding: 80px 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .section-eyebrow {
      text-align: center;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--clay-mid);
      margin-bottom: 12px;
    }

    .section-title {
      text-align: center;
      font-size: clamp(1.9rem, 3vw, 2.6rem);
      margin: 0 0 12px;
      color: var(--ink);
    }

    .section-sub {
      text-align: center;
      color: var(--muted-text);
      font-size: 1rem;
      max-width: 480px;
      margin: 0 auto 56px;
      line-height: 1.65;
    }

    .steps-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
    }

    @media (max-width: 700px) { .steps-grid { grid-template-columns: 1fr; } }

    .step-card {
      background: #fff;
      border: 1px solid var(--border);
      border-radius: var(--radius-card);
      padding: 36px 28px;
      box-shadow: 0 4px 20px rgba(42, 107, 156, 0.05);
    }

    .step-num {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: var(--clay);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 17px;
      margin-bottom: 20px;
    }

    .step-heading {
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--ink);
      margin: 0 0 8px;
    }

    .step-body {
      font-size: 14px;
      color: var(--muted-text);
      line-height: 1.65;
      margin: 0;
    }

    .resources-wrap {
      max-width: 1200px;
      margin: 0 auto;
      padding: 56px 24px 80px;
    }

    .page-header { margin-bottom: 40px; }

    .page-title {
      font-size: clamp(2rem, 3.5vw, 3rem);
      color: var(--ink);
      margin: 0 0 8px;
    }

    .page-sub {
      color: var(--muted-text);
      font-size: 1rem;
    }

    .filter-card {
      background: #fff;
      border: 1px solid var(--border);
      border-radius: var(--radius-card);
      padding: 32px;
      margin-bottom: 48px;
      box-shadow: 0 4px 20px rgba(42, 107, 156, 0.05);
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      align-items: end;
    }

    @media (max-width: 640px) { .filter-card { grid-template-columns: 1fr; } }

    .filter-label {
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--clay-mid);
      display: block;
      margin-bottom: 10px;
    }

    .filter-input {
      width: 100%;
      border: 1.5px solid var(--border);
      border-radius: 12px;
      padding: 12px 16px;
      font-size: 15px;
      font-family: 'DM Sans', sans-serif;
      color: var(--ink);
      background: var(--chalk);
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
      margin-bottom: 12px;
    }

    .filter-input:focus {
      border-color: var(--clay-mid);
      box-shadow: 0 0 0 3px rgba(42, 107, 156, 0.12);
    }

    .slider-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .slider-value {
      background: var(--clay-light);
      color: var(--clay);
      border-radius: 8px;
      padding: 6px 12px;
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
      flex-shrink: 0;
    }

    input[type="range"] {
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: 6px;
      border-radius: 999px;
      background: var(--border);
      padding: 0;
      margin: 0;
      outline: none;
      cursor: pointer;
      flex: 1;
    }

    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--clay);
      border: 2px solid #fff;
      box-shadow: 0 2px 8px rgba(42, 107, 156, 0.3);
      cursor: pointer;
      transition: transform 0.15s;
      margin-top: -6px;
    }

    .empty-state {
      text-align: center;
      padding: 80px 24px;
      border: 1.5px dashed var(--border);
      border-radius: var(--radius-card);
      background: #fff;
    }

    .empty-icon {
      font-size: 48px;
      display: block;
      margin: 0 auto 20px;
    }

    .empty-title {
      font-size: 1.3rem;
      font-weight: 600;
      color: var(--ink);
      margin: 0 0 8px;
    }

    .empty-sub {
      color: var(--muted-text);
      font-size: 0.95rem;
    }

    .category-section {
      padding-top: 40px;
      margin-top: 40px;
      border-top: 1px solid var(--border);
    }

    .category-section:first-child { border-top: none; margin-top: 0; }

    .category-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 28px;
      flex-wrap: wrap;
    }

    .category-title {
      font-size: 1.3rem;
      font-weight: 600;
      color: var(--ink);
      margin: 0 0 4px;
    }

    .category-desc {
      color: var(--muted-text);
      font-size: 14px;
      max-width: 480px;
      line-height: 1.55;
    }

    .posts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
    }

    .post-card {
      background: #fff;
      border: 1px solid var(--border);
      border-radius: var(--radius-card);
      padding: 24px;
    }

    .post-emoji-wrap {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      background: var(--clay-light);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      margin-bottom: 16px;
    }

    .post-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--ink);
      margin: 0 0 8px;
    }

    .post-desc {
      font-size: 13.5px;
      color: var(--muted-text);
      line-height: 1.55;
      margin: 0 0 16px;
    }

    .post-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12.5px;
      color: var(--muted-text);
      padding-top: 14px;
      border-top: 1px solid var(--border);
    }

    .distance-pill {
      background: var(--clay-light);
      color: var(--clay);
      border-radius: 100px;
      padding: 3px 10px;
      font-weight: 500;
      font-size: 12px;
    }

    .closest-inline {
      margin-top: 8px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--clay-pale);
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 6px 12px;
      font-size: 12px;
      color: var(--muted-text);
    }

    .about-wrap {
      max-width: 760px;
      margin: 80px auto;
      padding: 0 24px;
    }

    .about-card {
      background: #fff;
      border: 1px solid var(--border);
      border-radius: 28px;
      padding: 64px;
      box-shadow: 0 8px 32px rgba(42, 107, 156, 0.07);
    }

    @media (max-width: 600px) { .about-card { padding: 40px 28px; } }

    .about-title {
      font-size: 2.5rem;
      color: var(--ink);
      margin: 0 0 20px;
    }

    .about-body {
      font-size: 1.05rem;
      color: var(--muted-text);
      line-height: 1.75;
      margin: 0 0 28px;
    }

    .about-features {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 32px;
    }

    @media (max-width: 500px) { .about-features { grid-template-columns: 1fr; } }

    .about-feature {
      background: var(--clay-pale);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 18px 20px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .about-feature-icon {
      font-size: 20px;
      flex-shrink: 0;
      line-height: 1.3;
    }

    .about-feature-text {
      font-size: 14px;
      color: var(--ink);
      font-weight: 500;
      line-height: 1.4;
    }

    .about-feature-sub {
      font-size: 13px;
      color: var(--muted-text);
      margin-top: 2px;
      font-weight: 400;
    }
  `;

  if (activePage === "about") {
    return (
      <div className="ottera-root">
        <style>{styles}</style>
        <div className="about-wrap">
          <div className="about-card">
            <p className="section-eyebrow" style={{ textAlign: "left" }}>Our mission</p>
            <h1 className="display-serif about-title">About Ottera</h1>
            <p className="about-body">
              Ottera is a community message board where people facing financial hardship can find nearby help.
              Nonprofits, shelters, volunteers, and distributors share trusted opportunities in one place,
              making it easier than ever to connect those in need with available resources.
            </p>
            <p className="about-body" style={{ marginBottom: 0 }}>
              We believe access to basic necessities is a right, not a privilege. Ottera exists to reduce the
              friction between need and support.
            </p>
            <div className="about-features">
              {[
                { icon: "🔍", label: "Easy Search", sub: "Find resources by ZIP code and distance" },
                { icon: "📍", label: "Hyperlocal", sub: "Listings curated for your community" },
                { icon: "🤝", label: "Community-powered", sub: "Posted by trusted organizations" },
                { icon: "🔒", label: "Private and safe", sub: "No account needed to browse" },
              ].map((f) => (
                <div className="about-feature" key={f.label}>
                  <span className="about-feature-icon">{f.icon}</span>
                  <div>
                    <p className="about-feature-text">{f.label}</p>
                    <p className="about-feature-sub">{f.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activePage === "resources") {
    return (
      <div className="ottera-root">
        <style>{styles}</style>
        <div className="resources-wrap">
          <div className="page-header">
            <p className="section-eyebrow" style={{ textAlign: "left", marginBottom: 8 }}>Directory</p>
            <h1 className="display-serif page-title">Find Local Resources</h1>
            <p className="page-sub">Search food, clothing, and shelter programs near you.</p>
          </div>

          <div className="filter-card">
            <div>
              <label htmlFor="zip-filter" className="filter-label">Your ZIP code</label>
              <input
                id="zip-filter"
                type="text"
                inputMode="numeric"
                maxLength={5}
                placeholder="e.g. 27514"
                value={zipcode}
                onChange={(e) => setZipcode(e.target.value.replace(/\D/g, "").slice(0, 5))}
                className="filter-input"
              />
              <div className="hero-actions">
                <button type="button" className="btn-primary" onClick={goToResources}>
                  Find Resources
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => router.push("/")}
                >
                  Home
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="distance-slider" className="filter-label">Distance radius</label>
              <div className="slider-wrap">
                <input
                  id="distance-slider"
                  type="range"
                  min={MIN_SEARCH_DISTANCE_MILES}
                  max={MAX_SEARCH_DISTANCE_MILES}
                  step={1}
                  value={distanceLimit}
                  onChange={(e) => setDistanceLimit(Number(e.target.value))}
                  style={{
                    background: `linear-gradient(to right, var(--clay) 0%, var(--clay) ${sliderFillPercent}%, var(--border) ${sliderFillPercent}%, var(--border) 100%)`,
                  }}
                />
                <span className="slider-value">{distanceLimit} mi</span>
              </div>
            </div>
          </div>

          {!hasValidZip ? (
            <div className="empty-state">
              <span className="empty-icon">📍</span>
              <p className="empty-title">Enter your ZIP code above</p>
              <p className="empty-sub">We&apos;ll sort listings by distance and show what&apos;s closest to you.</p>
            </div>
          ) : (
            <div>
              {rowsToDisplay.map((row) => (
                <section key={row.key} className="category-section">
                  <div className="category-header">
                    <div>
                      <h2 className="category-title">{row.title}</h2>
                      <p className="category-desc">{row.sectionDescription}</p>
                      {row.visiblePosts[0] && (
                        <p className="closest-inline">
                          Closest: {row.visiblePosts[0].title} (
                          {(resolvedDistances[row.visiblePosts[0].id] ?? row.visiblePosts[0].distanceMiles).toFixed(1)} mi)
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      className={isAuthenticated ? "btn-primary" : "btn-ghost"}
                      disabled={!isAuthenticated || !row.slug}
                      style={!isAuthenticated || !row.slug ? { opacity: 0.55, cursor: "not-allowed" } : {}}
                      onClick={() => {
                        if (!isAuthenticated || !row.slug) return;
                        router.push(`/resources/${row.slug}`);
                      }}
                    >
                      {isAuthenticated ? row.ctaLabel : "Sign in to explore"}
                    </button>
                  </div>

                  <div className="posts-grid">
                    {row.visiblePosts.map((post) => (
                      <article key={post.id} className="post-card">
                        <div className="post-emoji-wrap">{post.imageLabel}</div>
                        <h3 className="post-title">{post.title}</h3>
                        <p className="post-desc">{post.description}</p>
                        <div className="post-meta">
                          <span>{post.location}</span>
                          <span className="distance-pill">
                            {(resolvedDistances[post.id] ?? post.distanceMiles).toFixed(1)} mi
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1ede5]">
      <section className="relative bg-gradient-to-br from-[#c7e1ee] via-[#7eabdb]/40 to-[#c7e1ee] py-20 px-6 overflow-hidden min-h-[600px] flex items-center">
        <div className="absolute top-10 left-10 w-32 h-32 bg-white/30 rounded-full blur-2xl"></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-[#7eabdb]/20 rounded-full blur-3xl"></div>

        <div className="max-w-7xl mx-auto w-full relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-[#2d5f8d] mb-4 font-[Londrina_Solid] text-[72px] leading-tight">Ottera</h1>
              <p className="text-[#7eabdb] mb-8 font-[Londrina_Solid] text-[32px] leading-relaxed">Keeping Communities Afloat</p>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  type="button"
                  onClick={goToResources}
                  className="bg-gradient-to-r from-[#7eabdb] to-[#2d5f8d] text-white px-8 py-4 rounded-full hover:shadow-xl hover:scale-105 transition-all duration-300 shadow-lg font-[Londrina_Solid] text-xl"
                >
                  Find Resources
                </button>
                <button
                  type="button"
                  onClick={scrollToHowItWorks}
                  className="bg-white/60 backdrop-blur-sm text-[#2d5f8d] px-8 py-4 rounded-full hover:bg-white/80 hover:shadow-xl hover:scale-105 transition-all duration-300 shadow-lg font-[Londrina_Solid] text-xl border-2 border-white"
                >
                  How It Works
                </button>
              </div>
            </div>

            <div className="flex justify-center md:justify-end">
              <div className="w-80 h-80 bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center shadow-[0_20px_60px_rgba(126,171,219,0.4)] border-4 border-white">
                <img
                  src="/icons/logo1.png"
                  alt="Ottera logo"
                  className="w-80 h-80 object-contain"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 w-full">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-16 md:h-24">
            <path d="M0,0 C150,80 350,80 600,50 C850,20 1050,50 1200,80 L1200,120 L0,120 Z" fill="#f1ede5"></path>
          </svg>
        </div>
      </section>

      <section id="how-it-works" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-[#2d5f8d] mb-4 font-[Londrina_Solid] text-[56px]">How It Works</h2>
            <p className="text-[#7eabdb] font-[Londrina_Solid] text-[24px]">Getting started is easy!</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-3xl p-8 shadow-lg hover:scale-105 transition-transform duration-300 border-4 border-[#c7e1ee]">
              <div className="w-20 h-20 bg-gradient-to-br from-[#7eabdb] to-[#c7e1ee] rounded-full flex items-center justify-center mb-6 shadow-md">
                <span className="text-white font-[Londrina_Solid] text-4xl">1</span>
              </div>
              <h3 className="text-[#2d5f8d] mb-4 font-[Londrina_Solid] text-3xl">Sign Up</h3>
              <p className="text-[#2d5f8d] font-[Londrina_Solid] text-lg leading-relaxed">
                Create your free account and tell us if you&apos;re seeking help, wanting to volunteer, or representing an organization.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-lg hover:scale-105 transition-transform duration-300 border-4 border-[#c7e1ee]">
              <div className="w-20 h-20 bg-gradient-to-br from-[#7eabdb] to-[#c7e1ee] rounded-full flex items-center justify-center mb-6 shadow-md">
                <span className="text-white font-[Londrina_Solid] text-4xl">2</span>
              </div>
              <h3 className="text-[#2d5f8d] mb-4 font-[Londrina_Solid] text-3xl">Connect</h3>
              <p className="text-[#2d5f8d] font-[Londrina_Solid] text-lg leading-relaxed">
                Browse local resources, find volunteer opportunities, or post what your community needs in real-time.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-lg hover:scale-105 transition-transform duration-300 border-4 border-[#c7e1ee]">
              <div className="w-20 h-20 bg-gradient-to-br from-[#7eabdb] to-[#c7e1ee] rounded-full flex items-center justify-center mb-6 shadow-md">
                <span className="text-white font-[Londrina_Solid] text-4xl">3</span>
              </div>
              <h3 className="text-[#2d5f8d] mb-4 font-[Londrina_Solid] text-3xl">Make Waves</h3>
              <p className="text-[#2d5f8d] font-[Londrina_Solid] text-lg leading-relaxed">
                Get the help you need or provide support to others. Together, we keep our communities afloat!
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#c7e1ee] via-[#7eabdb]/30 to-[#c7e1ee]"></div>
        <div className="absolute top-20 left-20 w-40 h-40 bg-white/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-48 h-48 bg-[#7eabdb]/20 rounded-full blur-3xl"></div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="bg-white/60 backdrop-blur-md rounded-[2.5rem] p-12 shadow-[0_20px_60px_rgba(126,171,219,0.4)] border-4 border-white">
            <h2 className="text-[#2d5f8d] mb-6 font-[Londrina_Solid] text-5xl">Ready to Dive In?</h2>
            <p className="text-[#7eabdb] mb-10 leading-relaxed font-[Londrina_Solid] text-2xl">
              Join Ottera today and be part of a community that cares! 🌊
            </p>
            <button
              type="button"
              onClick={() => router.push("/signup")}
              className="bg-gradient-to-r from-[#7eabdb] to-[#2d5f8d] text-white px-10 py-5 rounded-full hover:shadow-xl hover:scale-105 transition-all duration-300 shadow-lg font-[Londrina_Solid] text-xl"
            >
              Get Started Now
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
