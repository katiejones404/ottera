export type ResourceCategorySlug = "pantry" | "closet" | "shelters";

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

export type ResourceListingRecord = {
  id: string;
  title: string;
  description: string;
  category_slug: ResourceCategorySlug;
  listing_source: "individual" | "nonprofit";
  nonprofit_id?: string | null;
  posted_by_username?: string | null;
  location_label: string;
  zip_codes: string[];
  website?: string | null;
  contact_info?: Record<string, unknown> | null;
  distribution_schedule?: string | null;
  status: string;
  nonprofits?: {
    id: string;
    name: string;
    website?: string | null;
    approval_status?: string | null;
    focus_area?: string | null;
    photo_urls?: string[] | null;
    logo_url?: string | null;
  } | null;
};

export const MIN_SEARCH_DISTANCE_MILES = 0;
export const MAX_SEARCH_DISTANCE_MILES = 200;

export const RESOURCE_CATEGORIES: ResourceCategory[] = [
  {
    slug: "pantry",
    title: "Pantry",
    sectionDescription: "Search pantries and free meal events.",
    detailDescription: "More pantries and free meal events in your area.",
    ctaLabel: "Explore more dining options",
    posts: [
      {
        id: "pantry-1",
        title: "Triangle Pantry Pop-Up",
        description: "Free produce and canned goods while supplies last.",
        location: "Durham, NC",
        imageLabel: "Image",
        distanceMiles: 4,
        zipcodes: ["27701", "27703", "27601"],
      },
      {
        id: "pantry-2",
        title: "Community Soup Night",
        description: "Hot dinner and to-go meal kits.",
        location: "Raleigh, NC",
        imageLabel: "Image",
        distanceMiles: 8,
        zipcodes: ["27601", "27604", "27701"],
      },
      {
        id: "pantry-3",
        title: "Mobile Grocery Stop",
        description: "No ID needed. One full box per family.",
        location: "Cary, NC",
        imageLabel: "Image",
        distanceMiles: 12,
        zipcodes: ["27511", "27513", "27601"],
      },
      {
        id: "pantry-4",
        title: "Weekend Breakfast Table",
        description: "Fresh breakfast served every Sunday morning.",
        location: "Morrisville, NC",
        imageLabel: "Image",
        distanceMiles: 6,
        zipcodes: ["27560", "27513", "27601"],
      },
      {
        id: "pantry-5",
        title: "Neighborhood Meal Drop",
        description: "Prepared meal boxes available for pickup.",
        location: "Garner, NC",
        imageLabel: "Image",
        distanceMiles: 9,
        zipcodes: ["27529", "27603", "27601"],
      },
      {
        id: "pantry-6",
        title: "Fresh Market Donation Day",
        description: "Fresh fruit and bread from local partners.",
        location: "Wake Forest, NC",
        imageLabel: "Image",
        distanceMiles: 14,
        zipcodes: ["27587", "27614", "27601"],
      },
    ],
  },
  {
    slug: "closet",
    title: "Closet",
    sectionDescription: "Browse shelters and closets accepting visitors this week.",
    detailDescription: "More closets and clothing resources near you.",
    ctaLabel: "Explore more from the closet",
    posts: [
      {
        id: "closet-1",
        title: "Winter Coat Closet",
        description: "Adult and youth coats plus gloves in all sizes.",
        location: "Chapel Hill, NC",
        imageLabel: "Image",
        distanceMiles: 5,
        zipcodes: ["27514", "27516", "27701"],
      },
      {
        id: "closet-2",
        title: "Interview Ready Rack",
        description: "Professional attire and quick tailoring support.",
        location: "Raleigh, NC",
        imageLabel: "Image",
        distanceMiles: 9,
        zipcodes: ["27601", "27610", "27511"],
      },
      {
        id: "closet-3",
        title: "School Uniform Drive",
        description: "Uniform pants, polos, and backpacks for K-12.",
        location: "Durham, NC",
        imageLabel: "Image",
        distanceMiles: 11,
        zipcodes: ["27701", "27704", "27601"],
      },
      {
        id: "closet-4",
        title: "Community Shoe Bank",
        description: "Sneakers, boots, and socks while inventory lasts.",
        location: "Apex, NC",
        imageLabel: "Image",
        distanceMiles: 7,
        zipcodes: ["27502", "27539", "27511"],
      },
      {
        id: "closet-5",
        title: "Family Basics Closet",
        description: "Everyday clothing packs for households in need.",
        location: "Cary, NC",
        imageLabel: "Image",
        distanceMiles: 10,
        zipcodes: ["27511", "27513", "27601"],
      },
      {
        id: "closet-6",
        title: "Kids Seasonal Wear",
        description: "Seasonal jackets and shoes for children.",
        location: "Fuquay-Varina, NC",
        imageLabel: "Image",
        distanceMiles: 13,
        zipcodes: ["27526", "27540", "27511"],
      },
    ],
  },
  {
    slug: "shelters",
    title: "Shelters",
    sectionDescription: "Browse shelter availability and free community events.",
    detailDescription: "More shelters and support events close to your zipcode.",
    ctaLabel: "Explore more shelters",
    posts: [
      {
        id: "shelter-1",
        title: "Bed Availability Update",
        description: "Open family rooms and women-only beds tonight.",
        location: "Raleigh Shelter Hub",
        imageLabel: "Image",
        distanceMiles: 3,
        zipcodes: ["27601", "27603", "27511"],
      },
      {
        id: "shelter-2",
        title: "Free Legal Aid Clinic",
        description: "Walk-ins for housing and benefits questions.",
        location: "Durham Civic Center",
        imageLabel: "Image",
        distanceMiles: 10,
        zipcodes: ["27701", "27703", "27601"],
      },
      {
        id: "shelter-3",
        title: "Community Resource Fair",
        description: "Meals, health checks, and referrals in one place.",
        location: "Cary Transit Plaza",
        imageLabel: "Image",
        distanceMiles: 12,
        zipcodes: ["27511", "27513", "27601"],
      },
      {
        id: "shelter-4",
        title: "Emergency Weather Shelter",
        description: "Overnight check-in opens at 7 PM.",
        location: "Wake County",
        imageLabel: "Image",
        distanceMiles: 6,
        zipcodes: ["27601", "27610", "27539"],
      },
      {
        id: "shelter-5",
        title: "Pop-Up Case Management",
        description: "Housing referrals and ID replacement help.",
        location: "Raleigh Downtown",
        imageLabel: "Image",
        distanceMiles: 8,
        zipcodes: ["27601", "27605", "27701"],
      },
      {
        id: "shelter-6",
        title: "Weekend Warming Center",
        description: "Safe overnight shelter during severe weather.",
        location: "Knightdale, NC",
        imageLabel: "Image",
        distanceMiles: 15,
        zipcodes: ["27545", "27610", "27601"],
      },
    ],
  },
];

