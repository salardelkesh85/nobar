import { Module } from "@nestjs/common";
import { CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";

/**
 * Catalog: categories, produce types, shops and listings. Owns the `catalog` schema.
 * Other modules use the exported CatalogService, never the tables.
 */
@Module({
  controllers: [CatalogController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
