import ResourcesClient from "./resources-client";

type ResourcesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ResourcesPage({ searchParams }: ResourcesPageProps) {
  const params = (await searchParams) || {};
  const rawZip = Array.isArray(params.zip) ? params.zip[0] : params.zip;
  const initialZip = (rawZip || "").replace(/\D/g, "").slice(0, 5);

  return <ResourcesClient initialZip={initialZip} />;
}
