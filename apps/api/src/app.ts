import { Module } from "@nestjs/common";
import { allowOrigins, JwtVerifier, type ServiceDefinition } from "@nobar/common";
import { type ApiConfig, apiConfigSchema, assertProductionConfig } from "./config";
import { IdentityModule } from "./modules/identity/identity.module";
import { KeyStore } from "./modules/identity/keys";
import { identityMigrations } from "./modules/identity/migrations";
import { createSmsProvider } from "./modules/identity/sms";

@Module({})
class ApiModule {}

/** The whole backend as one deployable (ADR 0008); each module owns one database schema. */
export function apiService(): ServiceDefinition<ApiConfig> {
  let keys: KeyStore | undefined;
  return {
    name: "api",
    configSchema: apiConfigSchema,
    migrations: [...identityMigrations],
    // the API verifies its own tokens with the identity module's keys (no JWKS round trip)
    async verifier({ config }) {
      assertProductionConfig(config);
      keys = await KeyStore.load(config);
      return new JwtVerifier({ getKey: keys.localVerifierKey(), issuer: config.JWT_ISSUER, audience: config.JWT_AUDIENCE });
    },
    module: (deps) => ({
      module: ApiModule,
      imports: [IdentityModule.forRoot({ keys: keys!, sms: createSmsProvider(deps.config, deps.log) })],
    }),
    configure: ({ app, deps }) => allowOrigins(app, deps.config.CORS_ORIGINS.split(",")),
  };
}
