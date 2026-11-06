import { Inject, Injectable } from "@nestjs/common";
import { type Database, iso, type Sql, TOKENS } from "@nobar/common";
import { uuidv7 } from "@nobar/contracts";

export interface Actor {
  userId: string | null;
  /** shown in the admin panel, e.g. "پشتیبانی" or "سیستم" */
  label: string;
}

export const SYSTEM: Actor = { userId: null, label: "سیستم" };

/** Who did what to which subject; written in the same transaction as the change. Owns the `audit` schema. */
@Injectable()
export class AuditService {
  constructor(@Inject(TOKENS.DB) private readonly db: Database) {}

  async record(sql: Sql, actor: Actor, action: string, subject: string): Promise<void> {
    await sql.query("insert into audit.entries (id, actor_user_id, actor_label, action, subject) values ($1, $2, $3, $4, $5)", [uuidv7(), actor.userId, actor.label, action, subject]);
  }

  async recent(limit = 100) {
    const rows = await this.db.query<{ id: string; actor_label: string; action: string; subject: string; at: Date }>(
      "select id, actor_label, action, subject, at from audit.entries order by at desc, id desc limit $1",
      [limit],
    );
    return rows.map((r) => ({ id: r.id, actor: r.actor_label, action: r.action, subject: r.subject, at: iso(r.at) }));
  }
}
