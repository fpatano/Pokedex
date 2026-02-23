import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pokédex MVP',
  description: 'Pokémon TCG card search with Cool Picks',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
