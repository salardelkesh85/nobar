import { Module } from "@nestjs/common";
import { CartModule } from "../cart/cart.module";
import { CatalogModule } from "../catalog/catalog.module";
import { OrderController } from "./order.controller";
import { OrderService } from "./order.service";

@Module({ imports: [CartModule, CatalogModule], controllers: [OrderController], providers: [OrderService] })
export class OrderModule {}
