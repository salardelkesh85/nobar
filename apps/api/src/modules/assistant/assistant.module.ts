import { Body, Controller, Get, Inject, Module, Param, Post, Query, Res } from "@nestjs/common";
import { AppError, type AuthUser, CurrentUser, Roles, TOKENS, ZodPipe } from "@nobar/common";
import { CITIES, DEFAULT_CITY_ID } from "@nobar/contracts/cities";
import type { FastifyReply } from "fastify";
import { z } from "zod";
import type { ApiConfig } from "../../config";
import { CartModule } from "../cart/cart.module";
import { CatalogModule } from "../catalog/catalog.module";
import { AssistantService } from "./assistant.service";
import { createLlmProvider, LLM_PROVIDER } from "./llm";

const DESTINATIONS = CITIES.filter((city) => city.destination).map((city) => city.id) as [string, ...string[]];
const DestQuery = z.object({ dest: z.enum(DESTINATIONS, { error: "شهر مقصد پشتیبانی نمی‌شود" }).default(DEFAULT_CITY_ID) });
const ChatBody = z.object({
  message: z.string().trim().min(1, "پیام خالی است").max(500, "پیام خیلی طولانی است"),
  conversationId: z.string().uuid().optional(),
});

/** Shopping assistant for the signed-in buyer. */
@Controller("v1/assistant")
class AssistantController {
  constructor(@Inject(AssistantService) private readonly assistant: AssistantService) {}

  @Post("chat")
  chat(@CurrentUser() user: AuthUser, @Query(new ZodPipe(DestQuery)) q: z.infer<typeof DestQuery>, @Body(new ZodPipe(ChatBody)) body: z.infer<typeof ChatBody>) {
    return this.assistant.chat(user.id, { message: body.message, dest: q.dest, ...(body.conversationId ? { conversationId: body.conversationId } : {}) });
  }

  /**
   * The same turn as a server-sent event stream: `step` while a tool runs, then `done` with the whole
   * reply (or `error`). The text is not streamed word by word on purpose: it is checked against the
   * tool results before the buyer sees any of it.
   */
  @Post("chat/stream")
  async stream(@CurrentUser() user: AuthUser, @Query(new ZodPipe(DestQuery)) q: z.infer<typeof DestQuery>, @Body(new ZodPipe(ChatBody)) body: z.infer<typeof ChatBody>, @Res() reply: FastifyReply) {
    // headers set so far (CORS, request id) go out with the stream
    reply.raw.writeHead(200, { ...(reply.getHeaders() as Record<string, string>), "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-transform", "x-accel-buffering": "no" });
    const send = (event: string, data: unknown) => reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    try {
      const result = await this.assistant.chat(user.id, { message: body.message, dest: q.dest, ...(body.conversationId ? { conversationId: body.conversationId } : {}) }, (step) => send("step", step));
      send("done", result);
    } catch (e) {
      const known = e instanceof AppError;
      send("error", { status: known ? e.status : 500, code: known ? e.code : "INTERNAL", detail: known && e.status < 500 ? e.message : known && e.code === "ASSISTANT_UNAVAILABLE" ? e.message : "درخواست انجام نشد؛ دوباره تلاش کنید." });
    } finally {
      reply.raw.end();
    }
  }

  @Get("conversations/:id")
  transcript(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.assistant.transcript(user.id, id);
  }

  /** Human in the loop: the cart changes only here, on the buyer's own click. */
  @Post("proposals/:id/confirm")
  confirm(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.assistant.confirmProposal(user.id, id);
  }
}

@Roles("ADMIN")
@Controller("v1/admin/assistant")
class AdminAssistantController {
  constructor(@Inject(AssistantService) private readonly assistant: AssistantService) {}

  @Get("conversations/:id/audit")
  audit(@Param("id") id: string) {
    return this.assistant.auditTrail(id);
  }
}

/** Shopping assistant: LLM provider, tools, guardrails, audit. Owns the `ai` schema. */
@Module({
  imports: [CatalogModule, CartModule],
  controllers: [AssistantController, AdminAssistantController],
  providers: [AssistantService, { provide: LLM_PROVIDER, inject: [TOKENS.CONFIG], useFactory: (config: ApiConfig) => createLlmProvider(config) }],
  exports: [AssistantService],
})
export class AssistantModule {}
