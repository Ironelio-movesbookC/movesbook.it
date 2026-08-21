"use client";

import Link from "next/link";
import { ChangeEvent, useState } from "react";

type BannerFormProps = {
  mode: "create" | "edit";
  initialSport?: string;
  initialBanner?: string;
};

const sports = [
  "Athletic",
  "American football",
  "Basketball",
  "Baseball",
  "Football",
  "Tennis",
];

export default function BannerForm({
  mode,
  initialSport = "",
  initialBanner = "",
}: BannerFormProps) {
  const [sport, setSport] = useState(initialSport);
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
    if (!sport) {
      setError("Please select a sport.");
      return;
    }

    if (!banner && !initialBanner) {
      setError("Please select a banner.");
      return;
    }

    const formData = new FormData();

    formData.append("sport", sport);

    if (banner) {
      formData.append("banner", banner);
    }

    console.log(
      mode === "create"
        ? "Create sport banner"
        : "Update sport banner",
      {
        sport,
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
            ? "New Sport Banner"
            : "Edit Sport Banner"}
        </h1>
      </div>

      {/* =================================================== */}
      {/* FORM                                                 */}
      {/* =================================================== */}

      <div className="w-[700px] border border-[#ccc]">
        {/* Sport */}

        <div className="flex min-h-[60px] items-center border-b border-[#ddd]">
          <label className="w-[180px] bg-[#eee] px-[12px] py-[20px] font-bold">
            Sports Name
          </label>

          <div className="px-[15px]">
            <select
              value={sport}
              onChange={(event) =>
                setSport(event.target.value)
              }
              className="h-[32px] w-[300px] border border-[#aaa] bg-white px-[8px] outline-none"
            >
              <option value="">
                Select sport
              </option>

              {sports.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Banner */}

        <div className="flex min-h-[120px] border-b border-[#ddd]">
          <label className="w-[180px] shrink-0 bg-[#eee] px-[12px] py-[20px] font-bold">
            Banner
          </label>

          <div className="flex flex-1 flex-col gap-[12px] px-[15px] py-[15px]">
            <input
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

        {/* Error */}

        {error && (
          <div className="border-b border-[#ddd] bg-[#fff0f0] px-[15px] py-[10px] text-[#c00]">
            {error}
          </div>
        )}

        {/* Buttons */}

        <div className="flex justify-end gap-[8px] bg-[#f5f5f5] px-[15px] py-[12px]">
          <Link
            href="/admin/global-settings/sport-banners"
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