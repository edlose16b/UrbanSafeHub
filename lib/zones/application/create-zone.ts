import { Zone, type ZoneSnapshot } from "../domain/zone";
import type { ZoneCommandRepository } from "../domain/ports";
import {
  parseZoneGeometry,
  parseZoneType,
  sanitizeZoneName,
} from "../domain/validation";

export type CreateZoneCommand = {
  name: unknown;
  zoneType: unknown;
  geometry: unknown;
  createdBy: string;
};

export class CreateZoneUseCase {
  constructor(private readonly commandRepository: ZoneCommandRepository) {}

  async execute(command: CreateZoneCommand): Promise<ZoneSnapshot> {
    const name = sanitizeZoneName(command.name);
    const zoneType = parseZoneType(command.zoneType);
    const geometry = parseZoneGeometry(command.geometry);

    const zone = await this.commandRepository.create({
      name,
      zoneType,
      geometry,
      createdBy: command.createdBy,
    });

    return Zone.fromSnapshot(zone).toSnapshot();
  }
}
