import { notFound } from "next/navigation";
import ResourceCategoryPage from "../../components/ResourceCategoryPage";
import {
  RESOURCE_CATEGORIES,
  getResourceCategoryBySlug,
} from "../../data/resources";

type PageProps = {
  params: Promise<{ category: string }>;
};

export async function generateStaticParams() {
  return RESOURCE_CATEGORIES.map((category) => ({
    category: category.slug,
  }));
}

export default async function CategoryPage({ params }: PageProps) {
  const { category } = await params;
  const selected = getResourceCategoryBySlug(category);

  if (!selected) {
    notFound();
  }

  return <ResourceCategoryPage category={selected} />;
}
