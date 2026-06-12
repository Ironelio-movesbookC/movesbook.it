'use client';

/** Minimal welcome bar for send-invite popup (column toggle menus only). */
export default function SendInviteClubAddpostBar() {
  return (
    <div id="welcome_bar" className="welbar">
      <div className="left_new">
        <a href="#" className="menubark" id="leftMenuClick" aria-label="Toggle left column">
          <i className="fa fa-bars" aria-hidden="true" />
        </a>
      </div>
      <div className="right_new">
        <a href="#" className="menubark" id="rightMenuClick" aria-label="Toggle right column">
          <i className="fa fa-bars" aria-hidden="true" />
        </a>
      </div>
      <div className="clear" />
    </div>
  );
}
