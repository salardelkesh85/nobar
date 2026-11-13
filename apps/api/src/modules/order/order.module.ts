import { Module } from "@nestjs/common";
import { CartModule } from "../cart/cart.module";
import { CatalogModule } from "../catalog/catalog.module";
import { PaymentModule } from "../payment/payment.module";
import { AdminOrdersController } from "./admin-orders.controller";
import { FulfilmentService } from "./fulfilment.service";
import { OrderController } from "./order.controller";
import { OrderMetrics } from "./order-metrics";
import { OrderService } from "./order.service";
import { SellerOrdersController } from "./seller-orders.controller";

@Module({
  imports: [CartModule, CatalogModule, PaymentModule],
  controllers: [OrderController, SellerOrdersController, AdminOrdersController],
  providers: [OrderService, FulfilmentService, OrderMetrics],
  exports: [OrderMetrics, FulfilmentService],
})
export class OrderModule {}
