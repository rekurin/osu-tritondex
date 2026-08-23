import type { Metadata } from 'next';
import './globals.css';

const siteOrigin = process.env.SITE_ORIGIN ?? 'http://localhost:3000';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const socialImage = new URL(`${basePath}/og.png`, siteOrigin).toString();

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: 'TritonDex — UC San Diego osu! Player Viewer',
  description: 'A UC San Diego-themed Pokédex-style viewer for campus osu! player profiles and statistics.',
  openGraph: {
    title: 'TritonDex — UC San Diego osu! Player Viewer',
    description: 'Scan the UCSD osu! roster, player stats, ranks, accuracy, and top plays in a campus-themed trainer registry.',
    type: 'website',
    images: [{ url: socialImage, width: 1672, height: 941, alt: 'TritonDex UC San Diego osu! player viewer' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TritonDex — UC San Diego osu! Player Viewer',
    description: 'A campus-themed trainer registry for the UC San Diego osu! community.',
    images: [socialImage],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
