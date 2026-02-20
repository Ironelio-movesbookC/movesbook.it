import type { Metadata } from 'next';
// import { Inter } from 'next/font/google';
import './globals.css';
import { ClientProviders } from '@/components/providers/ClientProviders';

// const inter = Inter({ 
//   subsets: ['latin'],
//   display: 'swap', // Better performance
//   fallback: ['system-ui', 'arial'] // Explicit fallback
// });

export const metadata: Metadata = {
  title: 'Movesbook - Workout Management System',
  description: 'Professional workout planning and tracking platform',
  icons: {
    icon: '/sidelogo.png',
    shortcut: '/sidelogo.png',
    apple: '/sidelogo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" />
      </head>
      <body className="font-sans">
        <ClientProviders>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            {children}
          </div>
        </ClientProviders>
      </body>
    </html>
  );
}