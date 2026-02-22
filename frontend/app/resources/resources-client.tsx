// frontend/app/resources/resources-client.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  RESOURCE_CATEGORIES,
  type ResourceCategory,
  getResourceCategoryBySlug,
} from "../data/resources";
import ResourceCategoryPage from "../components/ResourceCategoryPage";

type Props = {
  initialZip?: string;
};

export default function ResourcesClient({ initialZip = "" }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParam = searchParams?.get?.("category") ?? "";
  const zipParam = searchParams?.get?.("zip") ?? initialZip ?? "";

  // ensure we have a validated 5-digit zip before showing results
  const normalizedZip = zipParam.replace(/\D/g, "").slice(0, 5);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // while client hydrates, don't render (prevents mismatch)
  if (!mounted) return null;

  // If the URL doesn't have a valid zip, redirect to gate (this mirrors your prior logic)
  if (!/^\d{5}$/.test(normalizedZip)) {
    router.replace("/resources/zipcode");
    return null;
  }

  // If a category slug is present, render the category page
  if (categoryParam) {
    const category = getResourceCategoryBySlug(categoryParam);
    if (!category) {
      // If slug invalid, fallback to showing categories grid so user can pick
      return <div className="p-8">Category not found. <Link href={`/resources?zip=${normalizedZip}`}>Back</Link></div>;
    }

    // Pass initialZip so the category page can seed its zipcode input
    return <ResourceCategoryPage category={category} initialZip={normalizedZip} />;
  }

  // Otherwise show a categories grid
  return (
    <main className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <p className="text-sm text-muted">Showing categories for ZIP <strong>{normalizedZip}</strong></p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {RESOURCE_CATEGORIES.map((c) => (
          <div key={c.slug} className="p-6 rounded shadow bg-white">
            <h3 className="text-xl font-semibold">{c.title}</h3>
            <p className="mt-2 text-sm">{c.sectionDescription}</p>

            <div className="mt-4 flex gap-2">
              {/* client-side navigation: include zip and category in query */}
              <button
                onClick={() => router.push(`/resources?zip=${normalizedZip}&category=${c.slug}`)}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                View {c.title}
              </button>

              <Link href={`/resources?zip=${normalizedZip}&category=${c.slug}`} className="px-4 py-2 border rounded">
                Open
              </Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}