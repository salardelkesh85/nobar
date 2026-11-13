-- نوبر (Nobar) — طرح کامل پایگاه داده (PostgreSQL)
-- این فایل از روی پایگاه داده‌ی ساخته‌شده با مایگریشن‌های برنامه تولید می‌شود (apps/api/test/schema.test.ts).
-- هر ماژول برنامه یک schema جدا دارد و فقط به جدول‌های خودش دست می‌زند؛
-- برای همین ارجاع بین ماژول‌ها (مثلاً user_id در سفارش) شناسه است، نه کلید خارجی.
-- مبلغ‌ها عدد صحیح به ریال و زمان‌ها UTC هستند.

CREATE SCHEMA identity;
CREATE SCHEMA audit;
CREATE SCHEMA catalog;
CREATE SCHEMA ordering;
CREATE SCHEMA payment;
CREATE SCHEMA review;
CREATE SCHEMA notification;
CREATE SCHEMA ai;
CREATE SCHEMA recommendation;

-- ============================================================================
-- public — زیرساخت مشترک: مایگریشن‌ها، صندوق خروجی و ورودی رویدادها، کلیدهای یکتایی درخواست
-- ============================================================================

CREATE TABLE public._migrations (
  name text NOT NULL,
  applied_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT _migrations_pkey PRIMARY KEY (name)
);

CREATE TABLE public.outbox (
  id uuid NOT NULL,
  type text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  published_at timestamp with time zone,
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  CONSTRAINT outbox_pkey PRIMARY KEY (id)
);
CREATE INDEX outbox_unpublished ON public.outbox USING btree (created_at) WHERE (published_at IS NULL);

CREATE TABLE public.inbox (
  event_id uuid NOT NULL,
  consumer text NOT NULL,
  processed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT inbox_pkey PRIMARY KEY (event_id, consumer)
);

CREATE TABLE public.idempotency_keys (
  scope text NOT NULL,
  key text NOT NULL,
  request_hash text NOT NULL,
  status integer NOT NULL DEFAULT 0,
  response jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT idempotency_keys_pkey PRIMARY KEY (scope, key)
);

-- ============================================================================
-- identity — هویت: کاربران، کد ورود، نشست‌ها، نشانی‌ها
-- ============================================================================

CREATE TABLE identity.users (
  id uuid NOT NULL,
  phone text NOT NULL,
  name text,
  roles text[] NOT NULL DEFAULT '{BUYER}'::text[],
  city_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_phone_key UNIQUE (phone)
);

CREATE TABLE identity.otp_challenges (
  phone text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT otp_challenges_pkey PRIMARY KEY (phone)
);

CREATE TABLE identity.refresh_tokens (
  id uuid NOT NULL,
  user_id uuid NOT NULL,
  family_id uuid NOT NULL,
  token_hash text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  revoked_at timestamp with time zone,
  replaced_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT refresh_tokens_token_hash_key UNIQUE (token_hash),
  CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES identity.users(id)
);
CREATE INDEX refresh_tokens_family ON identity.refresh_tokens USING btree (family_id);

CREATE TABLE identity.addresses (
  id uuid NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL,
  city_id text NOT NULL,
  receiver_name text NOT NULL,
  receiver_phone text NOT NULL,
  line text NOT NULL,
  postal_code text NOT NULL DEFAULT ''::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT addresses_pkey PRIMARY KEY (id),
  CONSTRAINT addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES identity.users(id)
);
CREATE INDEX addresses_user ON identity.addresses USING btree (user_id);

-- ============================================================================
-- audit — ممیزی: کارهای کارکنان و سیستم
-- ============================================================================

CREATE TABLE audit.entries (
  id uuid NOT NULL,
  actor_user_id uuid,
  actor_label text NOT NULL,
  action text NOT NULL,
  subject text NOT NULL,
  at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT entries_pkey PRIMARY KEY (id)
);
CREATE INDEX audit_entries_at ON audit.entries USING btree (at DESC);

-- ============================================================================
-- catalog — کاتالوگ: دسته‌ها، انواع محصول، غرفه‌ها، آگهی‌ها، مدارک هویتی، بررسی محتوا
-- ============================================================================

CREATE TABLE catalog.categories (
  id text NOT NULL,
  slug text NOT NULL,
  name text NOT NULL,
  emoji text NOT NULL,
  art text NOT NULL,
  position integer NOT NULL,
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_slug_key UNIQUE (slug)
);

