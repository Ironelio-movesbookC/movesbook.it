import MessagesHelpRail from '@/components/messages/MessagesHelpRail';

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <MessagesHelpRail />
    </>
  );
}
