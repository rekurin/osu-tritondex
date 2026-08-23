import type { Metadata } from 'next';
import './globals.css';

const siteOrigin = process.env.SITE_ORIGIN ?? 'http://localhost:3000';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const socialImage = new URL(`${basePath}/og.png`, siteOrigin).toString();

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: 'TritonDex osu! LB',
  description: 'UC San Diego osu! LB.',
  openGraph: {
    title: 'TritonDex osu! LB',
    description: 'UC San Diego osu! LB.',
    type: 'website',
    images: [{ url: socialImage, width: 1672, height: 941, alt: 'TritonDex UC San Diego osu! player viewer' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TritonDex osu! LB',
    description: 'UC San Diego osu! LB.',
    images: [socialImage],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
