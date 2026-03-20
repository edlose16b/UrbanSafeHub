import { notFound } from "next/navigation";
import MapScreen from "../components/map-screen";
import { hasLocale } from "../i18n/config";
import { getDictionary } from "../i18n/get-dictionary";

type PageProps = {
  params: Promise<{
    lang: string;
  }>;
};

export default async function HomePage({ params }: PageProps) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const dictionary = await getDictionary(lang);

  return (
    <main className="w-screen h-screen overflow-hidden">
      <MapScreen translations={dictionary.map} />
    </main>
  );
}
