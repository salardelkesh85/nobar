import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { ZodError } from "zod";
import { currentContext } from "./context";
import type { Logger } from "./logger";

/** Domain/application error rendered as RFC 9457 Problem Details. `code` is stable for clients. */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (code: string, message: string, details?: unknown) => new AppError(400, code, message, details);
export const unauthorized = (message = "ابتدا وارد شوید") => new AppError(401, "UNAUTHORIZED", message);
export const forbidden = (message = "دسترسی ندارید") => new AppError(403, "FORBIDDEN", message);
export const notFound = (what: string) => new AppError(404, "NOT_FOUND", `${what} پیدا نشد`);
export const conflict = (code: string, message: string, details?: unknown) => new AppError(409, code, message, details);
export const unprocessable = (code: string, message: string, details?: unknown) => new AppError(422, code, message, details);
export const tooMany = (message: string, retryAfterSec?: number) => new AppError(429, "RATE_LIMITED", message, { retryAfterSec });

/** Error returned by another service; keeps its status/code so it can be propagated. */
export class UpstreamError extends AppError {
  constructor(
    readonly service: string,
    status: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(status === 503 || status === 504 ? status : status >= 500 ? 502 : status, code, message, details);
  }
}

@Catch()
export class ProblemFilter implements ExceptionFilter {
  constructor(private readonly log: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const reply = host.switchToHttp().getResponse<FastifyReply>();
    let status = 500;
    let code = "INTERNAL";
    let detail = "خطای داخلی سرور";
    let errors: unknown;

    if (exception instanceof AppError) {
      ({ status, code } = exception);
      detail = exception.message;
      errors = exception.details;
    } else if (exception instanceof ZodError) {
      status = 400;
      code = "VALIDATION";
      detail = exception.issues[0]?.message ?? "ورودی نامعتبر است";
      errors = exception.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = status === 404 ? "NOT_FOUND" : `HTTP_${status}`;
      const res = exception.getResponse();
      detail = typeof res === "string" ? res : ((res as { message?: string }).message ?? exception.message);
    } else if ((exception as { statusCode?: number })?.statusCode && (exception as { statusCode: number }).statusCode < 500) {
      // Fastify-level errors (e.g. malformed JSON body)
      status = (exception as { statusCode: number }).statusCode;
      code = "BAD_REQUEST";
      detail = (exception as Error).message;
    }

    if (status >= 500) this.log.error({ err: exception }, "request failed");
    if (status === 429 && (errors as { retryAfterSec?: number })?.retryAfterSec) {
      void reply.header("retry-after", String((errors as { retryAfterSec: number }).retryAfterSec));
    }
    void reply
      .status(status)
      .header("content-type", "application/problem+json; charset=utf-8")
      .send({ type: `https://nobar.ir/problems/${code.toLowerCase()}`, title: code, status, code, detail, errors, requestId: currentContext()?.requestId });
  }
}
