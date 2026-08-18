"use client";

import Link from "next/link";
import { useState } from "react";

type SponsorBanner = {
  id: number;
  sponsor: string;
  banner: string;
};

const sponsorBanners: SponsorBanner[] = [
  {
    id: 1,
    sponsor: "Garmin2",
    banner: "/images/advanced.jpg",
  },
  {
    id: 2,
    sponsor: "Polar",
    banner: "/images/swimming.png",
  },
  {
    id: 3,
    sponsor: "Imperial",
    banner: "/images/banners/athletic-3.jpg",
  },
];

export default function BannerToursPage() {
  const [delay, setDelay] = useState("15");
  const [pageSize, setPageSize] = useState("5");
  const [selected, setSelected] = useState<number[]>([]);

  const toggleSelected = (id: number) => {
    setSelected((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
    );
  };

  const deleteBanner = (id: number) => {
    console.log("Delete banner:", id);
  };

  return (
    <main className="min-h-screen bg-white px-[33px] py-[15px] font-sans text-[14px] text-[#333]">
      {/* ===================================================== */}
      {/* TOP SETTINGS                                          */}
      {/* ===================================================== */}

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-[70px]">
          <label className="font-bold">
            Time delay among the banners
          </label>

          <select
            value={delay}
            onChange={(event) =>
              setDelay(event.target.value)
            }
            className="h-[28px] w-[100px] border border-[#c7c7c7] bg-white px-2 text-[14px] outline-none"
          >
            {[5, 10, 15, 20, 25, 30].map(
              (seconds) => (
                <option
                  key={seconds}
                  value={seconds}
                >
                  {seconds} "
                </option>
              )
            )}
          </select>
        </div>

        <Link
          href="/admin/global-settings/sponsor-settings/new"
          className="bg-gradient-to-b from-[#666] to-[#333] px-[10px] py-[8px] text-[12px] font-bold text-white hover:from-[#555] hover:to-[#222]"
        >
          New Sponsor Banner
        </Link>
      </div>

      {/* ===================================================== */}
      {/* PAGINATION                                             */}
      {/* ===================================================== */}

      <div className="mt-[25px] flex items-center gap-[5px]">
        <select
          value={pageSize}
          onChange={(event) =>
            setPageSize(event.target.value)
          }
          className="h-[25px] w-[50px] border border-[#aaa] bg-white px-[5px] outline-none"
        >
          <option value="5">5</option>
          <option value="10">10</option>
          <option value="15">15</option>
          <option value="20">20</option>
        </select>

        <button
          type="button"
          className="h-[25px] border border-[#aaa] bg-[#555] px-[8px] text-[12px] text-white"
        >
          Prev
        </button>

        {[1, 2, 3, 4, 5].map((page) => (
          <button
            key={page}
            type="button"
            className={`h-[25px] min-w-[25px] border border-[#bbb] px-[6px] text-[12px] ${
              page === 1
                ? "bg-[#555] text-white"
                : "bg-[#f5f5f5] text-[#333]"
            }`}
          >
            {page}
          </button>
        ))}

        <span className="px-[3px]">...</span>

        <button
          type="button"
          className="h-[25px] min-w-[32px] border border-[#bbb] bg-[#f5f5f5] px-[6px] text-[12px]"
        >
          15
        </button>

        <button
          type="button"
          className="h-[25px] min-w-[32px] border border-[#bbb] bg-[#f5f5f5] px-[6px] text-[12px]"
        >
          16
        </button>

        <button
          type="button"
          className="h-[25px] border border-[#bbb] bg-[#f5f5f5] px-[8px] text-[12px]"
        >
          Next
        </button>
      </div>

      {/* ===================================================== */}
      {/* LIST HEADER                                            */}
      {/* ===================================================== */}

      <div className="mt-[22px] overflow-hidden rounded-t-[8px] bg-gradient-to-b from-[#ddd] to-[#bbb] px-0 pt-[1px]">
        <div className="inline-block bg-[#333] px-[12px] py-[8px] text-[13px] font-bold text-white">
          Sponsors banner List
        </div>
      </div>

      {/* ===================================================== */}
      {/* TABLE                                                  */}
      {/* ===================================================== */}

      <div className="mt-[10px] overflow-x-auto">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="bg-[#13929b] text-left text-white">
              <th className="w-[72px] border-r border-white px-[9px] py-[9px]">
                &nbsp;
              </th>

              <th className="w-[370px] border-r border-white px-[9px] py-[9px]">
                Sponsors Name
              </th>

              <th className="border-r border-white px-[9px] py-[9px]">
                Banner
              </th>

              <th className="w-[296px] px-[9px] py-[9px]">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {sponsorBanners.map((item) => (
              <tr
                key={item.id}
                className="h-[94px] border-b border-[#ccc]"
              >
                {/* Checkbox */}

                <td className="border-r border-[#ccc] px-[9px] align-top pt-[13px] text-center">
                  <input
                    type="checkbox"
                    checked={selected.includes(
                      item.id
                    )}
                    onChange={() =>
                      toggleSelected(item.id)
                    }
                    className="h-[13px] w-[13px]"
                  />
                </td>

                {/* Sponsor */}

                <td className="border-r border-[#ccc] px-[9px] align-top pt-[11px] text-[16px] text-[#164b75]">
                  {item.sponsor}
                </td>

                {/* Banner */}

                <td className="border-r border-[#ccc] px-[9px] py-[7px] align-top">
                  <img
                    src={item.banner}
                    alt={item.sponsor}
                    className="h-[70px] w-[150px] object-cover"
                  />
                </td>

                {/* Actions */}

                <td className="px-[110px] align-top pt-[10px]">
                  <div className="flex items-center gap-[22px]">
                    <Link
                      href={`/admin/global-settings/sponsor-settings/${item.id}/edit`}
                      aria-label={`Edit ${item.sponsor}`}
                      className="text-[24px] leading-none"
                    >
                      ✎
                    </Link>

                    <button
                      type="button"
                      aria-label={`Delete ${item.sponsor}`}
                      onClick={() =>
                        deleteBanner(item.id)
                      }
                      className="text-[20px] leading-none"
                    >
                      🔴
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}