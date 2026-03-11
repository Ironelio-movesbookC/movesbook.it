'use client';

import { useParams } from 'next/navigation';
import Image from 'next/image';
import { useState } from 'react';
import { User, Edit } from 'lucide-react';

// Mock data matching PHP reference (movesbook.net/subscriptionuserlists/historyuser/550_0)
const MOCK_USER = {
  username: 'magiw',
  fullname: 'Ironelio Buonocore',
  country: 'Finland Turku',
  cityClubTeam: 'Mercogliano',
  mapCoordinates: '40.92106184555415, 14.741786005972761',
  typeOfUser: 'Club',
  version: 'Club Premium',
  startSubscription: '14th Aug 2018',
  endSubscription: '31st Dec 2026',
  logs: 300,
  imageUrl: null as string | null,
};

export default function HistoryUserPage() {
  const params = useParams();
  const id = params?.id as string; // e.g. "550_0"

  const [user] = useState(MOCK_USER);
  const [alertLang, setAlertLang] = useState<'IT' | 'EN'>('EN');
  const [enableFrom, setEnableFrom] = useState('2024-08-22');
  const [enableTo, setEnableTo] = useState('2025-11-30');
  const [readOn, setReadOn] = useState('13th November 2025');
  const [showAtLogin, setShowAtLogin] = useState(true);
  const [showAtLogout, setShowAtLogout] = useState(true);
  const [messageTitle, setMessageTitle] = useState('MAGIW CLUB 13 October 2025 - login & logout - reloaded');
  const [messageHeadline, setMessageHeadline] = useState('Garmin Index Smart Scale support');
  const [messageSubhead, setMessageSubhead] = useState('Data from the Garmin Smart Scale is now auto-synced to SportTracks');

  return (
    <div className="min-h-full bg-gray-100">
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        <h1 className="text-xl font-semibold text-gray-800">Panel control about the User</h1>
        {/* User Details - Details of magiw */}
        <section className="bg-gray-200 rounded-lg border border-gray-300 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-3">Details of {user.username}</h2>
          <div className="flex flex-wrap items-start gap-4 mb-4">
            <div className="w-24 h-24 rounded overflow-hidden bg-gray-300 flex items-center justify-center border border-gray-400 flex-shrink-0">
              {user.imageUrl ? (
                <Image src={user.imageUrl} alt={user.username} width={96} height={96} className="object-cover w-full h-full" />
              ) : (
                <User className="w-12 h-12 text-gray-500" />
              )}
            </div>
            <div className="flex-1 flex flex-wrap items-center gap-3">
              <span className="font-bold text-gray-900">{user.username}</span>
              <button type="button" className="px-4 py-2 bg-[#4f4f4f] hover:bg-[#3d3d3d] text-white text-sm rounded">
                Admin&apos;s setting
              </button>
              <button type="button" className="px-4 py-2 bg-[#4f4f4f] hover:bg-[#3d3d3d] text-white text-sm rounded">
                Open user profile
              </button>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-[180px_1fr] sm:items-center text-sm">
            <span className="text-gray-600">Fullname</span>
            <span className="text-gray-900">{user.fullname}</span>
            <span className="text-gray-600">Country of the owner</span>
            <span className="text-gray-900">{user.country}</span>
            <span className="text-gray-600">City of the club/team</span>
            <span className="text-gray-900">
              {user.cityClubTeam}
              <button type="button" className="ml-2 text-blue-600 hover:underline flex items-center gap-1">
                <Edit className="w-3 h-3" /> Edit
              </button>
            </span>
            <span className="text-gray-600">Map coordinates</span>
            <span className="text-gray-900 font-mono text-xs">
              {user.mapCoordinates}
              <button type="button" className="ml-2 text-blue-600 hover:underline flex items-center gap-1">
                <Edit className="w-3 h-3" /> Edit
              </button>
            </span>
            <span className="text-gray-600">Type of user</span>
            <span className="text-gray-900">{user.typeOfUser}</span>
            <span className="text-gray-600">Version</span>
            <span className="text-gray-900">{user.version}</span>
            <span className="text-gray-600">Start Subscription</span>
            <span className="text-gray-900">{user.startSubscription}</span>
            <span className="text-gray-600">End Subscription</span>
            <span className="text-gray-900">
              {user.endSubscription}
              <button type="button" className="ml-2 text-blue-600 hover:underline flex items-center gap-1">
                <Edit className="w-3 h-3" /> Edit
              </button>
            </span>
            <span className="text-gray-600">Logs</span>
            <span className="text-gray-900">{user.logs}</span>
          </div>
        </section>

        {/* Alert box to display to the user */}
        <section className="rounded-lg border border-gray-300 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-blue-600 text-white">
            <span className="font-semibold text-sm">Alert box to display to the user</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setAlertLang('IT')}
                className={`px-2 py-1 text-xs rounded ${alertLang === 'IT' ? 'bg-white text-blue-600' : 'bg-blue-500 text-white'}`}
              >
                IT
              </button>
              <button
                type="button"
                onClick={() => setAlertLang('EN')}
                className={`px-2 py-1 text-xs rounded ${alertLang === 'EN' ? 'bg-white text-blue-600' : 'bg-blue-500 text-white'}`}
              >
                EN
              </button>
            </div>
          </div>
          <div className="bg-gray-200 p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-gray-700 text-sm">Enable From</span>
              <input
                type="text"
                value={enableFrom}
                onChange={(e) => setEnableFrom(e.target.value)}
                className="px-3 py-1.5 border border-gray-400 rounded bg-white text-sm w-32"
              />
              <span className="text-gray-700 text-sm">To</span>
              <input
                type="text"
                value={enableTo}
                onChange={(e) => setEnableTo(e.target.value)}
                className="px-3 py-1.5 border border-gray-400 rounded bg-white text-sm w-32"
              />
              <span className="text-gray-600 text-sm">Read on {readOn}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-700 text-sm">Show the message at the</span>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={showAtLogin} onChange={(e) => setShowAtLogin(e.target.checked)} className="rounded border-gray-400" />
                Login
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={showAtLogout} onChange={(e) => setShowAtLogout(e.target.checked)} className="rounded border-gray-400" />
                Logout
              </label>
            </div>
          </div>
        </section>

        {/* Message to read */}
        <section className="bg-gray-200 rounded-lg border border-gray-300 p-6">
          <p className="text-red-600 font-bold text-lg mb-2">{messageTitle}</p>
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Message to read</h3>
          <h4 className="font-semibold text-gray-900 mb-1">{messageHeadline}</h4>
          <p className="text-sm text-gray-700 mb-3">{messageSubhead}</p>
          <p className="text-sm text-gray-600 leading-relaxed">
            This integration will work as soon as you enable auto-sync with Garmin. Your entire smart scale history from Garmin Connect will be imported.
            Data from the Garmin Smart Scale is now auto-synced to SportTracks. Weight and body fat percentage are sent to SportTracks. Historical data
            is transferred and more fitness data is collected with Wi-Fi connectivity.
          </p>
          <p className="text-sm font-medium text-gray-800 mt-3">How to get it running</p>
          <p className="text-sm text-gray-600 mt-1">New SportTracks users: This integration will work as soon as you enable auto-sync with Garmin.</p>
        </section>
      </div>
    </div>
  );
}
