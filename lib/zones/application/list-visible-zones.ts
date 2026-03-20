import { Zone, type ZoneSnapshot } from "../domain/zone";
import type { ListVisibleNearCenterQuery, ZoneQueryRepository } from "../domain/ports";

export class ListVisibleZonesUseCase {
  constructor(private readonly queryRepository: ZoneQueryRepository) {}

  async execute(query: ListVisibleNearCenterQuery): Promise<ZoneSnapshot[]> {
    const zones = await this.queryRepository.listVisibleNearCenter(query);
    return zones.map((zone) => Zone.fromSnapshot(zone).toSnapshot());
  }
}
