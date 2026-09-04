# PACK

PACK is a playful-editorial Shopify Online Store 2.0 theme for modern pet-care brands.

## Design direction

- Cobalt, tomato, butter, bubblegum and pistachio color system
- Oversized editorial typography
- Product-led modular layouts
- Pet personality navigation
- Quiz, bundle, subscription and social-proof sections
- Responsive mobile layouts and reduced-motion support

## Theme structure

The repository root is Shopify-ready and contains only supported theme directories. Connect the `main` branch directly through Shopify's GitHub integration or run it with Shopify CLI.

```sh
shopify theme dev --store your-store.myshopify.com
shopify theme check
```

## Build a Box

The section reads real Shopify products from All products, a merchant-selected collection, or product blocks. Customers choose variants and add the complete box in one request.

For a real box discount:

1. Create a percentage discount code or automatic discount in Shopify Admin → Discounts.
2. Set its eligible products and minimum quantity to match the box rules.
3. In the section, choose the matching discount method and preview percentage.
4. For the code method, enter the exact Shopify discount code.

The code method applies the discount through Shopify's Cart API. Shopify remains the source of truth for eligibility and the final checkout total.

## Pet Finder Quiz

Question blocks define the answer labels and an outcome key for each answer. Result blocks use the same key and can show either a merchant-selected collection or up to three selected products. The quiz totals the answers and renders the matching result with real product links and quick add.

Example outcome keys: `active`, `wellness`, and `comfort`.

## Status

Version 1.4.0 adds merchant-configured, real-cart box discounts and outcome-based product recommendations to the complete storefront system.
