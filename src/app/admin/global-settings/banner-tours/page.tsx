"use client";

import { useEffect, useMemo, useState } from "react";

type Language = {
  code: string;
  name: string;
};

type BannerSettings = {
  openInternetPage: boolean;
  internetUrl: string;
  openInNewTab: boolean;
  carouselEnabled: boolean;
  delay: number;
  pictures: string[];
};

const languages: Language[] = [
  { code: "En", name: "En" },
  { code: "Fr", name: "Fr" },
  { code: "De", name: "De" },
  { code: "It", name: "It" },
  { code: "Es", name: "Es" },
  { code: "Por", name: "Por" },
  { code: "Rus", name: "Rus" },
  { code: "Ind", name: "Ind" },
  { code: "Chin", name: "Chin" },
  { code: "Arab", name: "Arab" },
];

const createDefaultSettings = (): BannerSettings => ({
  openInternetPage: true,
  internetUrl: "",
  openInNewTab: false,
  carouselEnabled: false,
  delay: 5,
  pictures: ["", "", "", "", ""],
});

const initialSettings: Record<string, BannerSettings> = {
  En: {
    openInternetPage: true,
    internetUrl:
      "http://192.168.1.44/sportsbook/admins/banner_tours/En/1",
    openInNewTab: false,
    carouselEnabled: false,
    delay: 5,
    pictures: [
      "/images/no_image.jpg",
      "/images/no-image.jpg",
      "",
      "",
      "",
    ],
  },

  Fr: createDefaultSettings(),
  De: createDefaultSettings(),
  It: createDefaultSettings(),
  Es: createDefaultSettings(),
  Por: createDefaultSettings(),
  Rus: createDefaultSettings(),
  Ind: createDefaultSettings(),
  Chin: createDefaultSettings(),
  Arab: createDefaultSettings(),
};

