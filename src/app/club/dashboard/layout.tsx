import MessagesHelpRail from '@/components/messages/MessagesHelpRail';

export default function ClubDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <MessagesHelpRail />
    </>
  );
}
