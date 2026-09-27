import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OmniChat — Multi-Agent & Multi-Attachment AI',
  description:
    'All-in-one AI chat platform with specialized agents (KidStory, StudyBuddy, Worksheet, DataAnalyst, Doctor, Psycho, Spiritual), multi-attachment processing, and smart multi-provider fallback.',
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0b0f17',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <body className="h-full bg-slate-950 text-slate-100 antialiased overflow-hidden">
        {children}
      </body>
    </html>
  );
}
