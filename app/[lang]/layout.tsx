import type { Metadata } from "next";
import { Geist_Mono, Inter, Public_Sans } from "next/font/google";
import { notFound } from "next/navigation";
import "leaflet/dist/leaflet.css";
import { getPublicSiteUrl } from "@/lib/site/public-site-url";
import ThemeProvider from "@/shared/providers/theme-provider";
import "../globals.css";
import { hasLocale, SUPPORTED_LOCALES, type Locale } from "../i18n/config";
import { getDictionary } from "../i18n/get-dictionary";
import { buildMapMetadataImagePath, getOpenGraphLocale } from "./[[...zoneSlug]]/zone-share";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

type LayoutParams = {
  lang: string;
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
  params: Promise<LayoutParams>;
}>;

export async function generateStaticParams(): Promise<LayoutParams[]> {
  return SUPPORTED_LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<LayoutParams>;
}): Promise<Metadata> {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const dictionary = await getDictionary(lang);
  const canonicalPath = `/${lang}`;
  const localizedAlternates = Object.fromEntries(
    SUPPORTED_LOCALES.map((locale) => [locale, `/${locale}`]),
  ) as Record<Locale, string>;
  const shareImagePath = buildMapMetadataImagePath(lang);

  return {
    metadataBase: new URL(getPublicSiteUrl()),
    title: {
      default: dictionary.metadata.title,
      template: `%s | ${dictionary.metadata.title}`,
    },
    description: dictionary.metadata.description,
    alternates: {
      canonical: canonicalPath,
      languages: localizedAlternates,
    },
    openGraph: {
      title: dictionary.metadata.title,
      description: dictionary.metadata.description,
      url: canonicalPath,
      siteName: dictionary.metadata.title,
      locale: getOpenGraphLocale(lang),
      type: "website",
      images: [
        {
          url: shareImagePath,
          width: 1200,
          height: 630,
          alt: dictionary.metadata.share.mapImageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: dictionary.metadata.title,
      description: dictionary.metadata.description,
      images: [
        {
          url: shareImagePath,
          alt: dictionary.metadata.share.mapImageAlt,
        },
      ],
    },
  };
}

export default async function RootLayout({
  children,
  params,
}: RootLayoutProps) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  return (
    <html
      lang={lang}
      className={`${inter.variable} ${publicSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="h-full overflow-hidden bg-background text-foreground">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
