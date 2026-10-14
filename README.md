# Cardx

Marketing site for **Cardx** — modern tools for a modern banking experience.

Pages: Home, Products, Solution, Company, Contact Us, Sign Up.

## Structure

```
src/pages/      one HTML file per page
src/partials/   shared head, header, footer, logo, avatars
assets/         CSS, JS and images (copied as-is)
build.mjs       zero-dependency builder -> dist/
```

Pages use small directives that `build.mjs` expands, e.g. `<!-- @header active="products" -->`,
`<!-- @footer -->`, `<!-- @icon globe -->`.

## Develop

```bash
npm run build      # writes dist/
npm run dev        # build + serve dist/ locally
```

## Deploy

Deployed on Vercel. `vercel.json` runs `node build.mjs` and serves `dist/` with clean URLs
(`/products`, `/signup`, …).

The contact and sign-up forms validate client-side only; they are not connected to a backend yet.
