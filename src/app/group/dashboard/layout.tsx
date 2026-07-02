import MessagesHelpRail from '@/components/messages/MessagesHelpRail';

export default function GroupDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <MessagesHelpRail />
    </>
  );
}
