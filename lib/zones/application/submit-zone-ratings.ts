import type { ZoneCommandRepository } from "../domain/ports";
import { parseSubmitZoneRatings } from "../domain/validation";

export type SubmitZoneRatingsCommand = {
  zoneId: string;
  userId: string | null;
  anonymousFingerprint: string | null;
  ratings: unknown;
};

export class SubmitZoneRatingsUseCase {
  constructor(private readonly commandRepository: ZoneCommandRepository) {}

  async execute(command: SubmitZoneRatingsCommand): Promise<void> {
    const ratings = parseSubmitZoneRatings(command.ratings);

    await this.commandRepository.submitRatings({
      zoneId: command.zoneId,
      userId: command.userId,
      anonymousFingerprint: command.anonymousFingerprint,
      ratings,
    });
  }
}
