import "server-only";

import { asc } from "drizzle-orm";

import { db } from "@/db";
import { restaurants } from "@/db/schema";

/**
 * Tenant resolution.
 *
 * Today: single-storefront deployment → "the restaurant" is the first active
 * tenant. Tomorrow: subdomain/slug-based resolution (saffron.example.com)
 * replaces this one function — the rest of the app never changes because it
 * consumes the resolved restaurant, never the lookup rule.
 */
export async function resolveStorefrontRestaurant() {
  const rows = await db
    .select({
      id: restaurants.id,
      name: restaurants.name,
      slug: restaurants.slug,
    })
    .from(restaurants)
    .orderBy(asc(restaurants.createdAt))
    .limit(1);

  return rows[0] ?? null;
}
