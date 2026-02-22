"use client";
import { useState, useEffect, useRef } from "react";
import {
  ClothingItem,
  fetchClothingItems,
  createClothingItem,
  markItemSold,
  deleteClothingItem,
  toggleItemLike,
} from "../lib/api";
import { loadSession } from "../lib/session";

const CATEGORIES = ["tops", "bottoms", "shoes", "accessories", "outerwear", "other"];
const CONDITIONS = ["new", "like_new", "good", "fair"];
const CONDITION_LABELS: Record<string, string> = {
  new: "New",
  like_new: "Like New",
  good: "Good",
  fair: "Fair",
};
const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "One Size", "Kids"];

const PLACEHOLDER_GRADIENTS = [
  "linear-gradient(135deg, #d0e8f5 0%, #a8cfe8 100%)",
  "linear-gradient(135deg, #f5e6d0 0%, #e8cfa8 100%)",
  "linear-gradient(135deg, #d0f5e0 0%, #a8e8c0 100%)",
  "linear-gradient(135deg, #f0d0f5 0%, #d8a8e8 100%)",
];

interface Props {
  onMessageSeller?: (username: string) => void;
}

export default function ClothingMarketplace({ onMessageSeller }: Props) {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState("");
  const [filterSize, setFilterSize] = useState("");
  const [filterZip, setFilterZip] = useState(loadSession()?.zipCode || "");
  const [showModal, setShowModal] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"browse" | "mine" | "liked">("browse");

  const session = loadSession();
  const accessToken = session?.accessToken ?? null;
  const myUserId = session?.account?.id ?? null;
  const myUsername = session?.username ?? null;

  // New listing form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    size: "",
    condition: "",
  });
  const [photoDataUrls, setPhotoDataUrls] = useState<string[]>([]);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchClothingItems(
        filterCat || filterSize || filterZip
          ? { category: filterCat || undefined, size: filterSize || undefined, zip_code: filterZip || undefined }
          : undefined
      );
      setItems(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filterCat, filterSize, filterZip]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 3 - photoDataUrls.length;
    const toRead = files.slice(0, remaining);
    toRead.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setPhotoDataUrls((prev) => [...prev, result].slice(0, 3));
      };
      reader.readAsDataURL(file);
    });
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) { setFormError("You must be logged in to list items."); return; }
    if (!form.title.trim()) { setFormError("Title is required."); return; }
    setSubmitting(true);
    setFormError("");
    try {
      const item = await createClothingItem(
        { ...form, photo_data_urls: photoDataUrls },
        accessToken
      );
      setItems((prev) => [item, ...prev]);
      setShowModal(false);
      setForm({ title: "", description: "", category: "", size: "", condition: "" });
      setPhotoDataUrls([]);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to create listing");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (item: ClothingItem) => {
    if (!accessToken) return;
    try {
      const result = await toggleItemLike(item.id, accessToken);
      setLikedIds((prev) => {
        const next = new Set(prev);
        result.liked ? next.add(item.id) : next.delete(item.id);
        return next;
      });
    } catch { /* ignore */ }
  };

  const handleMarkSold = async (item: ClothingItem) => {
    if (!accessToken) return;
    try {
      await markItemSold(item.id, accessToken);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch { /* ignore */ }
  };

  const handleDelete = async (item: ClothingItem) => {
    if (!accessToken) return;
    try {
      await deleteClothingItem(item.id, accessToken);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch { /* ignore */ }
  };

  const displayItems =
    activeTab === "mine"
      ? items.filter((i) => i.seller_id === myUserId)
      : activeTab === "liked"
      ? items.filter((i) => likedIds.has(i.id))
      : items;

  return (
    <div className="clothing-marketplace">
      {/* Header */}
      <div className="clothing-header">
        <div>
          <span className="eyebrow">Free Clothing</span>
          <h1 className="clothing-title">Community Closet</h1>
          <p className="clothing-subtitle">Everything here is free. Find something you need, or share something you don&apos;t.</p>
        </div>
        {accessToken && (
          <button className="btn solid" onClick={() => setShowModal(true)}>
            + List an Item
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="clothing-tabs">
        <button className={`clothing-tab${activeTab === "browse" ? " active" : ""}`} onClick={() => setActiveTab("browse")}>Browse All</button>
        {myUsername && (
          <button className={`clothing-tab${activeTab === "mine" ? " active" : ""}`} onClick={() => setActiveTab("mine")}>My Listings</button>
        )}
        {accessToken && (
          <button className={`clothing-tab${activeTab === "liked" ? " active" : ""}`} onClick={() => setActiveTab("liked")}>Saved</button>
        )}
      </div>

      {/* Filters */}
      <div className="clothing-filters">
        <select
          className="clothing-filter-select"
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
        <select
          className="clothing-filter-select"
          value={filterSize}
          onChange={(e) => setFilterSize(e.target.value)}
        >
          <option value="">All Sizes</option>
          {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input
          className="clothing-filter-select"
          inputMode="numeric"
          maxLength={5}
          placeholder="ZIP code"
          value={filterZip}
          onChange={(e) => setFilterZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
        />
        {(filterCat || filterSize || filterZip) && (
          <button className="btn" onClick={() => { setFilterCat(""); setFilterSize(""); setFilterZip(""); }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <p className="muted-text" style={{ textAlign: "center", padding: "2rem" }}>Loading items&hellip;</p>
      ) : displayItems.length === 0 ? (
        <div className="clothing-empty">
          <p>No items here yet.</p>
          {activeTab === "browse" && accessToken && (
            <button className="btn solid" onClick={() => setShowModal(true)}>Be the first to list something</button>
          )}
        </div>
      ) : (
        <div className="clothing-grid">
          {displayItems.map((item, idx) => (
            <ClothingCard
              key={item.id}
              item={item}
              placeholderGradient={PLACEHOLDER_GRADIENTS[idx % PLACEHOLDER_GRADIENTS.length]}
              isLiked={likedIds.has(item.id)}
              isMine={item.seller_id === myUserId}
              isLoggedIn={Boolean(accessToken)}
              onLike={() => handleLike(item)}
              onMarkSold={() => handleMarkSold(item)}
              onDelete={() => handleDelete(item)}
              onMessage={() => onMessageSeller?.(item.seller_username)}
            />
          ))}
        </div>
      )}

      {/* List Item Modal */}
      {showModal && (
        <div className="clothing-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="clothing-modal" onClick={(e) => e.stopPropagation()}>
            <div className="clothing-modal-header">
              <h2>List a Free Item</h2>
              <button className="clothing-modal-close" onClick={() => setShowModal(false)}>&#x2715;</button>
            </div>
            <form className="clothing-form" onSubmit={handleSubmit}>
              <label>
                Title <span style={{ color: "red" }}>*</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Blue winter jacket, size M"
                  required
                />
              </label>
              <label>
                Description
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Any details about the item…"
                  rows={3}
                />
              </label>
              <div className="clothing-form-row">
                <label>
                  Category
                  <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                    <option value="">Select…</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </label>
                <label>
                  Size
                  <select value={form.size} onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))}>
                    <option value="">Select…</option>
                    {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
              </div>
              <label>
                Condition
                <select value={form.condition} onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}>
                  <option value="">Select…</option>
                  {CONDITIONS.map((c) => <option key={c} value={c}>{CONDITION_LABELS[c]}</option>)}
                </select>
              </label>
              <label>
                Photos (up to 3)
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoChange}
                  style={{ padding: "0.3rem 0" }}
                />
              </label>
              {photoDataUrls.length > 0 && (
                <div className="clothing-photo-previews">
                  {photoDataUrls.map((url, i) => (
                    <div key={i} className="clothing-photo-preview-wrap">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`preview ${i + 1}`} className="clothing-photo-preview" />
                      <button
                        type="button"
                        className="clothing-photo-remove"
                        onClick={() => setPhotoDataUrls((prev) => prev.filter((_, j) => j !== i))}
                      >
                        &#x2715;
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {formError && <p className="form-error">{formError}</p>}
              <button type="submit" className="btn solid" disabled={submitting}>
                {submitting ? "Listing…" : "List Item"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ClothingCard({
  item,
  placeholderGradient,
  isLiked,
  isMine,
  isLoggedIn,
  onLike,
  onMarkSold,
  onDelete,
  onMessage,
}: {
  item: ClothingItem;
  placeholderGradient: string;
  isLiked: boolean;
  isMine: boolean;
  isLoggedIn: boolean;
  onLike: () => void;
  onMarkSold: () => void;
  onDelete: () => void;
  onMessage: () => void;
}) {
  const mainPhoto = item.photo_urls?.[0];

  return (
    <div className="clothing-card">
      <div className="clothing-card-photo" style={{ background: mainPhoto ? undefined : placeholderGradient }}>
        {mainPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mainPhoto} alt={item.title} className="clothing-card-img" />
        ) : (
          <span className="clothing-card-photo-placeholder">👕</span>
        )}
        {isLoggedIn && (
          <button
            className={`like-btn${isLiked ? " liked" : ""}`}
            onClick={onLike}
            aria-label={isLiked ? "Unlike" : "Like"}
            title={isLiked ? "Remove from saved" : "Save item"}
          >
            {isLiked ? "♥" : "♡"}
          </button>
        )}
      </div>
      <div className="clothing-card-body">
        <h3 className="clothing-card-title">{item.title}</h3>
        <div className="clothing-card-badges">
          {item.condition && (
            <span className="clothing-badge">{CONDITION_LABELS[item.condition] || item.condition}</span>
          )}
          {item.size && <span className="clothing-badge">{item.size}</span>}
          {item.category && <span className="clothing-badge cat">{item.category}</span>}
        </div>
        {item.description && (
          <p className="clothing-card-desc">{item.description}</p>
        )}
        <p className="clothing-card-seller">by @{item.seller_username}</p>
        <div className="clothing-card-actions">
          {isMine ? (
            <>
              <button className="btn solid" onClick={onMarkSold}>Mark as Claimed</button>
              <button className="btn" onClick={onDelete}>Delete</button>
            </>
          ) : (
            isLoggedIn && item.seller_username && item.seller_username !== "anonymous" && (
              <button className="btn" onClick={onMessage}>Message Seller</button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
