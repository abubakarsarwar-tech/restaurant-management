/**
 * ── DATABASE SEED ───────────────────────────────────────────────────────────
 * Usage:
 *   pnpm db:seed            # idempotent demo dataset (safe to re-run)
 *   pnpm db:seed --reset    # TRUNCATE everything first, then seed
 *
 * Phases (FK-safe order): system RBAC → tenant & branches → staff →
 * catalog → delivery → coupons → customers → orders/payments → engagement.
 *
 * Idempotency: every row is upserted by a natural key (slug/email/code/…)
 * via `getOrCreate`, so re-running never duplicates.
 *
 * Standalone by design: builds its OWN connection from DATABASE_URL instead
 * of importing @/db/client (which is `server-only` — guards the Next app,
 * unavailable to Node scripts).
 */
import { and, eq, getTableName, sql as dsql, type SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { PgTable } from "drizzle-orm/pg-core";
import postgres from "postgres";
import bcrypt from "bcrypt";

import * as schema from "../schema";
import {
  addonGroups,
  addons,
  auditLogs,
  bannerSlides,
  branchProducts,
  branches,
  businessHours,
  categories,
  couponRedemptions,
  coupons,
  customerAddresses,
  customers,
  deliveryCharges,
  deliveryZones,
  favorites,
  holidayHours,
  ingredients,
  inventoryLevels,
  inventoryMovements,
  loyaltyPointTransactions,
  mediaAssets,
  notifications,
  orders,
  orderItems,
  orderStatusEvents,
  paymentTransactions,
  payments,
  permissions,
  productImages,
  productIngredients,
  products,
  productTags,
  productVariants,
  restaurantSettings,
  restaurants,
  reviews,
  rolePermissions,
  roles,
  tags,
  taxRates,
  userRoles,
  users,
  variantOptions,
} from "../schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set (load .env — see package.json script).");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(sql, { schema });

const DEMO_PASSWORD = "SaffronDemo123!";
const now = Date.now();
const minutesAgo = (m: number) => new Date(now - m * 60_000);
const inDays = (d: number, h = 0, m = 0) =>
  new Date(now + (d * 24 + h) * 3_600_000 + m * 60_000);

// ── helpers ─────────────────────────────────────────────────────────────────
/* eslint-disable @typescript-eslint/no-explicit-any */
// Generic upsert-by-natural-key: returns the existing or newly inserted row.
// Typed loosely on purpose — a seed script shouldn't fight ORM generics.
async function getOrCreate(
  table: PgTable,
  where: SQL | undefined,
  values: Record<string, unknown>,
): Promise<any> {
  const existing = await db
    .select()
    .from(table as any)
    .where(where)
    .limit(1);
  if (existing[0]) return existing[0];
  const inserted = await db
    .insert(table as any)
    .values(values as any)
    .returning();
  return inserted[0];
}
/* eslint-enable @typescript-eslint/no-explicit-any */

async function resetAll() {
  const tables = Object.values(schema).filter((v) => v instanceof PgTable) as PgTable[];
  const names = tables.map((t) => `"${getTableName(t)}"`);
  console.log(`🧨 truncating ${names.length} tables…`);
  await db.execute(
    dsql.raw(`truncate table ${names.join(", ")} restart identity cascade`),
  );
}

// ── phase 1: permissions & system roles ─────────────────────────────────────
const PERMISSIONS = [
  ["catalog:read", "catalog"],
  ["catalog:create", "catalog"],
  ["catalog:update", "catalog"],
  ["catalog:delete", "catalog"],
  ["inventory:manage", "catalog"],
  ["orders:read", "orders"],
  ["orders:update", "orders"],
  ["orders:cancel", "orders"],
  ["customers:read", "customers"],
  ["coupons:manage", "marketing"],
  ["reviews:moderate", "marketing"],
  ["media:manage", "marketing"],
  ["analytics:view", "reports"],
  ["settings:update", "admin"],
  ["staff:manage", "admin"],
] as const;

