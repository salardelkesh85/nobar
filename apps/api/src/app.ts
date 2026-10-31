import { Module } from "@nestjs/common";
import { allowOrigins, JwtVerifier, type ServiceDefinition } from "@nobar/common";
import { type ApiConfig, apiConfigSchema, assertProductionConfig, seedDemoEnabled } from "./config";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { CatalogService } from "./modules/catalog/catalog.service";
import { catalogMigrations } from "./modules/catalog/migrations";
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
    migrations: [...identityMigrations, ...catalogMigrations],
    // the API verifies its own tokens with the identity module's keys (no JWKS round trip)
    async verifier({ config }) {
      assertProductionConfig(config);
      keys = await KeyStore.load(config);
      return new JwtVerifier({ getKey: keys.localVerifierKey(), issuer: config.JWT_ISSUER, audience: config.JWT_AUDIENCE });
    },
    module: (deps) => ({
      module: ApiModule,
      imports: [IdentityModule.forRoot({ keys: keys!, sms: createSmsProvider(deps.config, deps.log) }), CatalogModule],
    }),
    configure: ({ app, deps }) => allowOrigins(app, deps.config.CORS_ORIGINS.split(",")),
    async onStart({ app, deps }) {
      if (!seedDemoEnabled(deps.config)) return;
      // the same sample catalog as the static demo site, so both show the same shops and listings
      await app.get(CatalogService).seedIfEmpty(async () => {
        const demo = await import("@nobar/demo");
        return { categories: demo.CATEGORIES, types: demo.PRODUCE_TYPES, shops: demo.SHOPS, listings: demo.LISTINGS };
      });
    },
  };
}