CREATE TABLE catalog.produce_types (
  id text NOT NULL,
  slug text NOT NULL,
  name text NOT NULL,
  category_id text NOT NULL,
  aliases text[] NOT NULL DEFAULT '{}'::text[],
  unit_kind text NOT NULL,
  shelf_life_days integer NOT NULL,
  storage text NOT NULL,
  min_shelf_days_on_arrival integer NOT NULL,
  complaint_window_hours integer NOT NULL,
  months integer[] NOT NULL,
  peak_months integer[] NOT NULL,
  storage_tips text NOT NULL DEFAULT ''::text,
  emoji text NOT NULL,
  hue integer NOT NULL,
  needs_review boolean NOT NULL DEFAULT false,
  position integer NOT NULL,
  CONSTRAINT produce_types_pkey PRIMARY KEY (id),
  CONSTRAINT produce_types_slug_key UNIQUE (slug),
  CONSTRAINT produce_types_category_id_fkey FOREIGN KEY (category_id) REFERENCES catalog.categories(id),
  CONSTRAINT produce_types_min_shelf_days_on_arrival_check CHECK ((min_shelf_days_on_arrival >= 0)),
  CONSTRAINT produce_types_shelf_life_days_check CHECK ((shelf_life_days > 0)),
  CONSTRAINT produce_types_storage_check CHECK ((storage = ANY (ARRAY['AMBIENT'::text, 'COOL'::text, 'COLD'::text]))),
  CONSTRAINT produce_types_unit_kind_check CHECK ((unit_kind = ANY (ARRAY['WEIGHT'::text, 'BUNCH'::text, 'COUNT'::text])))
);

CREATE TABLE catalog.shops (
  id text NOT NULL,
  slug text NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  city_id text NOT NULL,
  owner_name text NOT NULL,
  owner_user_id uuid,
  handling_days integer NOT NULL,
  acceptance_sla_hours integer NOT NULL,
  rating_avg double precision NOT NULL DEFAULT 0,
  rating_count integer NOT NULL DEFAULT 0,
  freshness_rating_avg double precision NOT NULL DEFAULT 0,
  cancellations_90d integer NOT NULL DEFAULT 0,
  joined_year integer NOT NULL,
  status text NOT NULL,
  story jsonb NOT NULL,
  shipping jsonb NOT NULL,
  emoji text NOT NULL,
  hue integer NOT NULL,
  art text NOT NULL,
  position integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  review_note text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT shops_pkey PRIMARY KEY (id),
  CONSTRAINT shops_slug_key UNIQUE (slug),
  CONSTRAINT shops_handling_days_check CHECK ((handling_days >= 0)),
  CONSTRAINT shops_status_check CHECK ((status = ANY (ARRAY['PENDING_REVIEW'::text, 'ACTIVE'::text, 'SUSPENDED'::text, 'REJECTED'::text]))),
  CONSTRAINT shops_type_check CHECK ((type = ANY (ARRAY['GROWER'::text, 'SHOP'::text, 'COOPERATIVE'::text])))
);
CREATE INDEX shops_city ON catalog.shops USING btree (city_id);
CREATE UNIQUE INDEX shops_owner ON catalog.shops USING btree (owner_user_id) WHERE (owner_user_id IS NOT NULL);

CREATE TABLE catalog.listings (
  id text NOT NULL,
  slug text NOT NULL,
  shop_id text NOT NULL,
  produce_type_id text NOT NULL,
  title text NOT NULL,
  variety text,
  description text NOT NULL,
  grade text NOT NULL,
  origin_city_id text NOT NULL,
  is_organic boolean NOT NULL DEFAULT false,
  harvested_at timestamp with time zone NOT NULL,
  stock_base integer NOT NULL,
  packages jsonb NOT NULL,
  is_preorder boolean NOT NULL DEFAULT false,
  preorder_dispatch_from timestamp with time zone,
  published_at timestamp with time zone NOT NULL,
  nobar_until timestamp with time zone,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  status text NOT NULL,
  position integer NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  moderation_note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT listings_pkey PRIMARY KEY (id),
  CONSTRAINT listings_slug_key UNIQUE (slug),
  CONSTRAINT listings_produce_type_id_fkey FOREIGN KEY (produce_type_id) REFERENCES catalog.produce_types(id),
  CONSTRAINT listings_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES catalog.shops(id),
  CONSTRAINT listings_grade_check CHECK ((grade = ANY (ARRAY['PREMIUM'::text, 'GRADE_1'::text, 'GRADE_2'::text, 'PROCESSING'::text]))),
  CONSTRAINT listings_status_check CHECK ((status = ANY (ARRAY['PUBLISHED'::text, 'PAUSED'::text, 'PENDING_REVIEW'::text]))),
  CONSTRAINT listings_stock_base_check CHECK ((stock_base >= 0))
);
CREATE INDEX listings_shop ON catalog.listings USING btree (shop_id);
CREATE INDEX listings_type ON catalog.listings USING btree (produce_type_id);

