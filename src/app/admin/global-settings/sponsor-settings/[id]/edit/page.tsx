import BannerForm from "../../SponsorBannerForm";

type EditPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditSponsorBannerPage({
  params,
}: EditPageProps) {
  const { id } = await params;

  const banner = {
    id,
    sponsor: "Garmin2",
    image: "/images/banners/athletic-1.jpg",
  };

  return (
    <BannerForm
      mode="edit"
      initialSponsor={banner.sponsor}
      initialBanner={banner.image}
    />
  );
}