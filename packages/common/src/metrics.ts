import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from "prom-client";

/** One Prometheus registry per service (the dev host runs several services in one process). */
export class Metrics {
  readonly registry = new Registry();
  readonly httpDuration: Histogram<"method" | "route" | "status">;
  private readonly counters = new Map<string, Counter<string>>();
  private readonly gauges = new Map<string, Gauge<string>>();

  constructor(service: string) {
    this.registry.setDefaultLabels({ service });
    collectDefaultMetrics({ register: this.registry });
    this.httpDuration = new Histogram({
      name: "http_server_request_duration_seconds",
      help: "HTTP request duration",
      labelNames: ["method", "route", "status"],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.3, 0.5, 1, 2.5, 5],
      registers: [this.registry],
    });
  }

  /** Business counter, e.g. `nobar_orders_placed_total`. Created on first use. */
  counter(name: string, help: string, labelNames: string[] = []): Counter<string> {
    let c = this.counters.get(name);
    if (!c) {
      c = new Counter({ name, help, labelNames, registers: [this.registry] });
      this.counters.set(name, c);
    }
    return c;
  }

  gauge(name: string, help: string, labelNames: string[] = []): Gauge<string> {
    let g = this.gauges.get(name);
    if (!g) {
      g = new Gauge({ name, help, labelNames, registers: [this.registry] });
      this.gauges.set(name, g);
    }
    return g;
  }
}
