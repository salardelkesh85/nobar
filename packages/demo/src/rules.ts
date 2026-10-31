// The marketplace rules live in @nobar/domain (shared with the API); here they are bound to the demo data.
import { createMarket } from "@nobar/domain";
import { CATEGORIES, PRODUCE_TYPES } from "./catalog";
import { NOW } from "./clock";
import { LISTINGS } from "./listings";
import { SHOPS } from "./shops";

export {
  COMPARE_BADGE_FA,
  etaPhrase,
  harvestPhrase,
  isOffer,
  METHOD_FA,
  minPricePerKg,
  packageGrams,
  PRESET_FA,
  PRICE_POSITION_FA,
  pricePerKg,
  queryTokens,
  REASON_FA,
  shippingCost,
  SORT_FA,
} from "@nobar/domain";
export type {
  CartLine,
  CompareBadge,
  Comparison,
  DeliveryOption,
  DeliveryQuote,
  Excluded,
  Freshness,
  GroupQuote,
  MarketStat,
  NotDeliverableReason,
  Offer,
  Preset,
  PricePosition,
  SearchHit,
  SearchParams,
  SearchResult,
  SortKey,
} from "@nobar/domain";

export const market = createMarket({ categories: CATEGORIES, types: PRODUCE_TYPES, shops: SHOPS, listings: LISTINGS }, () => NOW);

export const {
  candidatesForType,
  compare,
  currentMonth,
  freshnessOf,
  inSeason,
  isNobar,
  isPeak,
  landedOffer,
  marketStat,
  pricePosition,
  quoteDelivery,
  quoteGroup,
  ratingBayes,
  search,
  suggest,
} = market;
