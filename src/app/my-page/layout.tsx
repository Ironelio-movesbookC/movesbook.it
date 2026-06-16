import MessagesHelpRail from '@/components/messages/MessagesHelpRail';

export default function MyPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <MessagesHelpRail />
    </>
  );
}
