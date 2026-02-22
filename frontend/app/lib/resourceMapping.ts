import type { ResourceListing } from "./api";

export type ResourceCategorySlug = "pantry" | "closet" | "shelters" | "miscellaneous";

export type ResourcePost = {
  id: string;
  title: string;
  description: string;
  location: string;
  imageLabel: string;
  imageUrl?: string;
  distanceMiles: number;
  zipcodes: string[];
  nonprofitId?: string | null;
  nonprofitFocusArea?: string | null;
  previewGroup?: "pantry" | "distribution" | "clothing" | "other";
};

export type ResourceCategory = {
  slug: ResourceCategorySlug;
  title: string;
  sectionDescription: string;
  detailDescription: string;
  ctaLabel: string;
  posts: ResourcePost[];
};

export const MIN_SEARCH_DISTANCE_MILES = 0;
export const MAX_SEARCH_DISTANCE_MILES = 200;

const CATEGORY_META: Record<ResourceCategorySlug, Omit<ResourceCategory, "posts">> = {
  pantry: {
    slug: "pantry",
    title: "Pantry",
    sectionDescription: "Search pantries and free meal events.",
    detailDescription: "More pantries and free meal events in your area.",
    ctaLabel: "Explore more dining options",
  },
  closet: {
    slug: "closet",
    title: "Closet",
    sectionDescription: "Browse shelters and closets accepting visitors this week.",
    detailDescription: "More closets and clothing resources near you.",
    ctaLabel: "Explore more from the closet",
  },
  shelters: {
    slug: "shelters",
    title: "Shelters",
    sectionDescription: "Browse shelter availability and free community events.",
    detailDescription: "More shelters and support events close to your zipcode.",
    ctaLabel: "Explore more shelters",
  },
  miscellaneous: {
    slug: "miscellaneous",
    title: "Miscellaneous",
    sectionDescription: "Browse other community support resources near you.",
    detailDescription: "More miscellaneous support resources from approved partners.",
    ctaLabel: "Explore more miscellaneous resources",
  },
};

export const RESOURCE_CATEGORY_META = CATEGORY_META;

const categoryEmoji: Record<ResourceCategorySlug, string> = {
  pantry: "\uD83C\uDF7D\uFE0F",
  closet: "\uD83D\uDC55",
  shelters: "\uD83C\uDFE0",
  miscellaneous: "\u2728",
};

export const ALLOWED_RESOURCE_SLUGS: ResourceCategorySlug[] = ["pantry", "closet", "shelters", "miscellaneous"];

export function buildCategoriesFromListings(listings: ResourceListing[]): ResourceCategory[] {
  const grouped: Record<ResourceCategorySlug, ResourcePost[]> = {
    pantry: [],
    closet: [],
    shelters: [],
    miscellaneous: [],
  };

  for (const listing of listings) {
    const normalizedFocusArea =
      listing.nonprofits?.focus_area === "other" ? "miscellaneous" : listing.nonprofits?.focus_area;

    const cat: ResourceCategorySlug =
      normalizedFocusArea === "miscellaneous" ? "miscellaneous" : listing.category_slug;
    if (!grouped[cat]) continue;

    grouped[cat].push({
      id: listing.id,
      title: listing.title,
      description:
        listing.distribution_schedule && listing.distribution_schedule.length > 0
          ? `${listing.description} (${listing.distribution_schedule})`
          : listing.description,
      location: listing.location_label,
      imageLabel: categoryEmoji[cat],
      imageUrl: listing.nonprofits?.photo_urls?.[0] || listing.nonprofits?.logo_url || undefined,
      distanceMiles: 25,
      zipcodes:
        Array.isArray(listing.zip_codes) && listing.zip_codes.length > 0
          ? listing.zip_codes
          : Array.isArray(listing.nonprofits?.zip_codes)
            ? listing.nonprofits.zip_codes
            : [],
      nonprofitId: listing.nonprofit_id ?? null,
      nonprofitFocusArea: normalizedFocusArea ?? null,
      previewGroup:
        cat === "miscellaneous"
          ? "other"
          : cat === "pantry"
            ? "pantry"
            : cat === "shelters"
              ? "distribution"
              : "clothing",
    });
  }

  return ALLOWED_RESOURCE_SLUGS.map((slug) => ({
    ...CATEGORY_META[slug],
    posts: grouped[slug],
  }));
}

export function getResourceCategoryBySlug(
  slug: string,
  categories: ResourceCategory[]
): ResourceCategory | null {
  return categories.find((category) => category.slug === slug) ?? null;
}

export function getFilteredPosts(
  posts: ResourcePost[],
  zipcode: string,
  maxDistance: number,
  resolvedDistances: Record<string, number> = {}
): ResourcePost[] {
  const normalizedZip = zipcode.trim().slice(0, 5);
  const hasValidZip = /^\d{5}$/.test(normalizedZip);
  const boundedDistance = Math.max(
    MIN_SEARCH_DISTANCE_MILES,
    Math.min(MAX_SEARCH_DISTANCE_MILES, maxDistance)
  );

  return posts
    .map((post) => ({
      post,
      computedDistance: (() => {
        if (!hasValidZip) return post.distanceMiles;

        const resolved = resolvedDistances[post.id];
        if (typeof resolved === "number" && Number.isFinite(resolved)) return resolved;

        if (post.zipcodes.includes(normalizedZip)) return 0;
        return MAX_SEARCH_DISTANCE_MILES + 1;
      })(),
    }))
    .filter(({ computedDistance }) => computedDistance <= boundedDistance)
    .sort((a, b) => a.computedDistance - b.computedDistance)
    .map(({ post }) => post);
}
