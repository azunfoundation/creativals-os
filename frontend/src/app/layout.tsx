'use client';

import { Inter } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';
import { ModalProvider } from '@/providers/ModalProvider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        <title>Creativals OS</title>
        <meta name="description" content="Your Agency. One OS. — Creativals OS is an all-in-one ERP platform for creative agencies." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="dark"
          enableSystem={false}
          themes={['light', 'dark']}
        >
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <ModalProvider>
                {children}
              </ModalProvider>
            </ToastProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
