import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Richup — Private Monopoly',
  description: 'Play Monopoly online with friends — all premium features unlocked.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-game-navy antialiased">
        {children}
      </body>
    </html>
  );
}
