import { redirect } from 'next/navigation';

export default function ClubSettingsTypologyActiveReaderPage() {
  // CakePHP equivalent: /clubSettings/active_reader
  // Next.js: the card readers UI currently lives in the club dashboard.
  redirect('/club/dashboard?panel=identification-devices');
}

