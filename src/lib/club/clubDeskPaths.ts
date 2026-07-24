/** Club Desk list (read) — admin utility paths for the selected club. */
export function clubDeskListUrl(clubId: string): string {
  return `/users/club_desk_list?clubId=${encodeURIComponent(clubId)}`;
}

/** Club Desk settings (admin) — manage the club desk tree. */
export function clubDeskSettingsUrl(clubId: string): string {
  return `/users/club_desk?clubId=${encodeURIComponent(clubId)}`;
}
