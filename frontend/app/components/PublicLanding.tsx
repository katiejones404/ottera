"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MAX_SEARCH_DISTANCE_MILES,
  MIN_SEARCH_DISTANCE_MILES,
  RESOURCE_CATEGORIES,
  getFilteredPosts,
} from "../data/resources";
import { getNearestDistanceMilesForZip } from "../lib/zipDistance";

type PublicLandingProps = {
  activePage: string;
  onEnterPortal: () => void;
  onNavigate?: (page: string) => void;
  isAuthenticated?: boolean;
  defaultZipcode?: string;
};

export default function PublicLanding({
  activePage,
  onEnterPortal,
  onNavigate,
  isAuthenticated = false,
  defaultZipcode = "",
}: PublicLandingProps) {
  const router = useRouter();
  const howRef = useRef<HTMLElement | null>(null);

  const [zipcode, setZipcode] = useState(defaultZipcode.trim().slice(0, 5));
  const [distanceLimit, setDistanceLimit] = useState<number>(25);
  const [resolvedDistances, setResolvedDistances] = useState<Record<string, number>>({});

  const goToResources = () => {
    if (onNavigate) onNavigate("resources");
    else onEnterPortal();
  };

  const scrollToHowItWorks = () => {
    howRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    let cancelled = false;
    const normalizedZip = zipcode.trim().slice(0, 5);
    if (!/^\d{5}$/.test(normalizedZip)) return;
    const allPosts = RESOURCE_CATEGORIES.flatMap((c) => c.posts);
    Promise.all(
      allPosts.map(async (post) => {
        const nearest = await getNearestDistanceMilesForZip(normalizedZip, post.zipcodes);
        return [post.id, nearest ?? post.distanceMiles] as const;
      })
    ).then((entries) => {
      if (cancelled) return;
      setResolvedDistances(Object.fromEntries(entries));
    });
    return () => { cancelled = true; };
  }, [zipcode]);

  const hasValidZip = /^\d{5}$/.test(zipcode.trim().slice(0, 5));

  const rowsToDisplay = useMemo(() => {
    const distanceMap = hasValidZip ? resolvedDistances : {};
    return RESOURCE_CATEGORIES.map((category) => ({
      ...category,
      visiblePosts: hasValidZip
        ? getFilteredPosts(category.posts, zipcode, distanceLimit, distanceMap).slice(0, 3)
        : [],
    }));
  }, [zipcode, distanceLimit, resolvedDistances, hasValidZip]);

  /* ============ SHARED STYLES ============ */
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

    /* Typography */
    .display-serif {
      font-family: 'DM Serif Display', Georgia, serif;
      letter-spacing: -0.02em;
      line-height: 1.1;
    }

    /* ---- HERO ---- */
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
    }

    .btn-ghost:hover {
      background: var(--clay-pale);
      border-color: var(--clay-mid);
      transform: translateY(-1px);
    }

    /* Hero visual panel */
    .hero-visual {
      position: relative;
    }

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
      transition: transform 0.2s;
    }

    .stat-card:hover { transform: translateX(4px); }

    .stat-icon {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      flex-shrink: 0;
    }

    .stat-icon.green { background: var(--clay-light); }
    .stat-icon.amber { background: var(--amber-light); }
    .stat-icon.sage { background: #E4F0F7; }

    .stat-label { font-size: 13px; color: var(--muted-text); margin-bottom: 2px; }
    .stat-value { font-size: 22px; font-weight: 600; color: var(--ink); }

    /* Floating accent */
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

    /* ---- TRUST BAR ---- */
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

    .trust-sep {
      width: 1px;
      height: 20px;
      background: var(--border);
    }

    @media (max-width: 600px) { .trust-sep { display: none; } }

    /* ---- HOW IT WORKS ---- */
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
      position: relative;
    }

    @media (max-width: 700px) {
      .steps-grid { grid-template-columns: 1fr; }
    }

    .step-card {
      background: #fff;
      border: 1px solid var(--border);
      border-radius: var(--radius-card);
      padding: 36px 28px;
      box-shadow: 0 4px 20px rgba(42, 107, 156, 0.05);
      transition: box-shadow 0.25s, transform 0.25s;
    }

    .step-card:hover {
      box-shadow: 0 12px 40px rgba(42, 107, 156, 0.1);
      transform: translateY(-3px);
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

    /* ---- RESOURCES PAGE ---- */
    .resources-wrap {
      max-width: 1200px;
      margin: 0 auto;
      padding: 56px 24px 80px;
    }

    .page-header {
      margin-bottom: 40px;
    }

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
      height: 4px;
      border-radius: 4px;
      background: var(--border);
      outline: none;
      cursor: pointer;
    }

    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--clay);
      box-shadow: 0 2px 8px rgba(42, 107, 156, 0.3);
      cursor: pointer;
      transition: transform 0.15s;
    }

    input[type="range"]::-webkit-slider-thumb:hover { transform: scale(1.15); }

    /* Empty state */
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

    /* Category section */
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
      transition: box-shadow 0.25s, transform 0.25s, border-color 0.25s;
      cursor: default;
    }

    .post-card:hover {
      box-shadow: 0 12px 36px rgba(42, 107, 156, 0.1);
      transform: translateY(-3px);
      border-color: #9FCBE0;
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

    /* ---- ABOUT PAGE ---- */
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

  /* ================= ABOUT ================= */
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
              Nonprofits, shelters, volunteers, and distributors share trusted opportunities in one place —
              making it easier than ever to connect those in need with the resources available in their community.
            </p>
            <p className="about-body" style={{ marginBottom: 0 }}>
              We believe access to basic necessities is a right, not a privilege. Ottera exists to reduce the
              friction between need and support.
            </p>
            <div className="about-features">
              {[
                { icon: "🔍", label: "Easy Search", sub: "Find resources by ZIP code & distance" },
                { icon: "📍", label: "Hyperlocal", sub: "Listings curated for your community" },
                { icon: "🤝", label: "Community-powered", sub: "Posted by trusted organizations" },
                { icon: "🔒", label: "Private & safe", sub: "No accounts required to browse" },
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

  /* ================= RESOURCES ================= */
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
                />
                <span className="slider-value">{distanceLimit} mi</span>
              </div>
            </div>
          </div>

          {!hasValidZip ? (
            <div className="empty-state">
              <span className="empty-icon">📍</span>
              <p className="empty-title">Enter your ZIP code above</p>
              <p className="empty-sub">We'll sort listings by distance and show what's closest to you.</p>
            </div>
          ) : (
            <div>
              {rowsToDisplay.map((row) => (
                <section key={row.slug} className="category-section">
                  <div className="category-header">
                    <div>
                      <h2 className="category-title">{row.title}</h2>
                      <p className="category-desc">{row.sectionDescription}</p>
                    </div>
                    <button
                      type="button"
                      className={isAuthenticated ? "btn-primary" : "btn-ghost"}
                      disabled={!isAuthenticated}
                      style={!isAuthenticated ? { opacity: 0.55, cursor: "not-allowed" } : {}}
                      onClick={() => {
                        if (!isAuthenticated) return;
                        router.push(`/resources/${row.slug}`);
                      }}
                    >
                      {isAuthenticated ? row.ctaLabel : "Sign in to explore →"}
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

  /* ================= LANDING ================= */
  return (
    <div className="ottera-root">
      <style>{styles}</style>

      {/* HERO */}
      <div className="hero-wrap">
        <div className="hero-inner">
          <div>
            <div className="badge">
              <span className="badge-dot" />
              Community aid, simplified
            </div>

            <h1 className="display-serif hero-title">
              Find help <em>fast</em>.<br />
              Share help locally.
            </h1>

            <p className="hero-sub">
              Discover food banks, shelters, clothing drives, and free events
              near you — all in one trusted place.
            </p>

            <div className="hero-actions">
              <button className="btn-primary" onClick={goToResources}>
                Find Resources →
              </button>
              <button className="btn-ghost" onClick={scrollToHowItWorks}>
                How It Works
              </button>
            </div>
          </div>

          <div className="hero-visual">
            <div className="stat-stack">
              <div className="stat-card">
                <div className="stat-icon green">🥗</div>
                <div>
                  <p className="stat-label">Food programs nearby</p>
                  <p className="stat-value">120+ listings</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon amber">👕</div>
                <div>
                  <p className="stat-label">Clothing drives active</p>
                  <p className="stat-value">48 this month</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon sage">🏠</div>
                <div>
                  <p className="stat-label">Shelter & housing resources</p>
                  <p className="stat-value">Searching near you</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TRUST BAR */}
      <div className="trust-bar">
        <div className="trust-bar-inner">
          <div className="trust-item">🏛️ <span><strong>Nonprofit-verified</strong> listings</span></div>
          <div className="trust-sep" />
          <div className="trust-item">📍 <span>Search by <strong>ZIP code</strong></span></div>
          <div className="trust-sep" />
          <div className="trust-item">🔒 <span><strong>No data sold,</strong> ever</span></div>
          <div className="trust-sep" />
          <div className="trust-item">💚 <span><strong>Free</strong> for anyone in need</span></div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section id="how-it-works" ref={howRef}>
        <div className="how-section">
          <p className="section-eyebrow">Getting started</p>
          <h2 className="display-serif section-title">How Ottera Works</h2>
          <p className="section-sub">Three simple steps to connect with help in your area.</p>

          <div className="steps-grid">
            {[
              {
                num: "1",
                title: "Create an account",
                body: "Sign up in under a minute. Your information stays private and is never shared with third parties.",
              },
              {
                num: "2",
                title: "Browse resources",
                body: "Enter your ZIP code and we'll surface food, clothing, shelter, and community events closest to you.",
              },
              {
                num: "3",
                title: "Stay updated",
                body: "Save your favorite programs and get notified when new resources are added in your area.",
              },
            ].map((step) => (
              <div key={step.num} className="step-card">
                <div className="step-num">{step.num}</div>
                <p className="step-heading">{step.title}</p>
                <p className="step-body">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}