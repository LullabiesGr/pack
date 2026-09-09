# PACK

PACK is a playful-editorial Shopify Online Store 2.0 theme for modern pet-care brands.

## Design direction

- Cobalt, tomato, butter, bubblegum and pistachio color system
- Oversized editorial typography
- Product-led modular layouts
- Pet personality navigation
- Quiz, bundle, subscription and social-proof sections
- Responsive mobile layouts and reduced-motion support
- Optional transparent custom animal artwork for the perched header pet
- Reusable floating pet section with per-instance images, coordinates and motion

## Theme structure

The repository root is Shopify-ready and contains only supported theme directories. Connect the `main` branch directly through Shopify's GitHub integration or run it with Shopify CLI.

The `main` branch is the canonical, portable theme source. Demo-store media remains configured inside Shopify and must not be committed as store-specific defaults. Payment icons are rendered only from `shop.enabled_payment_types`.

```sh
shopify theme dev --store your-store.myshopify.com
shopify theme check
```

## Build a Box

The section reads real Shopify products from All products, a merchant-selected collection, or product blocks and adds the selected available variants in one request. Products with multiple options link to the full product picker so a buyer never adds an unintended variant.

For a real box discount:

1. Create an automatic percentage discount in Shopify Admin → Discounts.
2. Set its eligible products and minimum quantity to match the box rules.
3. In the section, choose the matching discount method and preview percentage.
4. Shopify applies the discount only when the configured eligibility rules match the selected items.

The theme previews the saving. Shopify remains the source of truth for eligibility and the final cart and checkout totals.

## Pet Finder Quiz

Question blocks define the answer labels and an outcome key for each answer. Result blocks use the same key and can show either a merchant-selected collection or up to three selected products. The quiz totals the answers and renders the matching result with real product links and quick add.

Example outcome keys: `active`, `wellness`, and `comfort`.

## Version 2.0.0

- Block-based product information with high-variant option values, combined-listing refreshes, swatches, rich media, selling plans, accelerated checkout, Shop Pay terms, pickup availability and gift-card recipients
- Native collection and search filtering, sorting, pagination and mixed search result types
- Cart line properties, selling plans, automatic discounts, cart notes, unit/final prices and accelerated checkout
- Complete blog, article comments, contact, password and gift-card templates
- Nested navigation, predictive search, customer accounts, localization, Follow on Shop, payment methods and social links
- Optional cart drawer, recommendations, complementary products, recently viewed products, quiz, box builder and reusable playful visuals
- Responsive images, image focal points, reduced-motion support and mobile navigation focus handling

## Release notes

Version 2.0.0 is the Theme Store readiness release. It removes demo-store product and image references, removes theme-managed discount-code behavior, and adds the native Shopify commerce and template requirements listed above. Merchants must create any advertised automatic box discount in Shopify Admin; the theme never invents checkout savings.

Before submission, validate the installed release on a populated client-transfer store with `shopify theme check`, Shopify's benchmark data, the required browsers, a gift card, a multi-option product, selling plans, pickup locations, filters and test payments.
