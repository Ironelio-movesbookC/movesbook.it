'use client';

import { Twitter, Facebook } from 'lucide-react';

/**
 * Lower blocks under Quick Actions on the athlete dashboard (My Page tab).
 * Reused for CLUB accounts on /club/dashboard when My Page is selected to match that layout.
 */
export default function AthleteMyPageRightSidebarExtras() {
  return (
    <div className="mt-4">
      <div className="bg-gray-900 text-white px-3 py-2 text-xs font-bold tracking-wide">
        NEXT EVENTS
      </div>

      <div className="bg-gray-200 text-red-600 px-3 py-2 text-xs border-b border-gray-300">
        Events of my sports
      </div>
      <div className="h-20 bg-white border-b border-gray-300" />

      <div className="bg-gray-200 text-red-600 px-3 py-2 text-xs border-b border-gray-300">
        My friends events
      </div>
      <div className="h-20 bg-white border-b border-gray-300" />

      <div className="bg-gray-200 text-red-600 px-3 py-2 text-xs border-b border-gray-300">
        Event of other sport
      </div>
      <div className="h-28 bg-white border-b border-gray-300" />

      <div className="bg-gray-900 text-white px-3 py-2 text-xs font-bold tracking-wide mt-4">
        NEWS BY MY FRIENDS
      </div>
      <div className="h-44 bg-white border-b border-gray-300" />

      <button
        type="button"
        className="w-full bg-white text-left px-3 py-1.5 text-[11px] font-semibold text-red-600 border-b border-gray-300"
      >
        + More
      </button>
      <div className="bg-gray-900 text-white px-3 py-2 text-xs font-bold tracking-wide mt-4">
        NEWEST MEMBERS
      </div>
      <button
        type="button"
        className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2 px-3 text-xs font-semibold transition-colors border-b border-gray-300"
      >
        Filter option
      </button>
      <div className="h-44 bg-white border-b border-gray-300" />

      <div className="bg-gray-900 text-white px-3 py-2 text-xs font-bold tracking-wide mt-4">
        MEMBERS LAST LOGGED IN
      </div>
      <button
        type="button"
        className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2 px-3 text-xs font-semibold transition-colors border-b border-gray-300"
      >
        Filter option
      </button>
      <div className="h-44 bg-white border-b border-gray-300" />

      <div className="bg-gray-900 text-white px-3 py-2 text-xs font-bold tracking-wide mt-4">
        BUTTON FOR YOUR WEBSITE
      </div>
      <div className="bg-white border-b border-gray-300 px-3 py-4 text-center">
        <div className="text-xs text-gray-700">
          Promote this on your site just
          <br />
          click the button
        </div>
        <div className="mt-4 text-[10px] font-bold text-gray-700 tracking-wide">
          FOLLOW MY MOVES AT
        </div>
        <button
          type="button"
          className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white py-2 text-xs font-bold transition-colors"
        >
          MOVESBOOK
        </button>
      </div>

      <div className="bg-gray-900 text-white px-3 py-2 text-xs font-bold tracking-wide mt-4">
        SHARE THIS PAGE
      </div>
      <div className="bg-white border-b border-gray-300 px-3 py-4">
        <div className="flex items-center justify-center gap-3 w-full">
          <button
            type="button"
            className="inline-flex items-center justify-center h-7 px-4 rounded-full bg-black text-white text-[11px] font-semibold"
          >
            <Twitter className="w-3.5 h-3.5 mr-1.5" />
            Post
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center h-7 px-4 rounded bg-blue-600 text-white text-[11px] font-semibold"
          >
            <Facebook className="w-3.5 h-3.5 mr-1.5" />
            Share
          </button>
        </div>
      </div>
    </div>
  );
}
