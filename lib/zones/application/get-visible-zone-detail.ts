import type { ZoneQueryRepository } from "../domain/ports";
import type { ZoneDetailSnapshot } from "../domain/zone-detail";

export class GetVisibleZoneDetailUseCase {
  constructor(private readonly queryRepository: ZoneQueryRepository) {}

  async execute(
    zoneId: string,
    viewerUserId?: string | null,
  ): Promise<ZoneDetailSnapshot | null> {
    return this.queryRepository.getVisibleDetailById(zoneId, viewerUserId);
  }
}