CREATE TABLE catalog.shop_kyc (
  shop_id text NOT NULL,
  national_id_enc text NOT NULL,
  sheba_enc text NOT NULL,
  national_id_last4 text NOT NULL,
  sheba_last4 text NOT NULL,
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT shop_kyc_pkey PRIMARY KEY (shop_id),
  CONSTRAINT shop_kyc_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES catalog.shops(id) ON DELETE CASCADE
);

CREATE TABLE catalog.moderation_cases (
  id uuid NOT NULL,
  listing_id text NOT NULL,
  rule text NOT NULL,
  excerpt text NOT NULL,
  status text NOT NULL,
  opened_at timestamp with time zone NOT NULL DEFAULT now(),
  closed_at timestamp with time zone,
  CONSTRAINT moderation_cases_pkey PRIMARY KEY (id),
  CONSTRAINT moderation_cases_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES catalog.listings(id) ON DELETE CASCADE,
  CONSTRAINT moderation_cases_status_check CHECK ((status = ANY (ARRAY['OPEN'::text, 'CLOSED'::text])))
);
CREATE INDEX moderation_open ON catalog.moderation_cases USING btree (status, opened_at);

-- ============================================================================
-- ordering — سبد و سفارش: سبد خرید، تسویه، رزرو موجودی، سفارش هر غرفه، شکایت
-- ============================================================================

CREATE TABLE ordering.carts (
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT carts_pkey PRIMARY KEY (user_id)
);

CREATE TABLE ordering.cart_items (
  user_id uuid NOT NULL,
  listing_id text NOT NULL,
  package_id text NOT NULL,
  qty integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cart_items_pkey PRIMARY KEY (user_id, listing_id, package_id),
  CONSTRAINT cart_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES ordering.carts(user_id) ON DELETE CASCADE,
  CONSTRAINT cart_items_qty_check CHECK (((qty > 0) AND (qty <= 100)))
);
CREATE INDEX cart_items_user ON ordering.cart_items USING btree (user_id, updated_at);

CREATE TABLE ordering.checkouts (
  id uuid NOT NULL,
  user_id uuid NOT NULL,
  payment_method text NOT NULL,
  status text NOT NULL,
  address jsonb NOT NULL,
  total_rial bigint NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  response jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  payment_id uuid,
  CONSTRAINT checkouts_pkey PRIMARY KEY (id),
  CONSTRAINT checkouts_payment_method_check CHECK ((payment_method = ANY (ARRAY['GATEWAY'::text, 'COD'::text]))),
  CONSTRAINT checkouts_status_check CHECK ((status = ANY (ARRAY['PENDING_PAYMENT'::text, 'PAID'::text, 'FAILED'::text]))),
  CONSTRAINT checkouts_total_rial_check CHECK ((total_rial >= 0))
);
CREATE INDEX checkouts_user ON ordering.checkouts USING btree (user_id, created_at DESC);

CREATE TABLE ordering.orders (
  id uuid NOT NULL,
  checkout_id uuid NOT NULL,
  user_id uuid NOT NULL,
  shop_id text NOT NULL,
  status text NOT NULL,
  payment_method text NOT NULL,
  address jsonb NOT NULL,
  items_total_rial bigint NOT NULL,
  delivery_fee_rial bigint NOT NULL,
  total_rial bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  code text NOT NULL,
  shipping_method text,
  eta_to timestamp with time zone,
  commission_bps integer,
  commission_rial bigint,
  complaint_window_hours integer,
  accept_deadline timestamp with time zone,
  tracking_code text,
  shipped_at timestamp with time zone,
  delivered_at timestamp with time zone,
  complaint_ends_at timestamp with time zone,
  refunded_rial bigint NOT NULL DEFAULT 0,
  cancel_reason text,
  version integer NOT NULL DEFAULT 0,
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_checkout_id_fkey FOREIGN KEY (checkout_id) REFERENCES ordering.checkouts(id) ON DELETE CASCADE,
  CONSTRAINT orders_payment_method_check CHECK ((payment_method = ANY (ARRAY['GATEWAY'::text, 'COD'::text]))),
  CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['PENDING_PAYMENT'::text, 'AWAITING_ACCEPTANCE'::text, 'ACCEPTED'::text, 'SHIPPED'::text, 'DELIVERED'::text, 'DISPUTED'::text, 'COMPLETED'::text, 'REJECTED'::text, 'EXPIRED'::text, 'CANCELLED'::text, 'REFUNDED'::text])))
);
CREATE INDEX orders_user ON ordering.orders USING btree (user_id, created_at DESC);
CREATE INDEX orders_checkout ON ordering.orders USING btree (checkout_id);
CREATE UNIQUE INDEX orders_code ON ordering.orders USING btree (code);
CREATE INDEX orders_shop ON ordering.orders USING btree (shop_id, created_at DESC);
CREATE INDEX orders_due ON ordering.orders USING btree (status, accept_deadline, complaint_ends_at);

