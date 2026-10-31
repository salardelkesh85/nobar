import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { calculateJwkThumbprint, createLocalJWKSet, exportJWK, generateKeyPair, importJWK, type JWK, type JWTVerifyGetKey, SignJWT } from "jose";
import type { IdentityConfig } from "./config";

/** ES256 signing key + the public JWKS other services (and the gateway) verify against. */
export class KeyStore {
  private constructor(
    private readonly privateKey: CryptoKey,
    readonly kid: string,
    readonly publicJwk: JWK,
  ) {}

  static async load(config: IdentityConfig): Promise<KeyStore> {
    let jwk: JWK | undefined;
    if (config.JWT_PRIVATE_JWK) {
      jwk = JSON.parse(config.JWT_PRIVATE_JWK) as JWK;
    } else {
      if (config.NODE_ENV === "production") throw new Error("JWT_PRIVATE_JWK is required in production");
      const file = config.DATA_DIR === "memory" ? undefined : path.resolve(config.DATA_DIR, "identity-signing-key.json");
      if (file && existsSync(file)) jwk = JSON.parse(readFileSync(file, "utf8")) as JWK;
      if (!jwk) {
        const { privateKey } = await generateKeyPair("ES256", { extractable: true });
        jwk = await exportJWK(privateKey);
        if (file) {
          mkdirSync(path.dirname(file), { recursive: true });
          writeFileSync(file, JSON.stringify(jwk));
        }
      }
    }
    const kid = await calculateJwkThumbprint(jwk);
    const privateKey = (await importJWK(jwk, "ES256")) as CryptoKey;
    const { d: _d, ...publicJwk } = jwk;
    return new KeyStore(privateKey, kid, { ...publicJwk, kid, alg: "ES256", use: "sig" });
  }

  jwks() {
    return { keys: [this.publicJwk] };
  }

  localVerifierKey(): JWTVerifyGetKey {
    return createLocalJWKSet(this.jwks());
  }

  sign(claims: Record<string, unknown>, subject: string, opts: { issuer: string; audience: string; ttlSec: number }): Promise<string> {
    return new SignJWT(claims)
      .setProtectedHeader({ alg: "ES256", kid: this.kid, typ: "JWT" })
      .setSubject(subject)
      .setIssuer(opts.issuer)
      .setAudience(opts.audience)
      .setIssuedAt()
      .setExpirationTime(`${opts.ttlSec}s`)
      .sign(this.privateKey);
  }
}
