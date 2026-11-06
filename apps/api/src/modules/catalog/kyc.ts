import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { ApiConfig } from "../../config";

/**
 * Encrypts KYC fields (national ID, Sheba) at rest with AES-256-GCM (kit: "KYC fields are encrypted").
 * Format: base64(iv | tag | ciphertext). Only the last four digits are kept in clear for staff screens.
 */
export class KycVault {
  private readonly key: Buffer;

  constructor(config: Pick<ApiConfig, "KYC_KEY">) {
    this.key = config.KYC_KEY ? Buffer.from(config.KYC_KEY, "base64") : createHash("sha256").update("nobar-dev-kyc-key").digest();
    if (this.key.length !== 32) throw new Error("KYC_KEY must be 32 bytes (base64)");
  }

  seal(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64");
  }

  open(sealed: string): string {
    const raw = Buffer.from(sealed, "base64");
    const decipher = createDecipheriv("aes-256-gcm", this.key, raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
  }
}

export const KYC_VAULT = Symbol.for("nobar.catalog.kyc");
