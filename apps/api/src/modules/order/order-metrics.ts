import { Inject, Injectable } from "@nestjs/common";
import { consume, type Metrics, type ServiceDeps, TOKENS } from "@nobar/common";

/**
 * Business metrics from order events (each event counted once, through the inbox):
 * orders placed and their value, and every status change, for the business dashboard.
 */
@Injectable()
export class OrderMetrics {
  constructor(@Inject(TOKENS.METRICS) private readonly metrics: Metrics) {}

  async subscribe(deps: Pick<ServiceDeps, "bus" | "db" | "log">): Promise<void> {
    await consume(deps, "metrics.orders", ["order.placed", "order.accepted", "order.status_changed", "order.cancelled", "order.delivered"], async (event) => {
      const d = event.data;
      this.metrics.counter("nobar_order_events_total", "Order lifecycle events", ["type", "status"]).inc({ type: event.type, status: d.status });
      if (event.type === "order.placed") {
        this.metrics.counter("nobar_orders_placed_total", "Shop orders placed (paid or cash on delivery)", ["payment_method"]).inc({ payment_method: d.paymentMethod });
        this.metrics.counter("nobar_orders_placed_rial_total", "Value of shop orders placed, in Rial").inc(d.totalRial);
      }
    });
  }
}
