import type { Metadata } from "next";
import { Geist_Mono, Inter, Public_Sans } from "next/font/google";
import { notFound } from "next/navigation";
import "leaflet/dist/leaflet.css";
import ThemeProvider from "../components/theme-provider";
import "../globals.css";
import { hasLocale, SUPPORTED_LOCALES } from "../i18n/config";
import { getDictionary } from "../i18n/get-dictionary";

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

  return {
    title: dictionary.metadata.title,
    description: dictionary.metadata.description,
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
