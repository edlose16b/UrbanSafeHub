import type { UserContributionSummarySnapshot } from "./points";

export interface UserContributionRepository {
  getSummaryForUser(userId: string): Promise<UserContributionSummarySnapshot>;
}