CREATE TABLE ordering.order_items (
  id uuid NOT NULL,
  order_id uuid NOT NULL,
  listing_id text NOT NULL,
  package_id text NOT NULL,
  name_snapshot text NOT NULL,
  package_label_snapshot text NOT NULL,
  qty integer NOT NULL,
  unit_price_rial bigint NOT NULL,
  line_total_rial bigint NOT NULL,
  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES ordering.orders(id) ON DELETE CASCADE,
  CONSTRAINT order_items_qty_check CHECK ((qty > 0))
);

CREATE TABLE ordering.stock_reservations (
  id uuid NOT NULL,
  checkout_id uuid NOT NULL,
  listing_id text NOT NULL,
  package_id text NOT NULL,
  quantity_base integer NOT NULL,
  qty_packages integer NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  released_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT stock_reservations_pkey PRIMARY KEY (id),
  CONSTRAINT stock_reservations_checkout_id_fkey FOREIGN KEY (checkout_id) REFERENCES ordering.checkouts(id) ON DELETE CASCADE,
  CONSTRAINT stock_reservations_qty_packages_check CHECK ((qty_packages > 0)),
  CONSTRAINT stock_reservations_quantity_base_check CHECK ((quantity_base > 0))
);
CREATE INDEX stock_reservations_active ON ordering.stock_reservations USING btree (listing_id, expires_at) WHERE (released_at IS NULL);
CREATE INDEX stock_reservations_checkout ON ordering.stock_reservations USING btree (checkout_id);

CREATE TABLE ordering.order_events (
  id uuid NOT NULL,
  order_id uuid NOT NULL,
  status text NOT NULL,
  actor text NOT NULL,
  note text,
  at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT order_events_pkey PRIMARY KEY (id),
  CONSTRAINT order_events_order_id_fkey FOREIGN KEY (order_id) REFERENCES ordering.orders(id) ON DELETE CASCADE,
  CONSTRAINT order_events_actor_check CHECK ((actor = ANY (ARRAY['BUYER'::text, 'SELLER'::text, 'ADMIN'::text, 'SYSTEM'::text])))
);
CREATE INDEX order_events_order ON ordering.order_events USING btree (order_id, at);

CREATE TABLE ordering.disputes (
  id uuid NOT NULL,
  order_id uuid NOT NULL,
  reason text NOT NULL,
  description text NOT NULL,
  requested text NOT NULL,
  requested_rial bigint NOT NULL,
  status text NOT NULL,
  seller_response text,
  seller_offer_rial bigint,
  refund_rial bigint,
  resolution_note text,
  opened_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone,
  CONSTRAINT disputes_pkey PRIMARY KEY (id),
  CONSTRAINT disputes_order_id_key UNIQUE (order_id),
  CONSTRAINT disputes_order_id_fkey FOREIGN KEY (order_id) REFERENCES ordering.orders(id) ON DELETE CASCADE,
  CONSTRAINT disputes_reason_check CHECK ((reason = ANY (ARRAY['SPOILED'::text, 'DAMAGED'::text, 'UNDERWEIGHT'::text, 'WRONG_ITEM'::text, 'NOT_DELIVERED'::text, 'OTHER'::text]))),
  CONSTRAINT disputes_requested_check CHECK ((requested = ANY (ARRAY['FULL_REFUND'::text, 'PARTIAL_REFUND'::text]))),
  CONSTRAINT disputes_requested_rial_check CHECK ((requested_rial > 0)),
  CONSTRAINT disputes_status_check CHECK ((status = ANY (ARRAY['AWAITING_SELLER'::text, 'AWAITING_STAFF'::text, 'RESOLVED'::text, 'REJECTED'::text])))
);

