/** Basic email validation for share recipients */
export function isValidShareEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildShareEmailHtml(message: string, shareLink: string): string {
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br/>');
  const safeLink = escapeHtml(shareLink);
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111;">
      <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">${safeMessage}</p>
      <p style="margin: 24px 0 8px; font-size: 14px; font-weight: 600;">Open shared plan (read-only):</p>
      <p style="margin: 0 0 24px;">
        <a href="${safeLink}" style="color: #2563eb; word-break: break-all;">${safeLink}</a>
      </p>
      <p style="font-size: 12px; color: #6b7280; margin: 0; border-top: 1px solid #e5e7eb; padding-top: 16px;">
        Sent from Movesbook
      </p>
    </div>
  `;
}
