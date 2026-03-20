import { notFound } from "next/navigation";
import { hasLocale } from "@/app/i18n/config";
import { getDictionary } from "@/app/i18n/get-dictionary";

type ContributionsPageProps = {
  params: Promise<{
    lang: string;
  }>;
};

export default async function ContributionsPage({
  params,
}: ContributionsPageProps) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const dictionary = await getDictionary(lang);

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6 py-16 text-center">
      <section className="max-w-md rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-neutral-900">
          {dictionary.auth.contributions}
        </h1>
        <p className="mt-3 text-neutral-600">
          {dictionary.auth.contributionsComingSoon}
        </p>
      </section>
    </main>
  );
}
