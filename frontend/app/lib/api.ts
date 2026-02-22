const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

type AuthPayload = {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  password: string;
  birthday?: string;
  zip_code?: string;
  phone?: string;
  roles?: string[];
};

export type AuthResponse = {
  user_id: string;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  zip_code?: string | null;
  roles: string[];
  primary_role: string;
  access_token: string;
  refresh_token: string;
};

export async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string }> {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Token refresh failed");
  return data;
}

export async function registerUser(payload: AuthPayload): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Registration failed");
  return data;
}

export async function loginUser(payload: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Login failed");
  return data;
}

export type ResourceListing = {
  id: string;
  title: string;
  description: string;
  category_slug: "pantry" | "closet" | "shelters";
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
    zip_codes?: string[] | null;
    photo_urls?: string[] | null;
    logo_url?: string | null;
  } | null;
};

export async function fetchResourceListings(): Promise<ResourceListing[]> {
  const res = await fetch(`${API_BASE}/resources/listings`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to fetch resource listings");
  return (data?.data || []) as ResourceListing[];
}

export type UserProfile = {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  zip_code?: string | null;
};

export async function fetchMyProfile(accessToken: string): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/users/me/profile`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to load profile");
  return data?.data as UserProfile;
}

export async function updateMyProfile(
  payload: { email?: string; zip_code?: string | null },
  accessToken: string
): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/users/me/profile`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to update profile");
  return data?.data as UserProfile;
}

