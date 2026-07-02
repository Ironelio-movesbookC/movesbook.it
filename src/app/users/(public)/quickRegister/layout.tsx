import QuickRegisterHeader from '@/components/users/QuickRegisterHeader';
import './quick-register.css';

export default function QuickRegisterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="quick-register-body">
      <div className="main martp-minus20">
        <QuickRegisterHeader />
        <div className="clear" />
        <div className="quick-register-content-area">{children}</div>
      </div>
    </div>
  );
}
