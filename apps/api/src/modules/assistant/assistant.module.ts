import { Body, Controller, Get, Inject, Module, Param, Post, Query, Res } from "@nestjs/common";
import { AppError, type AuthUser, CurrentUser, Roles, TOKENS, ZodPipe } from "@nobar/common";
import { CITIES, DEFAULT_CITY_ID } from "@nobar/contracts/cities";
import type { FastifyReply } from "fastify";
import { z } from "zod";
import type { ApiConfig } from "../../config";
import { CartModule } from "../cart/cart.module";
import { CatalogModule } from "../catalog/catalog.module";
import { ReviewModule } from "../review/review.module";
import { AssistantService } from "./assistant.service";
import { CopilotService } from "./copilot.service";
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

const DraftBody = z.object({
  produceTypeId: z.string().trim().min(1).max(60),
  variety: z.string().trim().max(40).optional(),
  grade: z.enum(["PREMIUM", "GRADE_1", "GRADE_2", "PROCESSING"]),
  originCityId: z.string().trim().min(1).max(60),
  isOrganic: z.boolean().default(false),
  harvestedDaysAgo: z.number().int().min(0).max(365).optional(),
  notes: z.string().trim().max(300).optional(),
});
type Draft = z.infer<typeof DraftBody>;

/** Seller copilot: advice only; the seller applies it through the normal seller endpoints. */
@Controller("v1/seller/copilot")
class CopilotController {
  constructor(@Inject(CopilotService) private readonly copilot: CopilotService) {}

  @Get("listings/:id/price")
  price(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.copilot.priceAdvice(user.id, id);
  }

  @Post("listing-draft")
  draft(@CurrentUser() user: AuthUser, @Body(new ZodPipe(DraftBody)) body: Draft) {
    return this.copilot.listingDraft(user.id, {
      produceTypeId: body.produceTypeId,
      grade: body.grade,
      originCityId: body.originCityId,
      isOrganic: body.isOrganic,
      ...(body.variety ? { variety: body.variety } : {}),
      ...(body.harvestedDaysAgo === undefined ? {} : { harvestedDaysAgo: body.harvestedDaysAgo }),
      ...(body.notes ? { notes: body.notes } : {}),
    });
  }

  @Post("reviews/:id/reply-draft")
  reply(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.copilot.reviewReplyDraft(user.id, id);
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
  imports: [CatalogModule, CartModule, ReviewModule],
  controllers: [AssistantController, CopilotController, AdminAssistantController],
  providers: [AssistantService, CopilotService, { provide: LLM_PROVIDER, inject: [TOKENS.CONFIG], useFactory: (config: ApiConfig) => createLlmProvider(config) }],
  exports: [AssistantService],
})
export class AssistantModule {}
