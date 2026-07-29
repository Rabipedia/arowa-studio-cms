# Arowa Studio — Backend

Strapi 5 CMS powering [Arowa Studio](https://arowastudio.com), a production
e-commerce platform.

**Frontend repo:** [arowa-studio-web](https://github.com/Rabipedia/arowa-studio-web)
(full architecture, engineering decisions, and feature list documented there)

## What lives here

- Catalog schema: products, variants, attributes, categories
- Custom checkout API: quote calculation, transactional order placement,
  Stripe PaymentIntent creation, webhook-driven fulfilment
- Order/OrderItem with immutable price snapshots
- Guest order lookup via capability tokens
- Lifecycle hooks for cached price aggregation

## Stack

Strapi 5 · PostgreSQL · Stripe Node SDK · Cloudinary · Docker (local dev)

## Local development

Requires Docker Desktop and Node.js 22+.

\`\`\`bash
git clone https://github.com/Rabipedia/arowa-studio-cms.git
cd arowa-studio-cms
npm install
docker compose up -d
cp .env.example .env   # then fill in the values
npm run develop
\`\`\`

Admin panel: http://localhost:1337/admin

## License

Proprietary. All rights reserved.