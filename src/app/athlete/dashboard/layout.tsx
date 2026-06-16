import MessagesHelpRail from '@/components/messages/MessagesHelpRail';

export default function AthleteDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <MessagesHelpRail />
    </>
  );
}
