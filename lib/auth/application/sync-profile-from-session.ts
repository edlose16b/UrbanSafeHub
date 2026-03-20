import type { AuthProviderGateway, ProfileRepository } from "../domain/ports";

export class SyncProfileFromSessionUseCase {
  constructor(
    private readonly authProvider: AuthProviderGateway,
    private readonly profileRepository: ProfileRepository,
  ) {}

  async execute(): Promise<void> {
    const authIdentity = await this.authProvider.getCurrentAuthIdentity();

    if (!authIdentity) {
      return;
    }

    await this.profileRepository.upsertFromAuthIdentity(authIdentity);
  }
}
