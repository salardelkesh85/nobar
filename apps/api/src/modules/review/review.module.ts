import { Module } from "@nestjs/common";
import { CatalogModule } from "../catalog/catalog.module";
import { OrderModule } from "../order/order.module";
import { AdminReviewController, ReviewController } from "./review.controller";
import { ReviewService } from "./review.service";

/** Reviews and product questions. Owns the `review` schema. */
@Module({ imports: [CatalogModule, OrderModule], controllers: [ReviewController, AdminReviewController], providers: [ReviewService], exports: [ReviewService] })
export class ReviewModule {}