-- ============================================================================
-- payment — پرداخت: پرداخت‌ها، دفتر حسابداری دوطرفه، کمیسیون، تسویه با غرفه‌ها
-- ============================================================================

CREATE TABLE payment.payments (
  id uuid NOT NULL,
  checkout_id uuid NOT NULL,
  user_id uuid NOT NULL,
  amount_rial bigint NOT NULL,
  provider text NOT NULL,
  authority text NOT NULL,
  status text NOT NULL,
  ref_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_authority_key UNIQUE (authority),
  CONSTRAINT payments_amount_rial_check CHECK ((amount_rial > 0)),
  CONSTRAINT payments_status_check CHECK ((status = ANY (ARRAY['INITIATED'::text, 'SUCCEEDED'::text, 'FAILED'::text])))
);
CREATE INDEX payments_checkout ON payment.payments USING btree (checkout_id);
CREATE UNIQUE INDEX payments_checkout_paid ON payment.payments USING btree (checkout_id) WHERE (status = 'SUCCEEDED'::text);

CREATE TABLE payment.ledger_entries (
  id uuid NOT NULL,
  txn_id uuid NOT NULL,
  account text NOT NULL,
  direction character(1) NOT NULL,
  amount_rial bigint NOT NULL,
  memo text NOT NULL,
  ref text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ledger_entries_pkey PRIMARY KEY (id),
  CONSTRAINT ledger_entries_amount_rial_check CHECK ((amount_rial > 0)),
  CONSTRAINT ledger_entries_direction_check CHECK ((direction = ANY (ARRAY['D'::bpchar, 'C'::bpchar])))
);
CREATE INDEX ledger_account ON payment.ledger_entries USING btree (account, created_at);
CREATE INDEX ledger_txn ON payment.ledger_entries USING btree (txn_id);

CREATE TABLE payment.commission_rules (
  id uuid NOT NULL,
  scope text NOT NULL,
  scope_id text,
  rate_bps integer NOT NULL,
  label text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT commission_rules_pkey PRIMARY KEY (id),
  CONSTRAINT commission_rules_rate_bps_check CHECK (((rate_bps >= 0) AND (rate_bps <= 10000))),
  CONSTRAINT commission_rules_scope_check CHECK ((scope = ANY (ARRAY['GLOBAL'::text, 'CATEGORY'::text, 'SHOP'::text])))
);
CREATE UNIQUE INDEX commission_rules_scope ON payment.commission_rules USING btree (scope, COALESCE(scope_id, ''::text));

CREATE TABLE payment.payouts (
  id uuid NOT NULL,
  shop_id text NOT NULL,
  amount_rial bigint NOT NULL,
  status text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  paid_at timestamp with time zone,
  CONSTRAINT payouts_pkey PRIMARY KEY (id),
  CONSTRAINT payouts_amount_rial_check CHECK ((amount_rial > 0)),
  CONSTRAINT payouts_status_check CHECK ((status = ANY (ARRAY['SCHEDULED'::text, 'PAID'::text, 'FAILED'::text])))
);
CREATE INDEX payouts_shop ON payment.payouts USING btree (shop_id, created_at DESC);

-- ============================================================================
-- review — نظر و پرسش: نظر خریداران و پرسش‌های محصول
-- ============================================================================

CREATE TABLE review.reviews (
  id text NOT NULL,
  listing_id text NOT NULL,
  shop_id text NOT NULL,
  order_id uuid,
  user_id uuid,
  buyer_name text NOT NULL,
  buyer_city text NOT NULL,
  rating integer NOT NULL,
  freshness_rating integer NOT NULL,
  text text NOT NULL,
  status text NOT NULL,
  flags text[] NOT NULL DEFAULT '{}'::text[],
  seller_reply text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  published_at timestamp with time zone,
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_freshness_rating_check CHECK (((freshness_rating >= 1) AND (freshness_rating <= 5))),
  CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5))),
  CONSTRAINT reviews_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'PUBLISHED'::text, 'REJECTED'::text])))
);
CREATE UNIQUE INDEX reviews_order_listing ON review.reviews USING btree (order_id, listing_id) WHERE (order_id IS NOT NULL);
CREATE INDEX reviews_listing ON review.reviews USING btree (listing_id, status, created_at DESC);
CREATE INDEX reviews_shop ON review.reviews USING btree (shop_id, created_at DESC);

