import BannerForm from "../../SportBannerForm";

type EditPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditSportBannerPage({
  params,
}: EditPageProps) {
  const { id } = await params;

  /*
   * Replace this with your API/database request.
   *
   * Example:
   *
   * const banner = await getSportBanner(id);
   */

  const banner = {
    id,
    sport: "Athletic",
    image: "/images/banners/athletic-1.jpg",
  };

  return (
    <BannerForm
      mode="edit"
      initialSport={banner.sport}
      initialBanner={banner.image}
    />
  );
}