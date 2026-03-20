import { Zone, type ZoneSnapshot } from "../domain/zone";
import type { ZoneQueryRepository } from "../domain/ports";

export class ListVisibleZonesUseCase {
  constructor(private readonly queryRepository: ZoneQueryRepository) {}

  async execute(): Promise<ZoneSnapshot[]> {
    const zones = await this.queryRepository.listVisible();
    return zones.map((zone) => Zone.fromSnapshot(zone).toSnapshot());
  }
}