export function getResourceCategoryBySlug(slug: string): ResourceCategory | null {
  return RESOURCE_CATEGORIES.find((category) => category.slug === slug) ?? null;
}

export function getFilteredPosts(
  posts: ResourcePost[],
  zipcode: string,
  maxDistance: number,
  resolvedDistances: Record<string, number> = {}
): ResourcePost[] {
  const normalizedZip = zipcode.trim().slice(0, 5);
  const boundedDistance = Math.max(MIN_SEARCH_DISTANCE_MILES, Math.min(MAX_SEARCH_DISTANCE_MILES, maxDistance));

  return posts
    .map((post) => ({
      post,
      computedDistance:
        normalizedZip.length === 5
          ? (resolvedDistances[post.id] ?? post.distanceMiles)
          : post.distanceMiles
    }))
    .filter(({ computedDistance }) => computedDistance <= boundedDistance)
    .sort((a, b) => a.computedDistance - b.computedDistance)
    .map(({ post }) => post);
}

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
};

const categoryEmoji: Record<ResourceCategorySlug, string> = {
  pantry: "🍽️",
  closet: "👕",
  shelters: "🏠",
};

export function buildCategoriesFromListings(listings: ResourceListingRecord[]): ResourceCategory[] {
  const grouped: Record<ResourceCategorySlug, ResourcePost[]> = {
    pantry: [],
    closet: [],
    shelters: [],
  };

  for (const listing of listings) {
    const normalizedFocusArea =
      listing.nonprofits?.focus_area === "other" ? "miscellaneous" : listing.nonprofits?.focus_area;

    const cat: ResourceCategorySlug =
      normalizedFocusArea === "miscellaneous" ? "closet" : listing.category_slug;
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
      zipcodes: Array.isArray(listing.zip_codes) ? listing.zip_codes : [],
      nonprofitId: listing.nonprofit_id ?? null,
      nonprofitFocusArea: normalizedFocusArea ?? null,
      previewGroup:
        normalizedFocusArea === "miscellaneous"
          ? "other"
          : cat === "pantry"
            ? "pantry"
            : cat === "shelters"
              ? "distribution"
              : "clothing",
    });
  }

  return (Object.keys(CATEGORY_META) as ResourceCategorySlug[]).map((slug) => ({
    ...CATEGORY_META[slug],
    posts: grouped[slug],
  }));
}
