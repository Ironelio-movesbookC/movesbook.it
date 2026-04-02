'use client';

import AthleteMyPageRightSidebarExtras from '@/components/dashboard/AthleteMyPageRightSidebarExtras';

function MarqueeText({
  text,
  speedSeconds = 26,
}: {
  text: string;
  speedSeconds?: number;
}) {
  const scrollAmount = Math.max(1, Math.round(120 / speedSeconds));
  const Marquee = 'marquee' as any;
  return (
    <div className="overflow-hidden whitespace-nowrap">
      {/* eslint-disable-next-line jsx-a11y/no-distracting-elements */}
      <Marquee
        direction="left"
        behavior="scroll"
        scrollAmount={scrollAmount}
        className="block"
      >
        {text}
      </Marquee>
    </div>
  );
}

function ClubSocialBlocks() {
  return (
    <div className="mt-4">
      <div className="bg-gray-900 text-white px-3 py-2 text-[11px] font-bold tracking-wide flex items-center justify-between border-t border-gray-300">
        <span>RECENT POST</span>
        <button
          type="button"
          className="text-[10px] font-semibold text-gray-300 underline cursor-pointer"
        >
          Shared Clubs
        </button>
      </div>
      <div className="bg-white border-b border-gray-300">
        {[
          {
            title: 'Trail Running',
            date: '27.4.2010',
            body: "For all the runners who just love to run where there is no path...",
            meta: '1392 Members, 250549 Movers',
            thumb: 'IMG',
          },
          {
            title: 'Where is the limit',
            date: '18.5.2010',
            body: "We don't know where the limit is, but we know where it's not!!",
            meta: '1017 Members, 138718 Movers',
            thumb: 'IMG',
          },
          {
            title: 'Run for Japan',
            date: '18.3.2011',
            body: 'Now, if even, every Move counts with a death toll in the thousands...',
            meta: '90 Members, 24258 Movers',
            thumb: 'IMG',
          },
        ].map((p, idx) => (
          <div key={`${p.title}-${idx}`} className="border-b border-gray-300 px-3 py-3">
            <div className="flex gap-3">
              <div className="w-11 h-11 bg-gray-200 border border-gray-400 flex items-center justify-center text-[10px] text-gray-500 shrink-0">
                {p.thumb}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-red-600 text-[11px] font-semibold truncate">{p.title}</div>
                  <div className="text-[10px] text-gray-500 shrink-0">{p.date}</div>
                </div>
                <div className="text-[10px] text-gray-600 leading-snug mt-1">{p.body}</div>
                <div className="text-[10px] text-gray-500 mt-1">{p.meta}</div>
              </div>
            </div>
          </div>
        ))}
        <div className="px-3 py-2">
          <button type="button" className="text-[11px] font-semibold text-red-600">
            + More
          </button>
        </div>
      </div>

      <div className="bg-gray-900 text-white px-3 py-2 text-[11px] font-bold tracking-wide flex items-center justify-between mt-3 border-t border-gray-300">
        <span>RECOMMENDED PAGES</span>
        <button
          type="button"
          className="text-[10px] font-semibold text-gray-300 underline cursor-pointer"
        >
          See All
        </button>
      </div>
      <button
        type="button"
        className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2 px-3 text-xs font-semibold transition-colors border-b border-gray-300"
      >
        Filter option
      </button>
      <div className="bg-white border-b border-gray-300">
        {[
          {
            name: 'Correre',
            line1: 'Piace a Giusi Circi e ad altri 36 amici.',
            line2: 'Mi piace',
          },
          {
            name: 'Papa Benedetto XVI',
            line1: 'Piace a Chiara Di Palma',
            line2: 'Mi piace',
          },
          {
            name: 'Il Mattino',
            line1: 'Piace a Fabio Manzi e ad altri 27 amici.',
            line2: 'Mi piace',
          },
          {
            name: 'Luca senza sonno',
            line1: 'Piace a Luca Borsacchi.',
            line2: 'Mi piace',
          },
        ].map((p, idx) => (
          <div key={`${p.name}-${idx}`} className="border-b border-gray-300 px-3 py-3">
            <div className="flex gap-3">
              <div className="w-11 h-11 bg-gray-200 border border-gray-400 flex items-center justify-center text-[10px] text-gray-500 shrink-0">
                IMG
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold text-gray-800">{p.name}</div>
                <div className="text-[10px] text-gray-600 mt-0.5">{p.line1}</div>
                <div className="text-[10px] text-gray-600 mt-1 flex items-center gap-2">
                  <span className="inline-block w-3 h-3 bg-gray-300 border border-gray-400" />
                  <span>{p.line2}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-900 text-white px-3 py-2 text-[11px] font-bold tracking-wide flex items-center justify-between mt-3 border-t border-gray-300">
        <span>POPULAR CLUBS</span>
        <button
          type="button"
          className="text-[10px] font-semibold text-gray-300 underline cursor-pointer"
        >
          Others
        </button>
      </div>
      <div className="h-28 bg-white border-b border-gray-300" />
    </div>
  );
}

/**
 * Right column for athlete dashboard when "My Club" tab is selected.
 * Reused for CLUB accounts on /club/dashboard when My Club tab matches this layout.
 */
export default function AthleteMyClubRightSidebar() {
  return (
    <div className="flex flex-col">
      <div className="bg-gray-900 text-white px-3 py-2 text-xs font-bold tracking-wide border-b border-gray-300">
        SPONSORED
      </div>
      <div className="bg-gray-100 border-b border-gray-300">
        <div className="px-3 py-3">
          <div className="flex gap-3">
            <div className="w-12 h-12 bg-gray-200 border border-gray-400 flex items-center justify-center text-[10px] text-gray-500 shrink-0">
              IMG
            </div>
            <div className="text-[11px] text-gray-700 leading-snug">
              Lorem Ipsum has been the industry&apos;s standard dummy text of the printing and typesetting industry.
            </div>
          </div>
        </div>
        <div className="px-3 py-2 text-[11px] text-gray-700 leading-snug border-t border-gray-300">
          <MarqueeText text="Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum is simply dummy text of the printing and typesetting industry." />
        </div>
      </div>

      <div className="bg-gray-900 text-white px-3 py-2 text-xs font-bold tracking-wide border-b border-gray-300">
        EVENTS
      </div>

      <div className="bg-gray-100 border-b border-gray-300 px-2 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-2.5 py-1.5 text-[11px] font-semibold border border-gray-400 bg-gray-500 text-white"
          >
            Events
          </button>
          <button
            type="button"
            className="px-2.5 py-1.5 text-[11px] font-semibold border border-gray-300 bg-gray-200 text-gray-700"
          >
            Access Control
          </button>
          <button
            type="button"
            className="px-2.5 py-1.5 text-[11px] font-semibold border border-gray-300 bg-gray-200 text-gray-700"
          >
            Access List
          </button>
        </div>
      </div>

      <div className="bg-white">
        <div>
          {[
            'Today is the birthday of',
            "Events about club's member",
            'Events about this club',
            'Events about shared club',
          ].map((label) => (
            <div key={label} className="border-b border-gray-300">
              <div className="flex items-start justify-between px-3 py-4 min-h-16 text-[11px] text-gray-700">
                <span className="pt-0.5">{label}</span>
                <span className="text-[10px] text-gray-600 whitespace-nowrap">Month ▾</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AthleteMyPageRightSidebarExtras />
      <ClubSocialBlocks />
    </div>
  );
}
