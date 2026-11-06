import { Controller, Get, Global, Inject, Module } from "@nestjs/common";
import { Roles } from "@nobar/common";
import { AuditService } from "./audit.service";

@Roles("ADMIN")
@Controller("v1/admin/audit")
class AuditController {
  constructor(@Inject(AuditService) private readonly audit: AuditService) {}

  @Get()
  list() {
    return this.audit.recent();
  }
}

/** Audit log of staff and system actions. Global so every module can record into it. */
@Global()
@Module({ controllers: [AuditController], providers: [AuditService], exports: [AuditService] })
export class AuditModule {}
