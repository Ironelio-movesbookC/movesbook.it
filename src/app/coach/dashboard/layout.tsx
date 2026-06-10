import MessagesHelpRail from '@/components/messages/MessagesHelpRail';

export default function CoachDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <MessagesHelpRail />
    </>
  );
}
