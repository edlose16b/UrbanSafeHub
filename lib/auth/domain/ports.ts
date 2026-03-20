import type { AuthIdentity } from "./auth-user";

export interface AuthProviderGateway {
  getCurrentAuthIdentity(): Promise<AuthIdentity | null>;
  signInWithGoogle(redirectTo: string): Promise<void>;
  signOut(): Promise<void>;
}

export interface ProfileRepository {
  upsertFromAuthIdentity(authIdentity: AuthIdentity): Promise<void>;
}
