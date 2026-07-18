/**
 * Site-wide metadata & brand constants.
 * Editable marketing copy lives here, not scattered through components.
 */
export const siteConfig = {
  name: "Saffron Table",
  legalName: "Saffron Table Restaurant Group",
  tagline: "Chef-crafted food, delivered hot.",
  description:
    "Order your favorite dishes online — fresh ingredients, prepared with love, delivered fast. Browse the menu, customize your meal and track your order in real time.",
  keywords: ["restaurant", "food delivery", "online ordering", "takeaway", "menu"],
  links: {
    instagram: "https://instagram.com",
    facebook: "https://facebook.com",
    x: "https://x.com",
  },
  contact: {
    email: "hello@saffrontable.example",
    phone: "+1 (555) 123-4567",
    address: "12 Market Street, Foodtown",
  },
  hours: [
    { days: "Monday — Friday", time: "10:00 — 23:00" },
    { days: "Saturday — Sunday", time: "11:00 — 00:00" },
  ],
} as const;

export type SiteConfig = typeof siteConfig;
