import { Controller, Get, Inject, Module, Param, Post } from "@nestjs/common";
import { type AuthUser, CurrentUser } from "@nobar/common";
import { CatalogModule } from "../catalog/catalog.module";
import { NotificationService } from "./notification.service";

@Controller("v1/me/notifications")
class NotificationController {
  constructor(@Inject(NotificationService) private readonly notifications: NotificationService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.notifications.mine(user.id);
  }

  /** `all` marks everything read. */
  @Post(":id/read")
  async read(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    await this.notifications.markRead(user.id, id === "all" ? "all" : id);
    return { ok: true };
  }
}

/** Order notices in the app and by SMS. Owns the `notification` schema. */
@Module({ imports: [CatalogModule], controllers: [NotificationController], providers: [NotificationService], exports: [NotificationService] })
export class NotificationModule {}
