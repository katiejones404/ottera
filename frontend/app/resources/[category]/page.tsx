import { notFound } from "next/navigation";
import ResourceCategoryPage from "../../components/ResourceCategoryPage";
import {
  ALLOWED_RESOURCE_SLUGS,
  RESOURCE_CATEGORY_META,
  type ResourceCategorySlug,
} from "../../lib/resourceMapping";

type PageProps = {
  params: Promise<{ category: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateStaticParams() {
  return ALLOWED_RESOURCE_SLUGS.map((slug) => ({
    category: slug,
  }));
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { category } = await params;
  const paramsObj = (await searchParams) || {};
  const rawZip = Array.isArray(paramsObj.zip) ? paramsObj.zip[0] : paramsObj.zip;
  const initialZip = (rawZip || "").replace(/\D/g, "").slice(0, 5);

  if (!ALLOWED_RESOURCE_SLUGS.includes(category as ResourceCategorySlug)) {
    notFound();
  }

  const selected = {
    ...RESOURCE_CATEGORY_META[category as ResourceCategorySlug],
    posts: [],
  };

  return <ResourceCategoryPage category={selected} initialZip={initialZip} />;
}
