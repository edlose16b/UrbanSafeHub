import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentAuthUserSnapshot } from "@/lib/auth/server/get-current-auth-user";
import {
  type ContributionBadge,
  type PointEventReason,
  type UserPointEventSnapshot,
} from "@/lib/reputation/domain/points";
import { getUserContributionSummary } from "@/lib/reputation/server/get-user-contribution-summary";
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

  const [dictionary, viewer] = await Promise.all([
    getDictionary(lang),
    getCurrentAuthUserSnapshot(),
  ]);
  const contributionSummary =
    viewer.isAnonymous || viewer.id === null
      ? null
      : await getUserContributionSummary(viewer.id);
  const formatter = new Intl.DateTimeFormat(lang, {
    dateStyle: "medium",
  });
  const contributionsDictionary = dictionary.contributions;

  function getBadgeLabel(badge: ContributionBadge): string {
    switch (badge) {
      case "neighbor":
        return contributionsDictionary.badgeNeighbor;
      case "guardian":
        return contributionsDictionary.badgeGuardian;
      case "sentinel":
        return contributionsDictionary.badgeSentinel;
      case "city_shaper":
        return contributionsDictionary.badgeCityShaper;
    }
  }

  function getEventLabel(reason: PointEventReason): string {
    switch (reason) {
      case "zone_created":
        return contributionsDictionary.eventZoneCreated;
      case "zone_rating_added":
        return contributionsDictionary.eventZoneRatingAdded;
      case "zone_hidden_by_reports":
        return contributionsDictionary.eventZoneHiddenByReports;
    }
  }

  function formatDelta(delta: number): string {
    return `${delta > 0 ? "+" : ""}${delta}`;
  }

  function getEventToneClasses(event: UserPointEventSnapshot): string {
    if (event.delta >= 0) {
      return "bg-success text-success-foreground";
    }

    return "bg-danger text-danger-foreground";
  }

  return (
    <main className="min-h-screen overflow-y-auto px-6 py-10 md:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="glass-panel relative overflow-hidden rounded-[2rem] border border-border-muted px-6 py-8 md:px-8">
          <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,_rgba(255,122,116,0.24),_transparent_58%),radial-gradient(circle_at_top_right,_rgba(74,225,131,0.18),_transparent_48%)]" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="editorial-chip inline-flex rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.24em]">
                {contributionsDictionary.eyebrow}
              </p>
              <h1 className="mt-4 text-4xl font-semibold text-foreground md:text-5xl">
                {contributionsDictionary.title}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-text-muted md:text-base">
                {contributionsDictionary.subtitle}
              </p>
            </div>
            <Link
              href={`/${lang}`}
              className="ghost-outline inline-flex w-fit rounded-full bg-surface-lowest/80 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-lowest"
            >
              {contributionsDictionary.backToMap}
            </Link>
          </div>
        </section>

        {contributionSummary ? (
          <>
            <section className="grid gap-4 md:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.95fr)]">
              <article className="tonal-panel rounded-[1.75rem] border border-border-muted p-6">
                <p className="text-sm uppercase tracking-[0.22em] text-text-secondary">
                  {contributionsDictionary.totalPointsLabel}
                </p>
                <div className="mt-4 flex items-end gap-3">
                  <span className="text-6xl font-semibold leading-none text-foreground">
                    {contributionSummary.totalPoints}
                  </span>
                  <span className="mb-2 text-sm font-medium text-text-secondary">
                    {contributionsDictionary.pointsUnit}
                  </span>
                </div>
                <p className="mt-4 max-w-xl text-sm leading-6 text-text-muted">
                  {contributionsDictionary.totalPointsDescription}
                </p>
              </article>

              <article className="glass-panel rounded-[1.75rem] border border-border-muted p-6">
                <p className="text-sm uppercase tracking-[0.22em] text-text-secondary">
                  {contributionsDictionary.badgeLabel}
                </p>
                <div className="mt-4 inline-flex rounded-full bg-secondary-container px-4 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-warning-foreground">
                  {getBadgeLabel(contributionSummary.currentBadge)}
                </div>
                <p className="mt-4 text-sm leading-6 text-text-muted">
                  {contributionsDictionary.badgeDescription}
                </p>
              </article>
            </section>

            <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <article className="glass-panel rounded-[1.75rem] border border-border-muted p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold text-foreground">
                      {contributionsDictionary.recentActivityTitle}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-text-muted">
                      {contributionsDictionary.recentActivitySubtitle}
                    </p>
                  </div>
                </div>

                {contributionSummary.recentEvents.length > 0 ? (
                  <ul className="mt-6 space-y-3">
                    {contributionSummary.recentEvents.map((event) => (
                      <li
                        key={`${event.reason}-${event.createdAt}-${event.delta}`}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-border-muted bg-surface-low/80 px-4 py-4"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {getEventLabel(event.reason)}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-text-secondary">
                            {formatter.format(new Date(event.createdAt))}
                          </p>
                        </div>
                        <span
                          className={`inline-flex min-w-16 justify-center rounded-full px-3 py-1 text-sm font-semibold ${getEventToneClasses(event)}`}
                        >
                          {formatDelta(event.delta)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-6 rounded-2xl border border-dashed border-border px-4 py-8 text-sm text-text-muted">
                    {contributionsDictionary.recentActivityEmpty}
                  </div>
                )}
              </article>

              <article className="tonal-panel rounded-[1.75rem] border border-border-muted p-6">
                <h2 className="text-2xl font-semibold text-foreground">
                  {contributionsDictionary.rulesTitle}
                </h2>
                <p className="mt-2 text-sm leading-6 text-text-muted">
                  {contributionsDictionary.rulesSubtitle}
                </p>
                <ul className="mt-6 space-y-3">
                  <li className="rounded-2xl border border-border-muted bg-surface-lowest/75 p-4">
                    <p className="text-sm font-semibold text-foreground">
                      {contributionsDictionary.ruleCreateZoneTitle}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-text-muted">
                      {contributionsDictionary.ruleCreateZoneDescription}
                    </p>
                  </li>
                  <li className="rounded-2xl border border-border-muted bg-surface-lowest/75 p-4">
                    <p className="text-sm font-semibold text-foreground">
                      {contributionsDictionary.ruleRateZoneTitle}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-text-muted">
                      {contributionsDictionary.ruleRateZoneDescription}
                    </p>
                  </li>
                  <li className="rounded-2xl border border-border-muted bg-surface-lowest/75 p-4">
                    <p className="text-sm font-semibold text-foreground">
                      {contributionsDictionary.ruleReportPenaltyTitle}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-text-muted">
                      {contributionsDictionary.ruleReportPenaltyDescription}
                    </p>
                  </li>
                </ul>
              </article>
            </section>
          </>
        ) : (
          <section className="glass-panel rounded-[1.75rem] border border-border-muted p-6 md:p-8">
            <h2 className="text-3xl font-semibold text-foreground">
              {contributionsDictionary.anonymousTitle}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted md:text-base">
              {contributionsDictionary.anonymousDescription}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/${lang}`}
                className="primary-glow inline-flex rounded-full px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
              >
                {contributionsDictionary.anonymousCta}
              </Link>
              <div className="ghost-outline inline-flex rounded-full bg-surface-lowest/80 px-5 py-3 text-sm text-text-muted">
                {contributionsDictionary.anonymousHint}
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