CREATE TABLE review.questions (
  id uuid NOT NULL,
  listing_id text NOT NULL,
  shop_id text NOT NULL,
  user_id uuid NOT NULL,
  question text NOT NULL,
  answer text,
  status text NOT NULL,
  flags text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  answered_at timestamp with time zone,
  CONSTRAINT questions_pkey PRIMARY KEY (id),
  CONSTRAINT questions_status_check CHECK ((status = ANY (ARRAY['OPEN'::text, 'ANSWERED'::text, 'HIDDEN'::text])))
);
CREATE INDEX questions_listing ON review.questions USING btree (listing_id, status, created_at DESC);
CREATE INDEX questions_shop ON review.questions USING btree (shop_id, status, created_at DESC);

-- ============================================================================
-- notification — اعلان: اعلان‌های درون‌برنامه
-- ============================================================================

CREATE TABLE notification.notifications (
  id uuid NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  link text,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id)
);
CREATE INDEX notifications_user ON notification.notifications USING btree (user_id, created_at DESC);

-- ============================================================================
-- ai — دستیار خرید: گفت‌وگوها، پیام‌ها، سبدهای پیشنهادی، گزارش ممیزی فراخوانی مدل و ابزارها
-- ============================================================================

CREATE TABLE ai.conversations (
  id uuid NOT NULL,
  user_id uuid NOT NULL,
  dest_city_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT conversations_pkey PRIMARY KEY (id)
);
CREATE INDEX conversations_user ON ai.conversations USING btree (user_id, updated_at DESC);

CREATE TABLE ai.messages (
  id uuid NOT NULL,
  conversation_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES ai.conversations(id) ON DELETE CASCADE,
  CONSTRAINT messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text])))
);
CREATE INDEX messages_conversation ON ai.messages USING btree (conversation_id, created_at, id);
CREATE INDEX messages_user_day ON ai.messages USING btree (user_id, created_at) WHERE (role = 'user'::text);

CREATE TABLE ai.proposals (
  id uuid NOT NULL,
  conversation_id uuid NOT NULL,
  user_id uuid NOT NULL,
  dest_city_id text NOT NULL,
  summary text NOT NULL,
  items jsonb NOT NULL,
  items_rial bigint NOT NULL,
  shipping_rial bigint NOT NULL,
  status text NOT NULL DEFAULT 'PROPOSED'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  confirmed_at timestamp with time zone,
  CONSTRAINT proposals_pkey PRIMARY KEY (id),
  CONSTRAINT proposals_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES ai.conversations(id) ON DELETE CASCADE,
  CONSTRAINT proposals_items_rial_check CHECK ((items_rial >= 0)),
  CONSTRAINT proposals_shipping_rial_check CHECK ((shipping_rial >= 0)),
  CONSTRAINT proposals_status_check CHECK ((status = ANY (ARRAY['PROPOSED'::text, 'CONFIRMED'::text])))
);

CREATE TABLE ai.ai_audit_log (
  id uuid NOT NULL,
  conversation_id uuid NOT NULL,
  user_id uuid NOT NULL,
  kind text NOT NULL,
  name text NOT NULL,
  input jsonb NOT NULL,
  output jsonb NOT NULL,
  ok boolean NOT NULL,
  duration_ms integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ai_audit_log_pkey PRIMARY KEY (id),
  CONSTRAINT ai_audit_log_kind_check CHECK ((kind = ANY (ARRAY['LLM'::text, 'TOOL'::text, 'GUARD'::text])))
);
CREATE INDEX ai_audit_conversation ON ai.ai_audit_log USING btree (conversation_id, created_at, id);
CREATE INDEX ai_audit_user ON ai.ai_audit_log USING btree (user_id, created_at DESC);

-- ============================================================================
-- recommendation — پیشنهاد محصول: خریدهای ثبت‌شده از رویداد سفارش‌ها
-- ============================================================================

CREATE TABLE recommendation.purchases (
  order_id uuid NOT NULL,
  listing_id text NOT NULL,
  checkout_id uuid NOT NULL,
  user_id uuid NOT NULL,
  qty integer NOT NULL,
  purchased_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT purchases_pkey PRIMARY KEY (order_id, listing_id),
  CONSTRAINT purchases_qty_check CHECK ((qty > 0))
);
CREATE INDEX purchases_listing ON recommendation.purchases USING btree (listing_id, purchased_at DESC);
CREATE INDEX purchases_checkout ON recommendation.purchases USING btree (checkout_id);
CREATE INDEX purchases_user ON recommendation.purchases USING btree (user_id, purchased_at DESC);
