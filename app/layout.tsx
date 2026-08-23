import type { Metadata } from 'next';
import './globals.css';

const siteOrigin = process.env.SITE_ORIGIN ?? 'http://localhost:3000';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: 'TritonDex osu! LB',
  description: 'UC San Diego osu! LB.',
  openGraph: {
    title: 'TritonDex osu! LB',
    description: 'UC San Diego osu! LB.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TritonDex osu! LB',
    description: 'UC San Diego osu! LB.',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
