// Prints fresh production secrets as .env lines:  node dist/keygen.js >> .env
// (OTP_SECRET, KYC_KEY, JWT_PRIVATE_JWK, INTERNAL_TOKEN). Keep them: a new KYC_KEY makes stored national IDs and Sheba numbers
// unreadable, and a new signing key signs everyone out.
import { randomBytes } from "node:crypto";
import { exportJWK, generateKeyPair } from "jose";

async function main(): Promise<void> {
  const { privateKey } = await generateKeyPair("ES256", { extractable: true });
  const jwk = await exportJWK(privateKey);
  const lines = [
    `OTP_SECRET=${randomBytes(32).toString("base64url")}`,
    `KYC_KEY=${randomBytes(32).toString("base64")}`,
    `JWT_PRIVATE_JWK='${JSON.stringify(jwk)}'`,
    `INTERNAL_TOKEN=${randomBytes(24).toString("base64url")}`,
  ];
  process.stdout.write(`${lines.join("\n")}\n`);
}

void main();