// ── phase runner ────────────────────────────────────────────────────────────
async function main() {
  if (process.argv.includes("--reset")) await resetAll();
  console.log("🌱 seeding…");

  // 1 ── permissions ─────────────────────────────────────────────────────────
  const permIdByKey = new Map<string, string>();
  for (const [key, group] of PERMISSIONS) {
    const row = await getOrCreate(permissions, eq(permissions.key, key), {
      key,
      group,
      description: `${key.replace(":", " ")}`,
    });
    permIdByKey.set(key, row.id);
  }
  console.log(`✓ permissions (${PERMISSIONS.length})`);

  // 2 ── tenant, branches, settings, hours ───────────────────────────────────
  const restaurant = await getOrCreate(
    restaurants,
    eq(restaurants.slug, "saffron-table"),
    {
      name: "Saffron Table",
      slug: "saffron-table",
      description: "Chef-crafted desi & continental food, delivered hot.",
      email: "hello@saffrontable.example",
      phone: "+1 (555) 123-4567",
    },
  );

  const [mainBranch, uptownBranch] = await Promise.all([
    getOrCreate(
      branches,
      and(eq(branches.restaurantId, restaurant.id), eq(branches.code, "BR-01")),
      {
        restaurantId: restaurant.id,
        name: "Downtown Kitchen",
        code: "BR-01",
        isMain: true,
        addressLine1: "12 Market Street",
        area: "Old Town",
        city: "Foodtown",
        postalCode: "54000",
        latitude: "24.8607000",
        longitude: "67.0011000",
        timezone: "Asia/Karachi",
      },
    ),
    getOrCreate(
      branches,
      and(eq(branches.restaurantId, restaurant.id), eq(branches.code, "BR-02")),
      {
        restaurantId: restaurant.id,
        name: "Uptown Express",
        code: "BR-02",
        addressLine1: "88 Sunset Boulevard",
        area: "Uptown",
        city: "Foodtown",
        postalCode: "54010",
        latitude: "24.9056000",
        longitude: "67.0819000",
        timezone: "Asia/Karachi",
      },
    ),
  ]);

  await getOrCreate(
    restaurantSettings,
    eq(restaurantSettings.restaurantId, restaurant.id),
    {
      restaurantId: restaurant.id,
      tagline: "Chef-crafted food, delivered hot.",
      currency: "USD",
      locale: "en-US",
      timezone: "Asia/Karachi",
      whatsappNumber: "15551234567",
      theme: { primaryColor: "#F26419", radius: "lg" },
      socialLinks: {
        instagram: "https://instagram.com/saffrontable",
        facebook: "https://facebook.com/saffrontable",
      },
      ordering: {
        minOrderCents: 500,
        acceptScheduledOrders: true,
        preparationBufferMinutes: 20,
        loyaltyEarnRateBp: 100, // 1 pt per $1
        loyaltyRedeemValueCents: 5,
      },
    },
  );

  await getOrCreate(
    taxRates,
    and(eq(taxRates.restaurantId, restaurant.id), eq(taxRates.name, "GST")),
    {
      restaurantId: restaurant.id,
      name: "GST",
      rateBp: 600,
      appliesToProducts: true,
    },
  );

  for (const branch of [mainBranch, uptownBranch]) {
    for (let day = 0; day <= 6; day++) {
      await getOrCreate(
        businessHours,
        and(
          eq(businessHours.branchId, branch.id),
          eq(businessHours.dayOfWeek, day),
          eq(businessHours.slot, 1),
        ),
        {
          branchId: branch.id,
          dayOfWeek: day,
          slot: 1,
          openTime: "11:00",
          closeTime: "23:00",
        },
      );
    }
  }
  await getOrCreate(
    holidayHours,
    and(eq(holidayHours.branchId, mainBranch.id), eq(holidayHours.date, "2026-12-25")),
    { branchId: mainBranch.id, date: "2026-12-25", isClosed: true, reason: "Christmas" },
  );
  console.log("✓ tenant + 2 branches + settings + hours");

  // 3 ── roles & staff users ─────────────────────────────────────────────────
  const ownerRole = await getOrCreate(
    roles,
    and(eq(roles.name, "Owner"), eq(roles.isSystem, false)),
    {
      restaurantId: restaurant.id,
      name: "Owner",
      description: "Full access to everything",
    },
  );
  const managerRole = await getOrCreate(
    roles,
    and(eq(roles.name, "Manager"), eq(roles.isSystem, false)),
    {
      restaurantId: restaurant.id,
      name: "Manager",
      description: "Catalog, orders, reviews & reports",
    },
  );
  const kitchenRole = await getOrCreate(
    roles,
    and(eq(roles.name, "Kitchen"), eq(roles.isSystem, false)),
    {
      restaurantId: restaurant.id,
      name: "Kitchen",
      description: "Live order board only",
    },
  );

  const rolePerms: Record<string, string[]> = {
    [ownerRole.id]: [...permIdByKey.keys()],
    [managerRole.id]: [...permIdByKey.keys()].filter((k) => !k.startsWith("staff:")),
    [kitchenRole.id]: ["orders:read", "orders:update", "catalog:read"],
  };
  for (const [roleId, keys] of Object.entries(rolePerms)) {
    for (const key of keys) {
      await db
        .insert(rolePermissions)
        .values({ roleId, permissionId: permIdByKey.get(key)! })
        .onConflictDoNothing();
    }
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const owner = await getOrCreate(users, eq(users.email, "owner@saffrontable.example"), {
    email: "owner@saffrontable.example",
    fullName: "Ayesha Rahman",
    passwordHash,
    status: "ACTIVE",
  });
  const manager = await getOrCreate(
    users,
    eq(users.email, "manager@saffrontable.example"),
    {
      email: "manager@saffrontable.example",
      fullName: "Bilal Khan",
      passwordHash,
      status: "ACTIVE",
    },
  );
  await getOrCreate(users, eq(users.email, "kitchen@saffrontable.example"), {
    email: "kitchen@saffrontable.example",
    fullName: "Chef Imran",
    passwordHash,
    status: "ACTIVE",
  });

  await getOrCreate(
    userRoles,
    and(eq(userRoles.userId, owner.id), eq(userRoles.roleId, ownerRole.id)),
    {
      userId: owner.id,
      roleId: ownerRole.id,
    },
  );
  await getOrCreate(
    userRoles,
    and(eq(userRoles.userId, manager.id), eq(userRoles.roleId, managerRole.id)),
    {
      userId: manager.id,
      roleId: managerRole.id,
      branchId: mainBranch.id,
    },
  );
  console.log(`✓ roles + staff (demo password: ${DEMO_PASSWORD})`);

  // 4 ── catalog ─────────────────────────────────────────────────────────────
  const onion = await getOrCreate(
    ingredients,
    and(eq(ingredients.restaurantId, restaurant.id), eq(ingredients.name, "Onion")),
    { restaurantId: restaurant.id, name: "Onion", unit: "g" },
  );
  const peanutOil = await getOrCreate(
    ingredients,
    and(eq(ingredients.restaurantId, restaurant.id), eq(ingredients.name, "Peanut oil")),
    { restaurantId: restaurant.id, name: "Peanut oil", isAllergen: true, unit: "ml" },
  );
  const gluten = await getOrCreate(
    ingredients,
    and(eq(ingredients.restaurantId, restaurant.id), eq(ingredients.name, "Wheat flour")),
    { restaurantId: restaurant.id, name: "Wheat flour", isAllergen: true, unit: "g" },
  );
  await getOrCreate(
    ingredients,
    and(
      eq(ingredients.restaurantId, restaurant.id),
      eq(ingredients.name, "Basmati rice"),
    ),
    { restaurantId: restaurant.id, name: "Basmati rice", unit: "g" },
  );

  const bestsellerTag = await getOrCreate(
    tags,
    and(eq(tags.restaurantId, restaurant.id), eq(tags.slug, "bestseller")),
    { restaurantId: restaurant.id, name: "Bestseller", slug: "bestseller" },
  );
  const chefsPickTag = await getOrCreate(
    tags,
    and(eq(tags.restaurantId, restaurant.id), eq(tags.slug, "chefs-pick")),
    { restaurantId: restaurant.id, name: "Chef's Pick", slug: "chefs-pick" },
  );

  const catPizza = await getOrCreate(
    categories,
    and(eq(categories.restaurantId, restaurant.id), eq(categories.slug, "pizza")),
    { restaurantId: restaurant.id, name: "Pizza", slug: "pizza", sortOrder: 1 },
  );
  const catBurgers = await getOrCreate(
    categories,
    and(eq(categories.restaurantId, restaurant.id), eq(categories.slug, "burgers")),
    { restaurantId: restaurant.id, name: "Burgers", slug: "burgers", sortOrder: 2 },
  );
  const catDesi = await getOrCreate(
    categories,
    and(eq(categories.restaurantId, restaurant.id), eq(categories.slug, "desi-classics")),
    {
      restaurantId: restaurant.id,
      name: "Desi Classics",
      slug: "desi-classics",
      sortOrder: 3,
    },
  );
  const catDesserts = await getOrCreate(
    categories,
    and(eq(categories.restaurantId, restaurant.id), eq(categories.slug, "desserts")),
    { restaurantId: restaurant.id, name: "Desserts", slug: "desserts", sortOrder: 4 },
  );
  const catDrinks = await getOrCreate(
    categories,
    and(eq(categories.restaurantId, restaurant.id), eq(categories.slug, "drinks")),
    { restaurantId: restaurant.id, name: "Drinks", slug: "drinks", sortOrder: 5 },
  );

  // media helper
  const makeMedia = (publicId: string, alt: string) =>
    getOrCreate(mediaAssets, eq(mediaAssets.publicId, publicId), {
      provider: "cloudinary",
      publicId,
      secureUrl: `https://res.cloudinary.com/demo/image/upload/${publicId}.webp`,
      width: 1200,
      height: 800,
      bytes: 148_000,
      folder: "dishes",
      alt,
    });

  type ProductSpec = {
    slug: string;
    name: string;
    categoryId: string;
    price: number;
    compareAt?: number;
    foodType?: "VEGETARIAN" | "NON_VEGETARIAN" | "VEGAN";
    spicy?: "NONE" | "MILD" | "MEDIUM" | "HOT" | "EXTRA_HOT";
    prep?: number;
    calories?: number;
    featured?: boolean;
    trending?: boolean;
    popular?: boolean;
    trackStock?: boolean;
    availabilityWindow?: [string, string];
    short: string;
    variants?: { name: string; price: number; isDefault?: boolean }[];
    addonGroups?: {
      name: string;
      required?: boolean;
      min?: number;
      max?: number;
      addons: { name: string; price: number }[];
    }[];
  };

  const specs: ProductSpec[] = [
    {
      slug: "chicken-tikka-pizza",
      name: "Chicken Tikka Pizza",
      categoryId: catPizza.id,
      price: 1299,
      compareAt: 1499,
      foodType: "NON_VEGETARIAN",
      spicy: "MEDIUM",
      prep: 25,
      calories: 880,
      popular: true,
      short: "Smoky tikka chunks, mozzarella, desi masala base.",
      variants: [
        { name: 'Medium 10"', price: 1299, isDefault: true },
        { name: 'Large 12"', price: 1699 },
      ],
      addonGroups: [
        {
          name: "Extra Toppings",
          min: 0,
          max: 5,
          addons: [
            { name: "Extra cheese", price: 150 },
            { name: "Chicken tikka", price: 250 },
            { name: "Jalapeños", price: 80 },
            { name: "Olives", price: 80 },
          ],
        },
      ],
    },
    {
      slug: "beef-smash-burger",
      name: "Beef Smash Burger",
      categoryId: catBurgers.id,
      price: 999,
      foodType: "NON_VEGETARIAN",
      prep: 15,
      calories: 720,
      trending: true,
      short: "Double-smashed patty, cheddar, house sauce, brioche.",
      variants: [
        { name: "Single", price: 999, isDefault: true },
        { name: "Double", price: 1299 },
      ],
      addonGroups: [
        {
          name: "Make it a meal",
          max: 1,
          addons: [
            { name: "Fries + Drink", price: 499 },
            { name: "Loaded fries", price: 649 },
          ],
        },
      ],
    },
    {
      slug: "chicken-biryani",
      name: "Chicken Biryani",
      categoryId: catDesi.id,
      price: 950,
      foodType: "NON_VEGETARIAN",
      spicy: "HOT",
      prep: 30,
      calories: 640,
      featured: true,
      popular: true,
      short: "Layered basmati, saffron, raita — the house legend.",
      variants: [
        { name: "Single", price: 950, isDefault: true },
        { name: "Family (serves 4)", price: 3200 },
      ],
      addonGroups: [
        {
          name: "Sides",
          min: 0,
          max: 3,
          addons: [
            { name: "Raita", price: 150 },
            { name: "Green salad", price: 120 },
          ],
        },
      ],
      availabilityWindow: ["12:00", "23:00"],
    },
    {
      slug: "paneer-tikka",
      name: "Paneer Tikka Skewers",
      categoryId: catDesi.id,
      price: 1099,
      foodType: "VEGETARIAN",
      spicy: "HOT",
      prep: 20,
      calories: 430,
      trending: true,
      short: "Charred cottage cheese, peppers, mint chutney.",
    },
    {
      slug: "chocolate-lava-cake",
      name: "Chocolate Lava Cake",
      categoryId: catDesserts.id,
      price: 650,
      foodType: "VEGETARIAN",
      prep: 12,
      calories: 410,
      trackStock: true,
      short: "Molten-center indulgence, baked to order.",
    },
    {
      slug: "mint-margarita",
      name: "Mint Margarita",
      categoryId: catDrinks.id,
      price: 450,
      foodType: "VEGAN",
      calories: 120,
      short: "Fresh mint, lemon, soda — the perfect spicy-food companion.",
    },
  ];

  const productBySlug = new Map<string, { id: string }>();
  for (const spec of specs) {
    const product = await getOrCreate(
      products,
      and(eq(products.restaurantId, restaurant.id), eq(products.slug, spec.slug)),
      {
        restaurantId: restaurant.id,
        categoryId: spec.categoryId,
        name: spec.name,
        slug: spec.slug,
        shortDescription: spec.short,
        description: spec.short,
        sku: `SKU-${spec.slug.toUpperCase().replace(/-/g, "")}`,
        basePriceCents: spec.price,
        compareAtPriceCents: spec.compareAt ?? null,
        foodType: spec.foodType ?? "NON_VEGETARIAN",
        spicyLevel: spec.spicy ?? "NONE",
        prepTimeMinutes: spec.prep ?? 20,
        calories: spec.calories ?? null,
        isFeatured: spec.featured ?? false,
        isTrending: spec.trending ?? false,
        isPopular: spec.popular ?? false,
        trackInventory: spec.trackStock ?? false,
        availableFrom: spec.availabilityWindow?.[0] ?? null,
        availableTo: spec.availabilityWindow?.[1] ?? null,
        seoTitle: `${spec.name} — Saffron Table`,
        seoDescription: spec.short,
      },
    );
    productBySlug.set(spec.slug, product);

    // variants (first = default) + size option rows
    for (const [i, v] of (spec.variants ?? []).entries()) {
      const variant = await getOrCreate(
        productVariants,
        and(eq(productVariants.productId, product.id), eq(productVariants.name, v.name)),
        {
          productId: product.id,
          name: v.name,
          priceCents: v.price,
          isDefault: v.isDefault ?? i === 0,
          sortOrder: i,
        },
      );
      await getOrCreate(
        variantOptions,
        and(eq(variantOptions.variantId, variant.id), eq(variantOptions.group, "Size")),
        {
          variantId: variant.id,
          group: "Size",
          value: v.name.split(" ")[0],
          position: i,
        },
      );
    }

    // add-on structure
    for (const [gi, g] of (spec.addonGroups ?? []).entries()) {
      const group = await getOrCreate(
        addonGroups,
        and(eq(addonGroups.productId, product.id), eq(addonGroups.name, g.name)),
        {
          productId: product.id,
          name: g.name,
          isRequired: g.required ?? false,
          minSelections: g.min ?? 0,
          maxSelections: g.max ?? null,
          sortOrder: gi,
        },
      );
      for (const [ai, a] of g.addons.entries()) {
        await getOrCreate(
          addons,
          and(eq(addons.groupId, group.id), eq(addons.name, a.name)),
          {
            groupId: group.id,
            name: a.name,
            priceCents: a.price,
            sortOrder: ai,
          },
        );
      }
    }

    // image
    const media = await makeMedia(`restaurant/dishes/${spec.slug}`, spec.name);
    await getOrCreate(
      productImages,
      and(eq(productImages.productId, product.id), eq(productImages.mediaId, media.id)),
      { productId: product.id, mediaId: media.id, isPrimary: true },
    );

    // tags
    if (spec.popular) {
      await db
        .insert(productTags)
        .values({ productId: product.id, tagId: bestsellerTag.id })
        .onConflictDoNothing();
    }
    if (spec.featured) {
      await db
        .insert(productTags)
        .values({ productId: product.id, tagId: chefsPickTag.id })
        .onConflictDoNothing();
    }
  }

  // recipe rows (allergen visibility + stock BOM)
  const pizzaId = productBySlug.get("chicken-tikka-pizza")!.id;
  const burgerId = productBySlug.get("beef-smash-burger")!.id;
  await db
    .insert(productIngredients)
    .values([
      {
        productId: pizzaId,
        ingredientId: gluten.id,
        quantity: "180",
        isRemovable: false,
      },
      { productId: pizzaId, ingredientId: onion.id, quantity: "40", isRemovable: true },
      { productId: burgerId, ingredientId: gluten.id, quantity: "70" },
      { productId: burgerId, ingredientId: peanutOil.id, quantity: "10" },
    ])
    .onConflictDoNothing();

  // inventory: lava cake is stock-tracked
  const cakeId = productBySlug.get("chocolate-lava-cake")!.id;
  await getOrCreate(
    inventoryLevels,
    and(
      eq(inventoryLevels.branchId, mainBranch.id),
      eq(inventoryLevels.productId, cakeId),
    ),
    { branchId: mainBranch.id, productId: cakeId, quantity: 24, lowStockThreshold: 30 },
  );
  await db
    .insert(inventoryMovements)
    .values([
      {
        branchId: mainBranch.id,
        productId: cakeId,
        type: "PURCHASE",
        quantityDelta: 30,
        note: "Weekly bake stock",
        createdByUserId: owner.id,
      },
      {
        branchId: mainBranch.id,
        productId: cakeId,
        type: "SALE",
        quantityDelta: -6,
        reference: "POS-1042",
      },
    ])
    .onConflictDoNothing();

  // uptown doesn't carry the lava cake
  await db
    .insert(branchProducts)
    .values({ branchId: uptownBranch.id, productId: cakeId, isAvailable: false })
    .onConflictDoNothing();
  console.log(`✓ catalog (${specs.length} products, variants, add-ons, inventory)`);

  // 5 ── delivery zones & charges ────────────────────────────────────────────
  const downtownZone = await getOrCreate(
    deliveryZones,
    and(eq(deliveryZones.branchId, mainBranch.id), eq(deliveryZones.name, "Downtown")),
    {
      branchId: mainBranch.id,
      name: "Downtown",
      minOrderCents: 500,
      estimatedMinutes: 35,
    },
  );
  for (const [min, fee] of [
    [0, 299],
    [2500, 99],
    [4000, 0],
  ] as const) {
    await getOrCreate(
      deliveryCharges,
      and(
        eq(deliveryCharges.zoneId, downtownZone.id),
        eq(deliveryCharges.minSubtotalCents, min),
      ),
      { zoneId: downtownZone.id, minSubtotalCents: min, feeCents: fee },
    );
  }
  const uptownZone = await getOrCreate(
    deliveryZones,
    and(eq(deliveryZones.branchId, uptownBranch.id), eq(deliveryZones.name, "Uptown")),
    {
      branchId: uptownBranch.id,
      name: "Uptown",
      minOrderCents: 800,
      estimatedMinutes: 45,
    },
  );
  await getOrCreate(
    deliveryCharges,
    and(
      eq(deliveryCharges.zoneId, uptownZone.id),
      eq(deliveryCharges.minSubtotalCents, 0),
    ),
    {
      zoneId: uptownZone.id,
      minSubtotalCents: 0,
      feeCents: 249,
    },
  );
  console.log("✓ delivery zones + tiered charges");

  // 6 ── coupons ─────────────────────────────────────────────────────────────
  const welcome10 = await getOrCreate(
    coupons,
    and(eq(coupons.restaurantId, restaurant.id), eq(coupons.code, "WELCOME10")),
    {
      restaurantId: restaurant.id,
      code: "WELCOME10",
      type: "PERCENTAGE",
      valueBp: 1000,
      maxDiscountCents: 500,
      firstOrderOnly: true,
      endsAt: inDays(90),
    },
  );
  await getOrCreate(
    coupons,
    and(eq(coupons.restaurantId, restaurant.id), eq(coupons.code, "FREESHIP")),
    {
      restaurantId: restaurant.id,
      code: "FREESHIP",
      type: "FREE_DELIVERY",
      minOrderCents: 2500,
      endsAt: inDays(60),
    },
  );
  console.log("✓ coupons (WELCOME10, FREESHIP)");

  // 7 ── customers ───────────────────────────────────────────────────────────
  const customerHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const sara = await getOrCreate(
    customers,
    and(eq(customers.restaurantId, restaurant.id), eq(customers.phone, "+15550100001")),
    {
      restaurantId: restaurant.id,
      fullName: "Sara Ahmed",
      phone: "+15550100001",
      email: "sara@example.com",
      passwordHash: customerHash,
      loyaltyPoints: 27,
      marketingOptIn: true,
      lastOrderAt: minutesAgo(180),
    },
  );
  const guest = await getOrCreate(
    customers,
    and(eq(customers.restaurantId, restaurant.id), eq(customers.phone, "+15550100002")),
    { restaurantId: restaurant.id, fullName: "Hamza (Guest)", phone: "+15550100002" },
  );
  await getOrCreate(
    customerAddresses,
    and(eq(customerAddresses.customerId, sara.id), eq(customerAddresses.label, "Home")),
    {
      customerId: sara.id,
      label: "Home",
      line1: "45 River Avenue, Apt 4B",
      area: "Old Town",
      city: "Foodtown",
      postalCode: "54000",
      latitude: "24.8625000",
      longitude: "67.0090000",
      instructions: "Ring the bell twice",
      isDefault: true,
    },
  );
  console.log("✓ customers (1 registered, 1 guest) + addresses");

  // 8 ── orders (three lifecycles, computed totals satisfy CHECKs) ───────────
  const biryani = await db
    .select()
    .from(products)
    .where(eq(products.slug, "chicken-biryani"))
    .limit(1)
    .then((r) => r[0]);
  const biryaniVariant = await db
    .select()
    .from(productVariants)
    .where(
      and(eq(productVariants.productId, biryani.id), eq(productVariants.name, "Single")),
    )
    .limit(1)
    .then((r) => r[0]);
  const pizza = await db
    .select()
    .from(products)
    .where(eq(products.slug, "chicken-tikka-pizza"))
    .limit(1)
    .then((r) => r[0]);
  const pizzaLarge = await db
    .select()
    .from(productVariants)
    .where(
      and(eq(productVariants.productId, pizza.id), eq(productVariants.name, 'Large 12"')),
    )
    .limit(1)
    .then((r) => r[0]);
  const burger = await db
    .select()
    .from(products)
    .where(eq(products.slug, "beef-smash-burger"))
    .limit(1)
    .then((r) => r[0]);
  const burgerDouble = await db
    .select()
    .from(productVariants)
    .where(
      and(eq(productVariants.productId, burger.id), eq(productVariants.name, "Double")),
    )
    .limit(1)
    .then((r) => r[0]);
  const cake = await db
    .select()
    .from(products)
    .where(eq(products.slug, "chocolate-lava-cake"))
    .limit(1)
    .then((r) => r[0]);
  const margarita = await db
    .select()
    .from(products)
    .where(eq(products.slug, "mint-margarita"))
    .limit(1)
    .then((r) => r[0]);
  const paneer = await db
    .select()
    .from(products)
    .where(eq(products.slug, "paneer-tikka"))
    .limit(1)
    .then((r) => r[0]);

  const GST_BP = 600;
  const taxOf = (base: number) => Math.round((base * GST_BP) / 10_000);

  type Line = {
    productId?: string;
    variantId?: string;
    name: string;
    variant?: string;
    qty: number;
    unit: number;
    addons?: { name: string; priceCents: number; quantity: number }[];
  };
  const compute = (lines: Line[]) => {
    const items = lines.map((l) => {
      const addons = l.addons ?? [];
      const addonsTotal = addons.reduce((s, a) => s + a.priceCents * a.quantity, 0);
      return {
        ...l,
        addons,
        addonsTotalCents: addonsTotal,
        lineTotal: (l.unit + addonsTotal) * l.qty,
      };
    });
    const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
    return { items, subtotal };
  };

  /** A — completed takeaway with WELCOME10, paid online, loyalty + review. */
  const a = compute([
    {
      productId: biryani.id,
      variantId: biryaniVariant.id,
      name: biryani.name,
      variant: "Single",
      qty: 1,
      unit: biryaniVariant.priceCents,
      addons: [{ name: "Raita", priceCents: 150, quantity: 1 }],
    },
    {
      productId: margarita.id,
      name: margarita.name,
      qty: 2,
      unit: margarita.basePriceCents,
    },
  ]);
  const aDiscount = Math.min(Math.round((a.subtotal * 1000) / 10_000), 500); // 10%, cap $5
  const aTax = taxOf(a.subtotal - aDiscount);
  const aTotal = a.subtotal - aDiscount + aTax;

  const orderA = await getOrCreate(
    orders,
    and(
      eq(orders.customerId, sara.id),
      eq(orders.type, "TAKEAWAY"),
      eq(orders.status, "COMPLETED"),
    ),
    {
      restaurantId: restaurant.id,
      branchId: mainBranch.id,
      customerId: sara.id,
      type: "TAKEAWAY",
      status: "COMPLETED",
      paymentStatus: "PAID",
      couponId: welcome10.id,
      couponCode: "WELCOME10",
      subtotalCents: a.subtotal,
      discountCents: aDiscount,
      taxCents: aTax,
      taxBreakdown: [{ name: "GST", rateBp: GST_BP, amountCents: aTax }],
      totalCents: aTotal,
      currency: "USD",
      confirmedAt: minutesAgo(170),
      completedAt: minutesAgo(140),
      paidAt: minutesAgo(172),
      createdAt: minutesAgo(175),
      updatedAt: minutesAgo(140),
    },
  );
  for (const [index, item] of a.items.entries()) {
    await db
      .insert(orderItems)
      .values({
        orderId: orderA.id,
        productId: item.productId,
        variantId: item.variantId,
        productName: item.name,
        variantName: item.variant,
        quantity: item.qty,
        unitPriceCents: item.unit,
        addons: item.addons,
        addonsTotalCents: item.addonsTotalCents,
        lineTotalCents: item.lineTotal,
        specialInstructions: index === 0 ? "Less spicy, please" : null,
      })
      .onConflictDoNothing();
  }

  /** B — dine-in in progress (kitchen is preparing), cash, table T-7. */
  const b = compute([
    {
      productId: burger.id,
      variantId: burgerDouble.id,
      name: burger.name,
      variant: "Double",
      qty: 1,
      unit: burgerDouble.priceCents,
      addons: [{ name: "Fries + Drink", priceCents: 499, quantity: 1 }],
    },
    { productId: cake.id, name: cake.name, qty: 2, unit: cake.basePriceCents },
  ]);
  const bTax = taxOf(b.subtotal);
  const bTotal = b.subtotal + bTax;
  const orderB = await getOrCreate(
    orders,
    and(eq(orders.type, "DINE_IN"), eq(orders.status, "PREPARING")),
    {
      restaurantId: restaurant.id,
      branchId: mainBranch.id,
      customerId: sara.id,
      type: "DINE_IN",
      status: "PREPARING",
      paymentStatus: "UNPAID",
      tableNumber: "T-7",
      subtotalCents: b.subtotal,
      taxCents: bTax,
      taxBreakdown: [{ name: "GST", rateBp: GST_BP, amountCents: bTax }],
      totalCents: bTotal,
      currency: "USD",
      customerNote: "Cake after the mains, not together.",
      confirmedAt: minutesAgo(25),
      createdAt: minutesAgo(30),
      updatedAt: minutesAgo(20),
    },
  );
  for (const item of b.items) {
    await db
      .insert(orderItems)
      .values({
        orderId: orderB.id,
        productId: item.productId,
        variantId: item.variantId,
        productName: item.name,
        variantName: item.variant,
        quantity: item.qty,
        unitPriceCents: item.unit,
        addons: item.addons,
        addonsTotalCents: item.addonsTotalCents,
        lineTotalCents: item.lineTotal,
      })
      .onConflictDoNothing();
  }

  /** C — scheduled delivery (guest) with FREESHIP, online payment pending. */
  const c = compute([
    {
      productId: pizza.id,
      variantId: pizzaLarge.id,
      name: pizza.name,
      variant: 'Large 12"',
      qty: 1,
      unit: pizzaLarge.priceCents,
      addons: [{ name: "Extra cheese", priceCents: 150, quantity: 2 }],
    },
    { productId: paneer.id, name: paneer.name, qty: 1, unit: paneer.basePriceCents },
  ]);
  const freeShip = await db
    .select()
    .from(coupons)
    .where(eq(coupons.code, "FREESHIP"))
    .limit(1)
    .then((r) => r[0]);
  const cFee = 99; // zone tier for subtotal ≥ $25 — waived by FREESHIP
  const cTax = taxOf(c.subtotal);
  const cTotal = c.subtotal - cFee /*coupon*/ + cFee /*fee*/ + cTax;
  const orderC = await getOrCreate(
    orders,
    and(eq(orders.type, "DELIVERY"), eq(orders.status, "PENDING")),
    {
      restaurantId: restaurant.id,
      branchId: mainBranch.id,
      customerId: guest.id,
      type: "DELIVERY",
      status: "PENDING",
      paymentStatus: "PENDING",
      couponId: freeShip.id,
      couponCode: "FREESHIP",
      subtotalCents: c.subtotal,
      discountCents: cFee,
      deliveryFeeCents: cFee,
      taxCents: cTax,
      taxBreakdown: [{ name: "GST", rateBp: GST_BP, amountCents: cTax }],
      totalCents: cTotal,
      currency: "USD",
      deliveryZoneId: downtownZone.id,
      deliveryAddress: {
        line1: "9 Canal View, Floor 2",
        area: "Old Town",
        city: "Foodtown",
        instructions: "Call on arrival",
      },
      deliveryLatitude: "24.8611000",
      deliveryLongitude: "67.0050000",
      scheduledFor: inDays(1, 8, 30),
      createdAt: minutesAgo(10),
      updatedAt: minutesAgo(10),
    },
  );
  for (const item of c.items) {
    await db
      .insert(orderItems)
      .values({
        orderId: orderC.id,
        productId: item.productId,
        variantId: item.variantId,
        productName: item.name,
        variantName: item.variant,
        quantity: item.qty,
        unitPriceCents: item.unit,
        addons: item.addons,
        addonsTotalCents: item.addonsTotalCents,
        lineTotalCents: item.lineTotal,
      })
      .onConflictDoNothing();
  }
  const seededOrders = [orderA, orderB, orderC];

  // status event timelines
  const existingEvents = await db
    .select()
    .from(orderStatusEvents)
    .where(eq(orderStatusEvents.orderId, orderA.id))
    .limit(1);
  if (!existingEvents[0]) {
    await db.insert(orderStatusEvents).values([
      {
        orderId: orderA.id,
        fromStatus: null,
        toStatus: "PENDING",
        createdAt: minutesAgo(175),
      },
      {
        orderId: orderA.id,
        fromStatus: "PENDING",
        toStatus: "CONFIRMED",
        changedByUserId: manager.id,
        createdAt: minutesAgo(170),
      },
      {
        orderId: orderA.id,
        fromStatus: "CONFIRMED",
        toStatus: "PREPARING",
        changedByUserId: manager.id,
        createdAt: minutesAgo(165),
      },
      {
        orderId: orderA.id,
        fromStatus: "PREPARING",
        toStatus: "READY",
        changedByUserId: manager.id,
        createdAt: minutesAgo(150),
      },
      {
        orderId: orderA.id,
        fromStatus: "READY",
        toStatus: "COMPLETED",
        createdAt: minutesAgo(140),
      },
    ]);
  }

  // 9 ── payments & transactions ─────────────────────────────────────────────
  const paymentA = await getOrCreate(payments, eq(payments.orderId, orderA.id), {
    orderId: orderA.id,
    method: "ONLINE",
    provider: "stripe",
    status: "PAID",
    amountCents: aTotal,
    currency: "USD",
    idempotencyKey: "seed-order-a",
    paidAt: minutesAgo(172),
  });
  await db
    .insert(paymentTransactions)
    .values({
      paymentId: paymentA.id,
      type: "CHARGE",
      status: "SUCCESS",
      amountCents: aTotal,
      gatewayReference: "ch_seed_001",
      rawResponse: { brand: "visa", last4: "4242" },
    })
    .onConflictDoNothing();

  await getOrCreate(payments, eq(payments.orderId, orderB.id), {
    orderId: orderB.id,
    method: "CASH",
    provider: "manual",
    status: "PENDING",
    amountCents: bTotal,
    currency: "USD",
  });
  const paymentC = await getOrCreate(payments, eq(payments.orderId, orderC.id), {
    orderId: orderC.id,
    method: "ONLINE",
    provider: "jazzcash",
    status: "PENDING",
    amountCents: cTotal,
    currency: "USD",
    idempotencyKey: "seed-order-c",
  });
  await db
    .insert(paymentTransactions)
    .values({
      paymentId: paymentC.id,
      type: "AUTHORIZATION",
      status: "PENDING",
      amountCents: cTotal,
    })
    .onConflictDoNothing();
  console.log(`✓ orders (${seededOrders.length} lifecycles) + payments`);

  // 10 ── coupon redemption, loyalty, engagement ────────────────────────────
  await db
    .insert(couponRedemptions)
    .values({
      couponId: welcome10.id,
      customerId: sara.id,
      orderId: orderA.id,
      discountCents: aDiscount,
    })
    .onConflictDoNothing();

  await db
    .insert(loyaltyPointTransactions)
    .values({
      customerId: sara.id,
      orderId: orderA.id,
      type: "EARN",
      points: Math.floor(aTotal / 100),
      balanceAfter: 27,
      note: "Earned on completed order",
    })
    .onConflictDoNothing();

  const existingReview = await db
    .select()
    .from(reviews)
    .where(eq(reviews.orderId, orderA.id))
    .limit(1);
  if (!existingReview[0]) {
    await db.insert(reviews).values({
      orderId: orderA.id,
      customerId: sara.id,
      branchId: mainBranch.id,
      productId: biryani.id,
      rating: 5,
      title: "Biryani was phenomenal",
      body: "Layered, fragrant, generous portion. Raita on point.",
      status: "APPROVED",
      replyText: "Shukriya Sara! See you at the next order. 🧡",
      repliedAt: minutesAgo(100),
    });
  }
  await db
    .insert(favorites)
    .values([
      { customerId: sara.id, productId: biryani.id },
      { customerId: sara.id, productId: cake.id },
    ])
    .onConflictDoNothing();

  await db
    .insert(notifications)
    .values([
      {
        restaurantId: restaurant.id,
        customerId: sara.id,
        type: "ORDER_STATUS",
        channel: "IN_APP",
        title: "Order completed",
        body: "Your takeaway order is complete. Enjoy!",
        data: { orderId: orderA.id },
        isRead: true,
      },
      {
        restaurantId: restaurant.id,
        userId: manager.id,
        type: "STOCK_ALERT",
        channel: "IN_APP",
        title: "Low stock: Chocolate Lava Cake",
        body: "24 remaining (threshold 30).",
        data: { productId: cake.id },
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(auditLogs)
    .values([
      {
        restaurantId: restaurant.id,
        actorUserId: owner.id,
        action: "products.update",
        entityType: "product",
        entityId: biryani.id,
        changes: {
          fields: ["basePriceCents"],
          before: { basePriceCents: 899 },
          after: { basePriceCents: 950 },
        },
        ipAddress: "127.0.0.1",
      },
      {
        restaurantId: restaurant.id,
        actorUserId: owner.id,
        action: "roles.grant",
        entityType: "user",
        entityId: manager.id,
        changes: { after: { role: "Manager", branch: "BR-01" } },
      },
    ])
    .onConflictDoNothing();
  console.log("✓ engagement (review, favorites, notifications, audit)");

  // banners
  const biryaniMedia = await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.publicId, "restaurant/dishes/chicken-biryani"))
    .limit(1)
    .then((r) => r[0]);
  await getOrCreate(
    bannerSlides,
    and(
      eq(bannerSlides.restaurantId, restaurant.id),
      eq(bannerSlides.title, "Biryani Nights"),
    ),
    {
      restaurantId: restaurant.id,
      title: "Biryani Nights",
      subtitle: "Order the family pack — dinner sorted for four.",
      imageMediaId: biryaniMedia.id,
      ctaLabel: "Order now",
      linkedProductId: biryani.id,
      sortOrder: 1,
    },
  );
  await getOrCreate(
    bannerSlides,
    and(
      eq(bannerSlides.restaurantId, restaurant.id),
      eq(bannerSlides.title, "Free Delivery over $25"),
    ),
    {
      restaurantId: restaurant.id,
      title: "Free Delivery over $25",
      subtitle: "Use code FREESHIP at checkout.",
      imageMediaId: biryaniMedia.id,
      ctaLabel: "Browse menu",
      ctaUrl: "/menu",
      sortOrder: 2,
    },
  );
  console.log("✓ banner slides");
  console.log("🌱 seed complete.");
}

main()
  .catch((err) => {
    console.error("❌ seed failed:", err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
