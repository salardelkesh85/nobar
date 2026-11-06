import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { type AuthUser, CurrentUser, Public, Roles, ZodPipe } from "@nobar/common";
import { AnswerSchema, QuestionCreateSchema, ReasonSchema, ReplySchema, ReviewCreateSchema } from "@nobar/contracts";
import type { z } from "zod";
import { ReviewService } from "./review.service";

@Controller("v1")
export class ReviewController {
  constructor(@Inject(ReviewService) private readonly reviews: ReviewService) {}

  @Public()
  @Get("listings/:id/reviews")
  list(@Param("id") id: string) {
    return this.reviews.forListing(id);
  }

  @Public()
  @Get("listings/:id/questions")
  questions(@Param("id") id: string) {
    return this.reviews.questionsFor(id);
  }

  @Post("listings/:id/reviews")
  write(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body(new ZodPipe(ReviewCreateSchema)) body: z.infer<typeof ReviewCreateSchema>) {
    return this.reviews.write(user.id, id, body);
  }

  @Post("listings/:id/questions")
  ask(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body(new ZodPipe(QuestionCreateSchema)) body: z.infer<typeof QuestionCreateSchema>) {
    return this.reviews.ask(user.id, id, body.question);
  }

  @Get("me/questions")
  mine(@CurrentUser() user: AuthUser) {
    return this.reviews.myQuestions(user.id);
  }

  @Get("seller/reviews")
  sellerReviews(@CurrentUser() user: AuthUser) {
    return this.reviews.sellerReviews(user.id);
  }

  @Post("seller/reviews/:id/reply")
  reply(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body(new ZodPipe(ReplySchema)) body: z.infer<typeof ReplySchema>) {
    return this.reviews.reply(user.id, id, body.reply);
  }

  @Get("seller/questions")
  sellerQuestions(@CurrentUser() user: AuthUser) {
    return this.reviews.sellerQuestions(user.id);
  }

  @Post("seller/questions/:id/answer")
  answer(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body(new ZodPipe(AnswerSchema)) body: z.infer<typeof AnswerSchema>) {
    return this.reviews.answer(user.id, id, body.answer);
  }
}

const staff = (user: AuthUser) => ({ userId: user.id, label: "پشتیبانی" });

@Roles("ADMIN")
@Controller("v1/admin")
export class AdminReviewController {
  constructor(@Inject(ReviewService) private readonly reviews: ReviewService) {}

  @Get("reviews")
  pending() {
    return this.reviews.pending();
  }

  @Post("reviews/:id/approve")
  async approve(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    await this.reviews.approve(staff(user), id);
    return { ok: true };
  }

  @Post("reviews/:id/reject")
  async reject(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body(new ZodPipe(ReasonSchema)) body: z.infer<typeof ReasonSchema>) {
    await this.reviews.reject(staff(user), id, body.reason);
    return { ok: true };
  }

  @Post("questions/:id/hide")
  async hide(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    await this.reviews.hideQuestion(staff(user), id);
    return { ok: true };
  }
}
