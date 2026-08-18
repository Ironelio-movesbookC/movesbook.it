"use client";

import Link from "next/link";
import { ChangeEvent, useState } from "react";

type BannerFormProps = {
  mode: "create" | "edit";
  initialSponsor?: string;
  initialBanner?: string;
};

export default function BannerForm({
  mode,
  initialSponsor = "",
  initialBanner = "",
}: BannerFormProps) {
  const [sponsor, setSponsor] =
    useState(initialSponsor);

  const [banner, setBanner] =
    useState<File | null>(null);

  const [preview, setPreview] =
    useState(initialBanner);

  const [error, setError] = useState("");

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setBanner(file);
    setError("");

    const imageUrl = URL.createObjectURL(file);
    setPreview(imageUrl);
  };

  const handleSubmit = () => {
    if (!sponsor.trim()) {
      setError("Please enter a sponsor name.");
      return;
    }

    if (!banner && !initialBanner) {
      setError("Please select a banner.");
      return;
    }

    const formData = new FormData();

    formData.append("sponsor", sponsor.trim());

    if (banner) {
      formData.append("banner", banner);
    }

    console.log(
      mode === "create"
        ? "Create sponsor banner"
        : "Update sponsor banner",
      {
        sponsor: sponsor.trim(),
        banner,
        formData,
      }
    );
  };

  return (
    <main className="min-h-screen bg-white px-[33px] py-[20px] font-sans text-[14px] text-[#333]">
      {/* =================================================== */}
      {/* PAGE TITLE                                           */}
      {/* =================================================== */}

      <div className="mb-[20px] border-b border-[#aaa] pb-[8px]">
        <h1 className="text-[18px] font-bold">
          {mode === "create"
            ? "New Sponsor Banner"
            : "Edit Sponsor Banner"}
        </h1>
      </div>

      {/* =================================================== */}
      {/* FORM                                                 */}
      {/* =================================================== */}

      <div className="w-[700px] border border-[#ccc]">
        {/* ================================================= */}
        {/* SPONSOR NAME                                      */}
        {/* ================================================= */}

        <div className="flex min-h-[60px] items-center border-b border-[#ddd]">
          <label
            htmlFor="sponsor"
            className="w-[180px] shrink-0 bg-[#eee] px-[12px] py-[20px] font-bold"
          >
            Name
          </label>

          <div className="px-[15px]">
            <input
              id="sponsor"
              type="text"
              value={sponsor}
              onChange={(event) => {
                setSponsor(event.target.value);
                setError("");
              }}
              placeholder="Enter sponsor name"
              className="h-[32px] w-[300px] border border-[#aaa] bg-white px-[8px] text-[14px] outline-none focus:border-[#666]"
            />
          </div>
        </div>

        {/* ================================================= */}
        {/* BANNER                                             */}
        {/* ================================================= */}

        <div className="flex min-h-[120px] border-b border-[#ddd]">
          <label
            htmlFor="banner"
            className="w-[180px] shrink-0 bg-[#eee] px-[12px] py-[20px] font-bold"
          >
            Banner
          </label>

          <div className="flex flex-1 flex-col gap-[12px] px-[15px] py-[15px]">
            <input
              id="banner"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="block h-[34px] w-full border border-[#aaa] bg-white text-[13px] file:mr-[10px] file:h-[32px] file:border-0 file:border-r file:border-[#aaa] file:bg-[#eee] file:px-[10px] file:text-[13px]"
            />

            {/* Current / selected image */}

            {preview && (
              <div className="border border-[#ccc] bg-[#fafafa] p-[8px]">
                <img
                  src={preview}
                  alt="Banner preview"
                  className="h-[100px] w-[220px] object-cover"
                />
              </div>
            )}
          </div>
        </div>

        {/* ================================================= */}
        {/* ERROR                                              */}
        {/* ================================================= */}

        {error && (
          <div className="border-b border-[#ddd] bg-[#fff0f0] px-[15px] py-[10px] text-[#c00]">
            {error}
          </div>
        )}

        {/* ================================================= */}
        {/* BUTTONS                                            */}
        {/* ================================================= */}

        <div className="flex justify-end gap-[8px] bg-[#f5f5f5] px-[15px] py-[12px]">
          <Link
            href="/admin/global-settings/sponsor-settings"
            className="border border-[#aaa] bg-[#eee] px-[18px] py-[8px] text-[13px] text-[#333]"
          >
            Cancel
          </Link>

          <button
            type="button"
            onClick={handleSubmit}
            className="bg-gradient-to-b from-[#666] to-[#333] px-[20px] py-[8px] text-[13px] font-bold text-white"
          >
            Upload
          </button>
        </div>
      </div>
    </main>
  );
}