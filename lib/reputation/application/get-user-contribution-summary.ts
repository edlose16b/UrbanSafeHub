import type { UserContributionRepository } from "../domain/ports";
import type { UserContributionSummarySnapshot } from "../domain/points";

export class GetUserContributionSummaryUseCase {
  constructor(
    private readonly contributionRepository: UserContributionRepository,
  ) {}

  async execute(userId: string): Promise<UserContributionSummarySnapshot> {
    return this.contributionRepository.getSummaryForUser(userId);
  }
}
