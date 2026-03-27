export type AuthIdentity = {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

export class AuthUser {
  constructor(private readonly identity: AuthIdentity | null) {}

  static anonymous(): AuthUser {
    return new AuthUser(null);
  }

  static fromIdentity(identity: AuthIdentity): AuthUser {
    return new AuthUser(identity);
  }

  isAnonymous(): boolean {
    return this.identity === null;
  }

  toSnapshot(): AuthUserSnapshot {
    if (!this.identity) {
      return {
        id: null,
        email: null,
        displayName: null,
        avatarUrl: null,
        isAnonymous: true,
      };
    }

    return {
      ...this.identity,
      isAnonymous: false,
    };
  }
}

export type AuthUserSnapshot = {
  id: string | null;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  isAnonymous: boolean;
  points?: number | null;
};
