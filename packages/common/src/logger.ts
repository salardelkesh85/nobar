import type { LoggerService } from "@nestjs/common";
import pino from "pino";
import { Writable } from "node:stream";
import { currentContext } from "./context";

export type Logger = pino.Logger;

const COLORS: Record<string, string> = { trace: "90", debug: "36", info: "32", warn: "33", error: "31", fatal: "35" };

/**
 * Human-readable dev output without pino-pretty's worker thread per logger
 * (the dev host runs ~10 services in one process).
 */
function prettyStream(): Writable {
  return new Writable({
    write(chunk, _enc, cb) {
      try {
        const { level, time, service, msg, request_id, trace_id, err, ...rest } = JSON.parse(String(chunk));
        delete rest.pid;
        delete rest.hostname;
        const t = String(time).slice(11, 19);
        const extra = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : "";
        const rid = request_id ? ` \x1b[90m[${request_id}]\x1b[0m` : "";
        process.stdout.write(`\x1b[90m${t}\x1b[0m \x1b[${COLORS[level] ?? "0"}m${String(level).padEnd(5)}\x1b[0m \x1b[1m${String(service).padEnd(12)}\x1b[0m ${msg ?? ""}${rid}${extra}\n`);
        if (err?.stack) process.stdout.write(`${err.stack}\n`);
      } catch {
        process.stdout.write(chunk);
      }
      cb();
    },
  });
}

export function createLogger(service: string, level: string, format: "json" | "pretty" = "json"): Logger {
  return pino(
    {
      level,
      base: { service },
      messageKey: "msg",
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: { level: (label) => ({ level: label }) },
      mixin() {
        const ctx = currentContext();
        return ctx ? { request_id: ctx.requestId, trace_id: ctx.traceId } : {};
      },
      // PII and secrets never reach the logs (docs/architecture.md §9)
      redact: {
        paths: ["phone", "*.phone", "code", "*.code", "refreshToken", "*.refreshToken", "accessToken", "*.accessToken", "authorization", "*.authorization"],
        censor: "[redacted]",
      },
    },
    format === "pretty" ? prettyStream() : undefined,
  );
}

/** Routes Nest's own logs through pino. */
export class NestPinoLogger implements LoggerService {
  constructor(private readonly logger: Logger) {}
  log(message: unknown, context?: string) {
    if (context === "RouterExplorer" || context === "RoutesResolver" || context === "InstanceLoader") return;
    this.logger.info({ ctx: context }, String(message));
  }
  error(message: unknown, trace?: string, context?: string) {
    this.logger.error({ ctx: context, trace }, String(message));
  }
  warn(message: unknown, context?: string) {
    this.logger.warn({ ctx: context }, String(message));
  }
  debug(message: unknown, context?: string) {
    this.logger.debug({ ctx: context }, String(message));
  }
  verbose(message: unknown, context?: string) {
    this.logger.trace({ ctx: context }, String(message));
  }
}
