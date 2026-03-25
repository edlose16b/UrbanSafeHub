import { Zone, type ZoneSnapshot } from "../domain/zone";
import type { ZoneCommandRepository } from "../domain/ports";
import {
  parseCreateZoneRatings,
  parseZoneGeometry,
  sanitizeZoneDescription,
  sanitizeZoneName,
} from "../domain/validation";

export type CreateZoneCommand = {
  name: unknown;
  description: unknown;
  geometry: unknown;
  ratings: unknown;
  createdBy: string;
};

export class CreateZoneUseCase {
  constructor(private readonly commandRepository: ZoneCommandRepository) {}

  async execute(command: CreateZoneCommand): Promise<ZoneSnapshot> {
    const name = sanitizeZoneName(command.name);
    const description = sanitizeZoneDescription(command.description);
    const geometry = parseZoneGeometry(command.geometry);
    const ratings = parseCreateZoneRatings(command.ratings);

    const zone = await this.commandRepository.create({
      name,
      description,
      geometry,
      ratings,
      createdBy: command.createdBy,
    });

    return Zone.fromSnapshot(zone).toSnapshot();
  }
}
