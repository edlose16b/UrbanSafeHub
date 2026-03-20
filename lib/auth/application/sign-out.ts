import type { AuthProviderGateway } from "../domain/ports";

export class SignOutUseCase {
  constructor(private readonly authProvider: AuthProviderGateway) {}

  async execute(): Promise<void> {
    await this.authProvider.signOut();
  }
}
