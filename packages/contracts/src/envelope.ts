import { uuidv7 } from "./ids";
import type { EventMap, EventType } from "./events";

/**
 * CloudEvents 1.0 compatible envelope (see docs/architecture.md §5.1).
 * `id` is the dedup key, `subject` the aggregate id (ordering key), `nobarcityid` the city for routing.
 */
export interface EventEnvelope<T extends EventType = EventType> {
  specversion: "1.0";
  id: string;
  type: T;
  dataschema: string;
  source: string;
  subject: string;
  time: string;
  nobarcityid?: string;
  traceparent?: string;
  data: EventMap[T];
}

export const EVENT_VERSION = 1;

/** Bus subject/topic for an event type: `nobar.order.placed.v1`. */
export const eventSubject = (type: EventType, version = EVENT_VERSION): string => `nobar.${type}.v${version}`;

export function makeEvent<T extends EventType>(
  type: T,
  args: { source: string; subject: string; data: EventMap[T]; cityId?: string; traceparent?: string },
): EventEnvelope<T> {
  return {
    specversion: "1.0",
    id: uuidv7(),
    type,
    dataschema: `nobar/${type}/v${EVENT_VERSION}`,
    source: args.source,
    subject: args.subject,
    time: new Date().toISOString(),
    ...(args.cityId ? { nobarcityid: args.cityId } : {}),
    ...(args.traceparent ? { traceparent: args.traceparent } : {}),
    data: args.data,
  };
}
