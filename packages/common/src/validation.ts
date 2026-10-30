import type { PipeTransform } from "@nestjs/common";
import type { z } from "zod";

/** Validates and transforms a request part with a zod schema: `@Body(new ZodPipe(Schema)) body`. */
export class ZodPipe<S extends z.ZodType> implements PipeTransform<unknown, z.infer<S>> {
  constructor(private readonly schema: S) {}
  transform(value: unknown): z.infer<S> {
    return this.schema.parse(value ?? {});
  }
}
