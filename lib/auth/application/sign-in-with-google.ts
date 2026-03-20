import type { AuthProviderGateway } from "../domain/ports";

export class SignInWithGoogleUseCase {
  constructor(private readonly authProvider: AuthProviderGateway) {}

  async execute(redirectTo: string): Promise<void> {
    await this.authProvider.signInWithGoogle(redirectTo);
  }
}
