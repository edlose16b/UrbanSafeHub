import { AuthUser, type AuthUserSnapshot } from "../domain/auth-user";
import type { AuthProviderGateway } from "../domain/ports";

export class GetCurrentUserUseCase {
  constructor(private readonly authProvider: AuthProviderGateway) {}

  async execute(): Promise<AuthUserSnapshot> {
    const authIdentity = await this.authProvider.getCurrentAuthIdentity();

    if (!authIdentity) {
      return AuthUser.anonymous().toSnapshot();
    }

    return AuthUser.fromIdentity(authIdentity).toSnapshot();
  }
}