export async function updateMyPassword(newPassword: string, accessToken: string) {
  const res = await fetch(`${API_BASE}/users/me/password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ new_password: newPassword }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to update password");
  return data;
}

export type ManagedNonprofit = {
  id: string;
  name: string;
  website?: string | null;
  description?: string | null;
  distribution_schedule?: string | null;
  zip_codes: string[];
  addresses: Array<{ line1?: string; city?: string; state?: string; zip?: string }>;
  focus_area?: string | null;
  photo_urls?: string[];
  logo_url?: string | null;
  verified_usernames: string[];
};

export type NonprofitProfileListing = {
  id: string;
  title: string;
  description: string;
  category_slug: "pantry" | "closet" | "shelters";
  location_label: string;
  zip_codes: string[];
  distribution_schedule?: string | null;
  status: string;
};

export type NonprofitProfile = {
  id: string;
  name: string;
  website?: string | null;
  description?: string | null;
  distribution_schedule?: string | null;
  zip_codes: string[];
  addresses: Array<{ line1?: string; city?: string; state?: string; zip?: string }>;
  focus_area?: string | null;
  photo_urls?: string[];
  logo_url?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  verified_usernames: string[];
  listings: NonprofitProfileListing[];
};

export async function fetchNonprofitProfile(nonprofitId: string): Promise<NonprofitProfile> {
  const res = await fetch(`${API_BASE}/nonprofits/${nonprofitId}/profile`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to load nonprofit profile");
  return data?.data as NonprofitProfile;
}

export async function fetchNonprofitSubscriptionStatus(nonprofitId: string, accessToken: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/nonprofits/${nonprofitId}/subscription`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to load subscription status");
  return Boolean(data?.data?.subscribed);
}

export async function subscribeToNonprofit(nonprofitId: string, accessToken: string) {
  const res = await fetch(`${API_BASE}/nonprofits/${nonprofitId}/subscription`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to subscribe");
  return data;
}

export async function unsubscribeFromNonprofit(nonprofitId: string, accessToken: string) {
  const res = await fetch(`${API_BASE}/nonprofits/${nonprofitId}/subscription`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to unsubscribe");
  return data;
}

export async function fetchManagedNonprofits(accessToken: string): Promise<ManagedNonprofit[]> {
  const res = await fetch(`${API_BASE}/nonprofits/manage`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to load nonprofit manager data");
  return (data?.data || []) as ManagedNonprofit[];
}

export async function updateManagedNonprofit(
  nonprofitId: string,
  payload: {
    description?: string;
    distribution_schedule?: string;
    zip_codes?: string[];
    addresses?: Array<{ line1?: string; city?: string; state?: string; zip?: string }>;
    photo_urls?: string[];
    logo_url?: string | null;
  },
  accessToken: string
): Promise<ManagedNonprofit> {
  const res = await fetch(`${API_BASE}/nonprofits/${nonprofitId}/manage`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to update nonprofit");
  return data?.data as ManagedNonprofit;
}

export async function uploadNonprofitMedia(
  nonprofitId: string,
  payload: { kind: "logo" | "photo"; slot?: number; data_url: string },
  accessToken: string
) {
  const res = await fetch(`${API_BASE}/nonprofits/${nonprofitId}/media`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to upload nonprofit media");
  return data;
}

export async function addVerifiedNonprofitUsername(
  nonprofitId: string,
  username: string,
  accessToken: string
) {
  const res = await fetch(`${API_BASE}/nonprofits/${nonprofitId}/admin-usernames`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ username }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to add verified username");
  return data;
}

export async function removeVerifiedNonprofitUsername(
  nonprofitId: string,
  username: string,
  accessToken: string
) {
  const encoded = encodeURIComponent(username);
  const res = await fetch(`${API_BASE}/nonprofits/${nonprofitId}/admin-usernames/${encoded}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to remove verified username");
  return data;
}

export async function submitPartnerApplication(payload: {
  client_name: string;
  website?: string;
  description: string;
  distribution_schedule?: string;
  contact_email?: string;
  contact_phone?: string;
  addresses: Array<{ line1: string; city: string; state: string; zip: string }>;
  zip_codes: string[];
  focus_area: "food" | "shelter" | "clothing" | "healthcare" | "miscellaneous" | "other";
  requested_admin_usernames: string[];
}) {
  const res = await fetch(`${API_BASE}/partners/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to submit partner application");
  return data;
}

export type PartnerApplication = {
  id: string;
  client_name: string;
  website?: string | null;
  description: string;
  distribution_schedule?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  addresses: Array<{ line1?: string; city?: string; state?: string; zip?: string }>;
  zip_codes: string[];
  focus_area: string;
  requested_admin_usernames: string[];
  status: "pending" | "approved" | "denied";
  submitted_at: string;
  reviewed_at?: string | null;
};

export type CommunityEvent = {
  id: string;
  title: string;
  description: string;
  location_label: string;
  start_at: string;
  end_at?: string | null;
  zip_codes: string[];
  website?: string | null;
  is_free: boolean;
  status: "active" | "inactive" | "pending";
  posted_by_user_id?: string | null;
  created_at: string;
};

export async function fetchPartnerApplications(accessToken: string): Promise<PartnerApplication[]> {
  const res = await fetch(`${API_BASE}/partners/applications`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to fetch partner applications");
  return (data?.data || []) as PartnerApplication[];
}

export async function approvePartnerApplication(applicationId: string, accessToken: string) {
  const res = await fetch(`${API_BASE}/partners/applications/${applicationId}/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to approve application");
  return data;
}

export async function denyPartnerApplication(applicationId: string, accessToken: string) {
  const res = await fetch(`${API_BASE}/partners/applications/${applicationId}/deny`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to deny application");
  return data;
}

export async function fetchEvents(): Promise<CommunityEvent[]> {
  const res = await fetch(`${API_BASE}/events`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to fetch events");
  return (data?.data || []) as CommunityEvent[];
}

export async function createEvent(
  payload: {
    title: string;
    description: string;
    location_label: string;
    start_at: string;
    end_at?: string;
    zip_codes: string[];
    website?: string;
  },
  accessToken: string
) {
  const res = await fetch(`${API_BASE}/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to create event");
  return data;
}

export async function submitEvent(
  payload: {
    title: string;
    description: string;
    location_label: string;
    start_at: string;
    end_at?: string;
    zip_codes: string[];
    website?: string;
    is_free: boolean;
  },
  accessToken: string
) {
  const res = await fetch(`${API_BASE}/events/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to submit event");
  return data;
}

export async function fetchPendingEvents(accessToken: string): Promise<CommunityEvent[]> {
  const res = await fetch(`${API_BASE}/events/pending`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to fetch pending events");
  return (data?.data || []) as CommunityEvent[];
}

export async function approveEvent(eventId: string, accessToken: string) {
  const res = await fetch(`${API_BASE}/events/${eventId}/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to approve event");
  return data;
}

export async function deleteEvent(eventId: string, accessToken: string) {
  const res = await fetch(`${API_BASE}/events/${eventId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to delete event");
  return data;
}

export async function submitRsvp(eventId: string, accessToken: string) {
  const res = await fetch(`${API_BASE}/rsvp`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ event_id: eventId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to RSVP");
  return data;
}

export type RsvpEntry = { user_id: string; username: string | null; created_at: string };

export async function fetchEventRsvps(eventId: string, accessToken: string): Promise<{ data: RsvpEntry[]; count: number }> {
  const res = await fetch(`${API_BASE}/events/${eventId}/rsvps`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to fetch RSVPs");
  return { data: data?.data || [], count: data?.count || 0 };
}

export async function toggleMessageLike(messageId: string, accessToken: string): Promise<{ liked: boolean; like_count: number }> {
  const res = await fetch(`${API_BASE}/messages/${messageId}/like`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to toggle like");
  return data;
}

// ── Clothing Marketplace ─────────────────────────────────────

export type ClothingItem = {
  id: string;
  seller_id: string;
  seller_username: string;
  title: string;
  description?: string | null;
  category?: string | null;
  size?: string | null;
  condition?: string | null;
  zip_code?: string | null;
  photo_urls: string[];
  is_sold: boolean;
  sold_at?: string | null;
  created_at: string;
};

export async function fetchClothingItems(filters?: { category?: string; size?: string; zip_code?: string }): Promise<ClothingItem[]> {
  const params = new URLSearchParams();
  if (filters?.category) params.set("category", filters.category);
  if (filters?.size) params.set("size", filters.size);
  if (filters?.zip_code) params.set("zip_code", filters.zip_code);
  const query = params.toString() ? `?${params}` : "";
  const res = await fetch(`${API_BASE}/clothing/items${query}`, { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to fetch clothing items");
  return (data?.data || []) as ClothingItem[];
}

export async function createClothingItem(
  payload: {
    title: string;
    description?: string;
    category?: string;
    size?: string;
    condition?: string;
    photo_data_urls?: string[];
  },
  accessToken: string
): Promise<ClothingItem> {
  const res = await fetch(`${API_BASE}/clothing/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to create listing");
  return data?.data as ClothingItem;
}

export async function markItemSold(itemId: string, accessToken: string) {
  const res = await fetch(`${API_BASE}/clothing/items/${itemId}/sold`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to mark as sold");
  return data;
}

export async function deleteClothingItem(itemId: string, accessToken: string) {
  const res = await fetch(`${API_BASE}/clothing/items/${itemId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to delete item");
  return data;
}

export async function toggleItemLike(itemId: string, accessToken: string): Promise<{ liked: boolean }> {
  const res = await fetch(`${API_BASE}/clothing/items/${itemId}/like`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to toggle like");
  return data;
}

export async function fetchItemLikeStatus(itemId: string, accessToken: string): Promise<{ liked: boolean; count: number }> {
  const res = await fetch(`${API_BASE}/clothing/items/${itemId}/like-status`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to fetch like status");
  return data;
}

export async function fetchMyClothingItems(accessToken: string): Promise<ClothingItem[]> {
  const res = await fetch(`${API_BASE}/clothing/my-items`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to fetch your listings");
  return (data?.data || []) as ClothingItem[];
}

export async function fetchMyLikedItems(accessToken: string): Promise<ClothingItem[]> {
  const res = await fetch(`${API_BASE}/clothing/my-likes`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to fetch liked items");
  return (data?.data || []) as ClothingItem[];
}

// ── Messaging / Conversations ────────────────────────────────

export type ConversationMessage = {
  id: string;
  conversation_id: string;
  sender_id?: string | null;
  sender_username?: string | null;
  content: string;
  event_id?: string | null;
  created_at: string;
  like_count?: number;
  liked_by_me?: boolean;
};

export type Conversation = {
  id: string;
  type: "dm" | "channel";
  nonprofit_id?: string | null;
  created_at: string;
  nonprofits?: { id: string; name: string; logo_url?: string | null } | null;
  lastMessage?: ConversationMessage | null;
  otherUsername?: string | null;
  otherFirstName?: string | null;
};

export async function fetchConversations(accessToken: string): Promise<Conversation[]> {
  const res = await fetch(`${API_BASE}/conversations`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to fetch conversations");
  return (data?.data || []) as Conversation[];
}

export async function startDM(username: string, accessToken: string): Promise<Conversation & { existing: boolean }> {
  const res = await fetch(`${API_BASE}/conversations/dm`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ username }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to start conversation");
  return { ...data?.data, existing: data?.existing } as Conversation & { existing: boolean };
}

export async function fetchMessages(conversationId: string, accessToken: string): Promise<ConversationMessage[]> {
  const res = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to fetch messages");
  return (data?.data || []) as ConversationMessage[];
}

export async function sendMessage(conversationId: string, content: string, accessToken: string, eventId?: string): Promise<ConversationMessage> {
  const res = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ content, event_id: eventId || null }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to send message");
  return data?.data as ConversationMessage;
}

export async function broadcastToChannel(nonprofitId: string, content: string, accessToken: string, eventId?: string) {
  const res = await fetch(`${API_BASE}/nonprofits/${nonprofitId}/broadcast`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ content, event_id: eventId || null }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to broadcast");
  return data;
}

export async function fetchNonprofitChannel(nonprofitId: string): Promise<{ id: string } | null> {
  const res = await fetch(`${API_BASE}/nonprofits/${nonprofitId}/channel`);
  const data = await res.json();
  if (!res.ok) return null;
  return data?.data || null;
}
