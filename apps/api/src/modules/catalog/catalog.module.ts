import { Module } from "@nestjs/common";
import { TOKENS } from "@nobar/common";
import type { ApiConfig } from "../../config";
import { CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";
import { KYC_VAULT, KycVault } from "./kyc";
import { AdminCatalogController, SellerCatalogController } from "./seller-catalog.controller";
import { SellerCatalogService } from "./seller-catalog.service";

/**
 * Catalog: categories, produce types, shops and listings, seller onboarding and moderation.
 * Owns the `catalog` schema. Other modules use the exported services, never the tables.
 */
@Module({
  controllers: [CatalogController, SellerCatalogController, AdminCatalogController],
  providers: [
    CatalogService,
    SellerCatalogService,
    { provide: KYC_VAULT, inject: [TOKENS.CONFIG], useFactory: (config: ApiConfig) => new KycVault(config) },
  ],
  exports: [CatalogService, SellerCatalogService],
})
export class CatalogModule {}
