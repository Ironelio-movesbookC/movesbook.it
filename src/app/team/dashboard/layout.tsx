import MessagesHelpRail from '@/components/messages/MessagesHelpRail';

export default function TeamDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <MessagesHelpRail />
    </>
  );
}
