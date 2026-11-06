import { Module } from "@nestjs/common";
import { TOKENS } from "@nobar/common";
import type { ApiConfig } from "../../config";
import { PaymentController } from "./payment.controller";
import { PaymentService } from "./payment.service";
import { FakePaymentProvider, PAYMENT_PROVIDER } from "./provider";

/** Payments, ledger, commission and payouts. Owns the `payment` schema. */
@Module({
  controllers: [PaymentController],
  providers: [
    PaymentService,
    { provide: PAYMENT_PROVIDER, inject: [TOKENS.CONFIG], useFactory: (config: ApiConfig) => new FakePaymentProvider(config.API_PUBLIC_URL) },
  ],
  exports: [PaymentService],
})
export class PaymentModule {}
