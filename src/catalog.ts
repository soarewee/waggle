// Demo catalog: the store Waggle stands in for during the demo. Brands are made up; every purchase is processed by the
// sandbox merchant account. Sellers' campaigns are not here: they come from campaigns.json.

import type { Product } from "./types.ts";

export const products: Product[] = [
  {
    id: "tent-trailhead-2",
    title: "Trailhead 2-person tent",
    brand: "Acme Outdoor",
    category: "outdoor",
    tags: ["tent", "camping", "backpacking", "2-person"],
    price: "79.00",
    rating: 4.5,
    summary: "Freestanding dome, 2.1 kg, sets up in 5 minutes, full rainfly.",
  },
  {
    id: "tent-ridgeline-2",
    title: "Ridgeline 2P backpacking tent",
    brand: "Northpine",
    category: "outdoor",
    tags: ["tent", "camping", "backpacking", "2-person", "ultralight"],
    price: "74.00",
    rating: 4.3,
    summary: "Trekking-pole tent, 1.4 kg, single door, needs stakes on hard ground.",
  },
  {
    id: "tent-summit-3",
    title: "Summit 3-person dome tent",
    brand: "Summit & Co",
    category: "outdoor",
    tags: ["tent", "camping", "family", "3-person"],
    price: "95.00",
    rating: 4.6,
    summary: "Roomy family dome, 3.4 kg, two doors and vestibules.",
  },
  {
    id: "headphones-quietwave",
    title: "Quietwave noise-cancelling headphones",
    brand: "Quietwave",
    category: "electronics",
    tags: ["headphones", "noise-cancelling", "bluetooth", "travel"],
    price: "129.00",
    rating: 4.4,
    summary: "Over-ear ANC, 35 h battery, folds flat.",
  },
  {
    id: "earbuds-soundloop",
    title: "Soundloop wireless earbuds",
    brand: "Soundloop",
    category: "electronics",
    tags: ["earbuds", "bluetooth", "workout"],
    price: "59.00",
    rating: 4.1,
    summary: "Sweat-resistant, 8 h battery, case charges over USB-C.",
  },
  {
    id: "grinder-lumen",
    title: "Lumen burr coffee grinder",
    brand: "Lumen",
    category: "kitchen",
    tags: ["coffee", "grinder", "espresso"],
    price: "89.00",
    rating: 4.7,
    summary: "Conical steel burrs, 40 grind settings, low retention.",
  },
];

/** Plain keyword match on title, brand, category and tags, ranked by words matched, then rating. */
export function searchProducts(query: string, maxPrice?: number): Product[] {
  const words = query.toLowerCase().split(/[^a-z0-9-]+/).filter((w) => w.length > 1).map((w) => w.replace(/s$/, ""));
  return products
    .map((p) => {
      const haystack = [p.title, p.brand, p.category, ...p.tags].join(" ").toLowerCase();
      return { p, hits: words.filter((w) => haystack.includes(w)).length };
    })
    .filter(({ p, hits }) => hits > 0 && (maxPrice === undefined || Number(p.price) <= maxPrice))
    .sort((a, b) => b.hits - a.hits || b.p.rating - a.p.rating)
    .map(({ p }) => p);
}
