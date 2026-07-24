# Woodland ERP

ERP system ya kitaalamu kwa ajili ya kampuni ya mauzo ya spare parts. Inashughulikia matawi
(branches), wateja, wasambazaji (suppliers), inventory, mauzo (sales) na manunuzi (purchases).

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript (strict mode)
- **Styling:** Tailwind CSS v4
- **Database:** PostgreSQL
- **ORM:** Prisma 7 (driver adapter: `@prisma/adapter-pg`)
- **Auth:** NextAuth.js (itaongezwa katika hatua inayofuata)
- **Validation:** Zod
- **Forms:** React Hook Form

## Muundo wa Folder

```
app/            Next.js App Router — routes na pages
components/     Reusable UI components
lib/            Helpers, Prisma client (lib/db.ts), auth config, validators
prisma/         schema.prisma, migrations, seed.ts
generated/      Prisma Client iliyozalishwa (gitignored, usiihariri)
types/          TypeScript types/interfaces za pamoja
```

## Database Schema

Models: `User`, `Branch`, `Supplier`, `Customer`, `Part`, `Inventory`, `Sale`, `SaleItem`,
`Purchase`, `PurchaseItem`. Angalia [prisma/schema.prisma](prisma/schema.prisma) kwa undani
(relations, indexes, na maamuzi kama `Sale.customerId` kuwa optional kwa ajili ya mauzo ya
walk-in customer).

## Kuanza (Setup)

### 1. Install dependencies

```bash
npm install
```

### 2. Weka database

Kwa development, tumia local Prisma Postgres (hauhitaji kusakinisha PostgreSQL mwenyewe):

```bash
npm run db:dev
```

Amri hii itaacha terminal ikiwa wazi ikiendesha database ya local. Nakili `DATABASE_URL` na
`SHADOW_DATABASE_URL` zinazoonyeshwa kwenye `.env` (au tumia zilizopo tayari kwenye `.env` la
mradi huu — zimewekwa kiotomatiki).

Kama una PostgreSQL yako mwenyewe (local au cloud), weka `DATABASE_URL` yako kwenye `.env`
kwa kufuata mfano ulioko `.env.example`.

### 3. Fanya migration

```bash
npm run db:migrate
```

> **Kumbuka:** Kwenye baadhi ya mazingira, `prisma migrate dev` inaweza kushindwa kuunganisha na
> local Prisma Postgres shadow database (bug inayojulikana kwenye toleo hili la `prisma dev` la
> Windows). Ikitokea hivyo, tumia njia mbadala:
> ```bash
> npx prisma db push        # weka schema kwenye database
> npx prisma migrate resolve --applied <jina_la_migration>
> ```

### 4. Zalisha Prisma Client

```bash
npm run db:generate
```

### 5. Seed data ya majaribio

```bash
npm run db:seed
```

Hii itaunda: tawi moja (Main Branch), admin user (`admin@woodlanderp.com` / `Admin@12345`),
supplier mmoja, customer mmoja, na spare parts 5 za sample zenye inventory.

### 6. Endesha dev server

```bash
npm run dev
```

Fungua [http://localhost:3000](http://localhost:3000).

## Amri Nyingine Muhimu

| Amri | Kazi |
|------|------|
| `npm run db:studio` | Fungua Prisma Studio (GUI ya database) |
| `npm run db:deploy` | Tuma migrations kwenye production (`migrate deploy`) |
| `npm run lint` | Endesha ESLint |
| `npm run build` | Jenga production build |

## Hatua Zinazofuata

1. Authentication (NextAuth.js — credentials provider + roles)
2. UI za msingi: login, dashboard, branch/inventory management
3. Sales & Purchases workflows