export default function BannerToursPage() {
  const [selectedLanguage, setSelectedLanguage] = useState("En");

  const [settings, setSettings] =
    useState<Record<string, BannerSettings>>(initialSettings);

  const currentSettings = settings[selectedLanguage];

  const [currentSlide, setCurrentSlide] = useState(0);

  const activePictures = useMemo(() => {
    return currentSettings.pictures.filter(
      (picture) => picture.trim().length > 0
    );
  }, [currentSettings.pictures]);

  useEffect(() => {
    setCurrentSlide(0);
  }, [selectedLanguage, activePictures.length]);

  useEffect(() => {
    if (
      !currentSettings.carouselEnabled ||
      activePictures.length <= 1
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setCurrentSlide((previous) => {
        return (previous + 1) % activePictures.length;
      });
    }, currentSettings.delay * 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [
    currentSettings.carouselEnabled,
    currentSettings.delay,
    activePictures.length,
  ]);

  const updateCurrentSettings = (
    changes: Partial<BannerSettings>
  ) => {
    setSettings((previous) => ({
      ...previous,
      [selectedLanguage]: {
        ...previous[selectedLanguage],
        ...changes,
      },
    }));
  };

  const updatePicture = (
    index: number,
    value: string
  ) => {
    const pictures = [...currentSettings.pictures];

    pictures[index] = value;

    updateCurrentSettings({
      pictures,
    });
  };

  const handleBannerClick = () => {
    if (
      currentSettings.openInternetPage &&
      currentSettings.internetUrl.trim()
    ) {
      if (currentSettings.openInNewTab) {
        window.open(
          currentSettings.internetUrl,
          "_blank",
          "noopener,noreferrer"
        );
      } else {
        window.location.href =
          currentSettings.internetUrl;
      }
    }
  };

  const selectLanguage = (language: string) => {
    setSelectedLanguage(language);
  };

  return (
    <main className="min-h-screen bg-white font-sans text-sm text-[#333]">
      {/* ======================================================= */}
      {/* PAGE TITLE                                               */}
      {/* ======================================================= */}

      <div className="h-7 bg-[#a40018] px-[14px] py-[5px] text-[13px] font-bold text-white">
        Options for{" "}
        <strong className="text-[#ffd34d]">
          'move yourself, track and share'
        </strong>{" "}
        banner
      </div>

      {/* ======================================================= */}
      {/* TOP BANNER PREVIEW                                       */}
      {/* ======================================================= */}

      <section className="flex min-h-[202px] border-b border-[#bbb] px-[14px] pb-1 pt-2 max-[900px]:flex-col">
        <div className="flex-1 overflow-hidden">
          <div className="h-[170px] w-[260px] overflow-hidden">
            {currentSettings.carouselEnabled &&
            activePictures.length > 0 ? (
              <img
                src={activePictures[currentSlide]}
                alt="Banner"
                className="h-full w-full object-cover"
              />
            ) : (
              <img/> 
            )}
          </div>
        </div>

        <div className="flex w-[340px] items-center justify-center max-[900px]:w-full max-[900px]:justify-start">
          <div
            onClick={handleBannerClick}
            role={
              currentSettings.openInternetPage
                ? "button"
                : undefined
            }
            tabIndex={
              currentSettings.openInternetPage
                ? 0
                : undefined
            }
            className="h-[102px] w-[320px] overflow-hidden rounded-[5px] bg-black"
          >
            <BannerHeader />

            <div className="relative h-[76px] bg-black">
              <img
                src="/assets/move-yourself.png"
                alt=""
                className="h-full w-full object-contain"
              />

              <ShareIcon />

              {currentSettings.carouselEnabled &&
                activePictures.length > 1 && (
                  <div className="absolute right-0 top-[13px] flex h-[55px] w-[55px] items-center justify-center bg-[#86a900] text-[32px] text-white">
                    ❯
                  </div>
                )}
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================= */}
      {/* ITEM SELECTED                                            */}
      {/* ======================================================= */}

      <section className="mx-[13px] mb-[7px] border border-[#c7c7c7]">
        <div className="px-2 py-[5px] text-xs">
          Item Selected
        </div>

        <div className="flex min-h-[104px] items-center px-2 pb-2 pt-1 max-[900px]:flex-wrap">
          <div className="h-[101px] w-[265px] shrink-0 overflow-hidden rounded-[4px] bg-black">
            <BannerHeader />

            <div className="relative h-[75px] bg-black">
              <img
                src="/assets/move-yourself.png"
                alt=""
                className="h-full w-full object-contain"
              />

              <ShareIcon />
            </div>
          </div>

          <div className="flex flex-1 items-center justify-center gap-[7px] text-[13px] max-[900px]:ml-5 max-[900px]:flex-wrap max-[900px]:justify-start">
            <span>open the internet address</span>

            <ToggleSwitch
              checked={
                currentSettings.openInternetPage
              }
              onChange={() =>
                updateCurrentSettings({
                  openInternetPage: true,
                  carouselEnabled: false,
                })
              }
            />

            <span>banner carousel</span>

            <ToggleSwitch
              checked={
                currentSettings.carouselEnabled
              }
              onChange={() =>
                updateCurrentSettings({
                  openInternetPage: false,
                  carouselEnabled: true,
                })
              }
            />
          </div>
        </div>
      </section>

      {/* ======================================================= */}
      {/* INTERNET ADDRESS                                         */}
      {/* ======================================================= */}

      <SectionTitle>
        Internet address
      </SectionTitle>

      <section className="mx-[13px] bg-[#dedede]">
        <h2 className="m-0 px-0 pb-[7px] pt-2 text-[20px] font-normal">
          languages
        </h2>

        <LanguageTabs
          languages={languages}
          selectedLanguage={selectedLanguage}
          onSelect={selectLanguage}
        />

        <div className="flex min-h-[55px] items-center gap-[25px] px-0 py-[10px] text-xs max-[900px]:flex-wrap">
          <span>
            Open this page for the language selected
          </span>

          <input
            type="text"
            value={currentSettings.internetUrl}
            disabled={
              !currentSettings.openInternetPage
            }
            onChange={(event) =>
              updateCurrentSettings({
                internetUrl: event.target.value,
              })
            }
            className="h-[26px] w-[455px] border border-[#c7c7c7] bg-white px-2 py-1 text-[#555] outline-none disabled:bg-[#e3e3e3] disabled:text-[#999] max-[900px]:w-full"
          />

          <button
            type="button"
            disabled={
              !currentSettings.openInternetPage
            }
            onClick={() =>
              updateCurrentSettings({
                openInNewTab:
                  !currentSettings.openInNewTab,
              })
            }
            className={`h-7 whitespace-nowrap border border-[#c7c7c7] px-3 ${
              currentSettings.openInNewTab
                ? "bg-[#d9ead3] text-[#333]"
                : "bg-[#eee] text-[#777]"
            } disabled:cursor-default disabled:opacity-70`}
          >
            {currentSettings.openInNewTab
              ? "Open in another page ✓"
              : "All screen in the another page"}
          </button>
        </div>
      </section>

      {/* ======================================================= */}
      {/* CAROUSEL OF PICTURES                                     */}
      {/* ======================================================= */}

      <SectionTitle>
        Carousel of pictures
      </SectionTitle>

      <section className="mx-[13px]">
        <h2 className="m-0 px-0 pb-[7px] pt-2 text-[20px] font-normal">
          languages
        </h2>

        <LanguageTabs
          languages={languages}
          selectedLanguage={selectedLanguage}
          onSelect={selectLanguage}
        />

        {/* Carousel settings */}

        <div className="mx-[65px] flex min-h-[55px] items-center gap-[14px] border-b border-[#ccc] py-[5px] max-[900px]:mx-[10px] max-[900px]:flex-wrap">
          <button
            type="button"
            onClick={() =>
              updateCurrentSettings({
                pictures: ["", "", "", "", ""],
              })
            }
            className="h-[34px] w-11 border-0 bg-[#444] text-white"
          >
            Delete
          </button>

          <span className="ml-[105px] whitespace-nowrap max-[900px]:ml-0">
            Language Selected
          </span>

          <span className="min-w-[37px] border border-[#e25555] bg-[#fff3bf] px-[9px] py-2 text-center">
            {selectedLanguage}
          </span>

          <span className="ml-auto whitespace-nowrap max-[900px]:ml-0">
            Carousel of pictures
          </span>

          <select
            value={activePictures.length}
            onChange={(event) => {
              const numberOfPictures =
                Number(event.target.value);

              const pictures = [
                ...currentSettings.pictures,
              ];

              while (
                pictures.length < numberOfPictures
              ) {
                pictures.push("");
              }

              while (
                pictures.length > numberOfPictures
              ) {
                pictures.pop();
              }

              while (pictures.length < 5) {
                pictures.push("");
              }

              updateCurrentSettings({
                pictures,
              });
            }}
            className="h-[26px] w-[225px] border border-[#ccc] bg-white px-1 outline-none"
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
            <option value={5}>5</option>
          </select>

          <span className="ml-[15px] whitespace-nowrap max-[900px]:ml-0">
            Delay
          </span>

          <select
            value={currentSettings.delay}
            onChange={(event) =>
              updateCurrentSettings({
                delay: Number(event.target.value),
              })
            }
            className="h-[26px] w-[70px] border border-[#ccc] bg-white px-1 outline-none"
          >
            {Array.from(
              { length: 26 },
              (_, index) => index + 5
            ).map((seconds) => (
              <option
                key={seconds}
                value={seconds}
              >
                {seconds}"
              </option>
            ))}
          </select>
        </div>

        {/* Pictures */}

        <div className="px-[7px] pb-[15px] pt-[7px]">
          {currentSettings.pictures
            .slice(0, 5)
            .map((picture, index) => {
              if (!picture.trim()) {
                return null;
              }

              return (
                <div
                  key={`${selectedLanguage}-${index}`}
                  className="mb-[10px] border border-[#d0d0d0]"
                >
                  <div className="h-7 bg-[#13929b] px-2 py-[7px] text-xs font-bold text-white">
                    {index + 1}th picture
                  </div>

                  <div className="relative min-h-[185px] overflow-hidden bg-white">
                    <img
                      src={picture}
                      alt={`Picture ${index + 1}`}
                      className="block h-[180px] w-full object-contain"
                      onError={(event) => {
                        event.currentTarget.style.display =
                          "none";
                      }}
                    />

                    <div className="absolute bottom-2 left-2 flex items-center gap-[9px]">
                      <input
                        type="checkbox"
                        aria-label={`Select picture ${
                          index + 1
                        }`}
                        className="h-[14px] w-[14px]"
                      />

                      <button
                        type="button"
                        onClick={() => {
                          const value =
                            window.prompt(
                              "Enter picture URL",
                              picture
                            );

                          if (value !== null) {
                            updatePicture(
                              index,
                              value
                            );
                          }
                        }}
                        className="border-0 bg-transparent text-[24px] text-[#f1a500]"
                      >
                        ✎
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updatePicture(index, "")
                        }
                        className="h-[18px] w-[18px] rounded-full border-0 bg-[#f05b4f] text-[14px] leading-[18px] text-white"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

          {activePictures.length === 0 && (
            <div className="border border-dashed border-[#bbb] p-[30px] text-center text-[#888]">
              No pictures configured.
            </div>
          )}
        </div>
      </section>

      {/* ======================================================= */}
      {/* SAVE                                                      */}
      {/* ======================================================= */}

      <div className="flex justify-end p-[15px]">
        <button
          type="button"
          onClick={() => {
            console.log(
              "Banner settings:",
              settings
            );
          }}
          className="h-[34px] min-w-20 border-0 bg-[#13929b] font-bold text-white hover:bg-[#107e86]"
        >
          Save
        </button>
      </div>
    </main>
  );
}

/* =============================================================== */
/* BANNER HEADER                                                    */
/* =============================================================== */

function BannerHeader() {
  return (
    <div className="flex h-[26px] items-center justify-around bg-[#13929b] px-2 text-xs text-white">
      <span>Move yourself....</span>
      <span>Track....</span>
      <span>Share</span>
    </div>
  );
}

/* =============================================================== */
/* SHARE ICON                                                       */
/* =============================================================== */

function ShareIcon() {
  return (
    <div className="absolute right-[65px] top-[25px] flex h-8 w-8 items-center justify-center rounded-[6px] bg-[#10939d] text-[23px] font-bold text-black">
      ↗
    </div>
  );
}

/* =============================================================== */
/* SECTION TITLE                                                    */
/* =============================================================== */

function SectionTitle({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-[13px] h-7 bg-[#333] px-[9px] py-[6px] text-[13px] font-bold text-white">
      {children}
    </div>
  );
}

/* =============================================================== */
/* TOGGLE SWITCH                                                    */
/* =============================================================== */

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="relative h-6 w-[49px] rounded-full border border-[#aaa] bg-white"
    >
      <span
        className={`absolute top-[4px] h-[14px] w-[14px] rounded-full transition-all ${
          checked
            ? "left-[28px] bg-[#148cc1]"
            : "left-[4px] bg-[#ddd]"
        }`}
      />
    </button>
  );
}

/* =============================================================== */
/* LANGUAGE TABS                                                    */
/* =============================================================== */

function LanguageTabs({
  languages,
  selectedLanguage,
  onSelect,
}: {
  languages: Language[];
  selectedLanguage: string;
  onSelect: (language: string) => void;
}) {
  return (
    <div className="flex h-[40px] items-center gap-[14px] border-b border-[#999]">
      {languages.map((language) => {
        const isSelected =
          selectedLanguage === language.code;

        return (
          <button
            key={language.code}
            type="button"
            onClick={() => onSelect(language.code)}
            className={`h-[25px] min-w-[38px] px-[5px] text-center text-[14px] font-normal leading-[23px] ${
              isSelected
                ? "border border-[#e25555] bg-[#f5f5f5] text-[#333]"
                : "border border-transparent bg-transparent text-[#555]"
            }`}
          >
            {language.name}
          </button>
        );
      })}
    </div>
  );
}