// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import { TranslationProvider } from '@/components/TranslationProvider';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from '@/context/authContext';
import { LoadingProvider } from '@/context/LoadingContext';
import LoadingIndicator from '@/components/LoadingIndicator';

export const metadata: Metadata = {
  title: {
    template: '%s - CAMP',
    default: 'CAMP',
  },
  description:
    'The platform that brings owners and tenants together for simpler communication and smoother renting',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-poppins antialiased">
        <TranslationProvider>
          <LoadingProvider>
            <AuthProvider>
              {children}
              <ToastContainer
                position="top-center"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
              />
            </AuthProvider>
            <LoadingIndicator />
          </LoadingProvider>
        </TranslationProvider>
      </body>
    </html>
  );
}
