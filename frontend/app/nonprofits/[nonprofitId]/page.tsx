import NonprofitProfilePage from "../../components/NonprofitProfilePage";

type PageProps = {
  params: Promise<{ nonprofitId: string }>;
};

export default async function NonprofitPage({ params }: PageProps) {
  const { nonprofitId } = await params;
  return <NonprofitProfilePage nonprofitId={nonprofitId} />;
}
