import { Module } from "@nestjs/common";
import { allowOrigins, every, JwtVerifier, type ServiceDefinition } from "@nobar/common";
import { type ApiConfig, apiConfigSchema, assertProductionConfig, seedDemoEnabled } from "./config";
import { AuditModule } from "./modules/audit/audit.module";
import { auditMigrations } from "./modules/audit/migrations";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { SellerCatalogService } from "./modules/catalog/seller-catalog.service";
import { CatalogService } from "./modules/catalog/catalog.service";
import { catalogMigrations } from "./modules/catalog/migrations";
import { IdentityModule } from "./modules/identity/identity.module";
import { KeyStore } from "./modules/identity/keys";
import { identityMigrations } from "./modules/identity/migrations";
import { createSmsProvider } from "./modules/identity/sms";
import { CartModule } from "./modules/cart/cart.module";
import { cartMigrations } from "./modules/cart/migrations";
import { OrderModule } from "./modules/order/order.module";
import { orderMigrations } from "./modules/order/migrations";
import { FulfilmentService } from "./modules/order/fulfilment.service";
import { paymentMigrations } from "./modules/payment/migrations";
import { notificationMigrations } from "./modules/notification/migrations";
import { NotificationModule } from "./modules/notification/notification.module";
import { NotificationService } from "./modules/notification/notification.service";
import { reviewMigrations } from "./modules/review/migrations";
import { ReviewModule } from "./modules/review/review.module";
import { ReviewService } from "./modules/review/review.service";
import { PaymentService } from "./modules/payment/payment.service";


@Module({})
class ApiModule {}

/** The whole backend as one deployable (ADR 0008); each module owns one database schema. */
export function apiService(): ServiceDefinition<ApiConfig> {
  let keys: KeyStore | undefined;
  return {
    name: "api",
    configSchema: apiConfigSchema,
    migrations: [...identityMigrations, ...auditMigrations, ...catalogMigrations, ...cartMigrations, ...orderMigrations, ...paymentMigrations, ...reviewMigrations, ...notificationMigrations],
    // the API verifies its own tokens with the identity module's keys (no JWKS round trip)
    async verifier({ config }) {
      assertProductionConfig(config);
      keys = await KeyStore.load(config);
      return new JwtVerifier({ getKey: keys.localVerifierKey(), issuer: config.JWT_ISSUER, audience: config.JWT_AUDIENCE });
    },
    module: (deps) => ({
      module: ApiModule,
      imports: [IdentityModule.forRoot({ keys: keys!, sms: createSmsProvider(deps.config, deps.log) }), AuditModule, CatalogModule, CartModule, OrderModule, ReviewModule, NotificationModule],
    }),
    configure: ({ app, deps }) => allowOrigins(app, deps.config.CORS_ORIGINS.split(",")),
    async onStart({ app, deps }) {
      await app.get(NotificationService).subscribe(deps);
      if (seedDemoEnabled(deps.config)) {
        // the same sample catalog as the static demo site, so both show the same shops and listings
        await app.get(CatalogService).seedIfEmpty(async () => {
          const demo = await import("@nobar/demo");
          return { categories: demo.CATEGORIES, types: demo.PRODUCE_TYPES, shops: demo.SHOPS, listings: demo.LISTINGS };
        });
        await app.get(ReviewService).seed((await import("@nobar/demo")).REVIEWS);
        const payments = app.get(PaymentService);
        if (!(await payments.hasCommissionRules())) {
          // the kit's commission table (packages/demo COMMISSION_RULES): 10% overall, citrus 9%, dried fruit and dates 12%
          await payments.setCommissionRule("GLOBAL", null, 1000, "سراسری");
          await payments.setCommissionRule("CATEGORY", "citrus", 900, "دسته: مرکبات");
          await payments.setCommissionRule("CATEGORY", "dried", 1200, "دسته: خشکبار و خرما");
        }
      }
      if (deps.config.ORDER_TIMER_SEC === 0) return;
      // acceptance deadlines, complaint windows, unpaid reservations, listings past their freshness
      const fulfilment = app.get(FulfilmentService);
      const sellerCatalog = app.get(SellerCatalogService);
      return every(
        deps.config.ORDER_TIMER_SEC * 1000,
        async () => {
          await fulfilment.tick();
          await sellerCatalog.pauseStale();
        },
        (e) => deps.log.error({ err: e }, "timer failed"),
      );
    },
  };
}
