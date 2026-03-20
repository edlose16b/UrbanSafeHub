import { notFound } from "next/navigation";
import { getCurrentAuthUserSnapshot } from "@/lib/auth/server/get-current-auth-user";
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
  const initialUser = await getCurrentAuthUserSnapshot();

  return (
    <main className="w-screen h-screen overflow-hidden">
      <MapScreen
        lang={lang}
        initialUser={initialUser}
        authTranslations={dictionary.auth}
        translations={dictionary.map}
      />
    </main>
  );
}
