'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import SendInviteClubAddpostBar from '@/components/promocodes/SendInviteClubAddpostBar';
import SendInviteLegacyHeader from '@/components/promocodes/SendInviteLegacyHeader';
import './send-invite-club.css';

type SendInviteClubChromeProps = {
  children: React.ReactNode;
};

function readAdminDisplayName(): string {
  if (typeof window === 'undefined') return 'Club';
  try {
    const raw = localStorage.getItem('adminUser');
    if (!raw) return 'Club';
    const parsed = JSON.parse(raw) as { username?: string; name?: string; email?: string };
    const name = parsed.username?.trim() || parsed.name?.trim() || parsed.email?.split('@')[0]?.trim();
    const label = name ? name.charAt(0).toUpperCase() + name.slice(1) : 'Club';
    return `${label} Club`;
  } catch {
    return 'Club';
  }
}

export default function SendInviteClubChrome({ children }: SendInviteClubChromeProps) {
  const [clubLabel, setClubLabel] = useState('Club');

  useEffect(() => {
    setClubLabel(readAdminDisplayName());
  }, []);

  useEffect(() => {
    document.body.classList.add('send-invite-popup-active');
    document.documentElement.classList.add('send-invite-popup-active');
    return () => {
      document.body.classList.remove('send-invite-popup-active');
      document.documentElement.classList.remove('send-invite-popup-active');
    };
  }, []);

  return (
    <div className="send-invite-club-page bodyStyleClass">
      <SendInviteLegacyHeader />

      <div id="main" className="main-pad-top">
        <div id="content">
          <div className="content-pad">
            <div className="sprtbook_banner">
              <div id="timelineBackground">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/img/user-experience.jpg" className="bgImage" alt="" />
              </div>
              <div
                className="upload_newuserbanner"
                style={{ background: "url('/img/timeline_shade.png')" }}
                id="timelineShade"
              >
                <a href="#" aria-label="Change cover picture">
                  <i className="fa fa-camera" aria-hidden="true" />
                </a>
              </div>
              <div className="newimage_block">
                <Link href="#">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/img/logo/no_image.jpg" width={170} height={127} alt="" />
                </Link>
              </div>
              <div className="upload_newimage">
                <a href="#" style={{ color: '#FFFFFF', fontSize: 9 }} title="">
                  <i className="fa fa-camera" aria-hidden="true" />
                </a>
              </div>
              <div className="upgrade_info">
                <a href="#">Upgrade Informations</a>
                <a href="#">Logger of activities</a>
              </div>
              <div className="username_banner">{clubLabel}</div>
            </div>
          </div>

          <div className="send-invite-columns-band">
            <div id="content_wrap">
              <div id="col_left" aria-hidden="true" />
              <div id="col_middle">
                <SendInviteClubAddpostBar />
                {children}
                <div className="clear middle_block_pad" />
              </div>
              <div id="col_right" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
