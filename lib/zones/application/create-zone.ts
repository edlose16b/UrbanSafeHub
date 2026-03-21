import { Zone, type ZoneSnapshot } from "../domain/zone";
import type { ZoneCommandRepository } from "../domain/ports";
import {
  parseZoneGeometry,
  sanitizeZoneName,
} from "../domain/validation";

export type CreateZoneCommand = {
  name: unknown;
  geometry: unknown;
  createdBy: string;
};

export class CreateZoneUseCase {
  constructor(private readonly commandRepository: ZoneCommandRepository) {}

  async execute(command: CreateZoneCommand): Promise<ZoneSnapshot> {
    const name = sanitizeZoneName(command.name);
    const geometry = parseZoneGeometry(command.geometry);

    const zone = await this.commandRepository.create({
      name,
      geometry,
      createdBy: command.createdBy,
    });

    return Zone.fromSnapshot(zone).toSnapshot();
  }
}
