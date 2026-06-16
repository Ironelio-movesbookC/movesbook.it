'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type AdminProfile = {
  username?: string;
  name?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
};

function readAdminProfile(): AdminProfile {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem('adminUser');
    if (!raw) return {};
    return JSON.parse(raw) as AdminProfile;
  } catch {
    return {};
  }
}

function displayName(profile: AdminProfile): string {
  const first = profile.firstName?.trim() || profile.name?.split(' ')[0]?.trim() || profile.username?.trim() || 'Admin';
  const last =
    profile.lastName?.trim() ||
    profile.name?.split(' ').slice(1).join(' ').trim() ||
    profile.email?.split('@')[0]?.trim() ||
    '';
  return last ? `${first} ${last}` : first;
}

export default function SendInviteLegacyHeader() {
  const [profile, setProfile] = useState<AdminProfile>({});

  useEffect(() => {
    setProfile(readAdminProfile());
  }, []);

  return (
    <header className="header-fixed">
      <div className="header-content">
        <div className="logo">
          <Link href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/logo.png" width={335} height={86} alt="Movesbook" />
          </Link>
        </div>
        <div id="top_right">
          <div style={{ marginTop: 9 }}>
            <div className="top_link">
              <a href="#">Support</a>
              <a href="#">Forum</a>
            </div>
          </div>
          <div className="clear" />
          <div className="header_row2">
            <div className="searchbox">
              <div className="searchbox_title">Search in</div>
              <div className="select_img_reg">
                <select id="typeID" defaultValue="8" aria-label="Search type">
                  <option value="5">Single User</option>
                  <option value="6">Coach</option>
                  <option value="7">Team</option>
                  <option value="8">Club</option>
                </select>
              </div>
              <div className="search_input">
                <input type="text" size={40} className="search" id="searchbox" placeholder="Search by name" readOnly />
                <a className="a-search" href="#" style={{ marginRight: -25 }} aria-label="Search">
                  <i className="fa fa-search" aria-hidden="true" />
                </a>
              </div>
            </div>

            <div id="profile_row">
              <div className="photo">
                <div className="photo_thumb">
                  <Link href="#">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/img/profile_images/default.png" width={53} height={53} alt="" />
                  </Link>
                </div>
              </div>
              <div className="content">
                {displayName(profile)}
                <br />
                Last login&nbsp;
                <br />
                <span className="orange">&nbsp;</span>
              </div>
              <div className="right">
                <Link href="#">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/img/privacy_setting.png" width={28} height={28} alt="" />
                </Link>
                <Link href="#" id="click_logout">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/img/setting.png" width={28} height={28} alt="" />
                </Link>
                <Link href="#" id="menu_log">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/img/pannel_drop_arrow.png" width={28} height={28} alt="" id="menu_log" />
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div className="clear" />
      </div>
    </header>
  );
}
