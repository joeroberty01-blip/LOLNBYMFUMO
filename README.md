# Woodland ERP

ERP system ya kitaalamu kwa ajili ya kampuni ya mauzo ya spare parts. Inashughulikia matawi
(branches), wateja, wasambazaji (suppliers), inventory, mauzo (sales) na manunuzi (purchases).

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript (strict mode)
- **Styling:** Tailwind CSS v4
- **Database:** PostgreSQL
- **ORM:** Prisma 7 (driver adapter: `@prisma/adapter-pg`)
- **Auth:** NextAuth.js v5 (Credentials providers mbili: admin-login, sales-login)
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

## Authentication & Roles

Mfumo una roles mbili tu: **ADMIN** na **SALES_STAFF**, kila mmoja na signup/login/dashboard
yake tofauti.

| Route | Maelezo |
|---|---|
| `/signup/admin` | Kuunda admin — **inafanya kazi mara moja tu** (bootstrap). Inahitaji `ADMIN_SIGNUP_SECRET` kutoka `.env`, na inajifunga yenyewe mara admin wa kwanza akishaundwa. |
| `/signup/sales-staff` | Sales staff wanajisajili wenyewe. Akaunti mpya ina `status: PENDING` — haiwezi ku-login mpaka admin ai-approve. |
| `/login/admin` | Login ya admin → inaelekeza `/dashboard/admin`. |
| `/login/sales-staff` | Login ya sales staff → inaelekeza `/dashboard/sales`. Ikiwa `status` si `APPROVED`, inaonyesha ujumbe unaofaa (k.m. "Akaunti yako inasubiri uthibitisho wa admin") badala ya kuruhusu kuingia. |
| `/dashboard/admin/sales-staff` | Admin anaona list ya sales staff wote na anaweza Idhinisha / Kataa (wale PENDING) au Zima Akaunti (wale APPROVED wanaosumbua). |

**Jinsi admin wa kwanza anavyoundwa:**
1. Fungua `/signup/admin` (au bonyeza "Unda admin wa kwanza" kwenye homepage).
2. Jaza jina, barua pepe, nywila, na `ADMIN_SIGNUP_SECRET` (thamani iko kwenye `.env` yako — usiishiriki).
3. Baada ya kuundwa, ukurasa huu unajifunga moja kwa moja (haufanyi kazi tena) — admin wapya
   waongezwe na admin aliyepo kupitia `/dashboard/admin/sales-staff`... kwa sasa admin mmoja
   pekee anaweza kuundwa kwa njia hii; "add admin from dashboard" bado haijajengwa (angalia
   "Hatua Zinazofuata").

**Jinsi sales staff anavyojisajili na kusubiri approval:**
1. `/signup/sales-staff` → jaza fomu → akaunti inaundwa na `status: PENDING`.
2. Akijaribu `/login/sales-staff` kabla ya approval, anapata ujumbe: *"Akaunti yako inasubiri
   uthibitisho wa admin"* — hawezi kuingia.

**Jinsi admin anavyo-approve:**
1. Admin anaingia `/login/admin` → `/dashboard/admin` → "Manage Sales Staff".
2. Kwa kila mtumiaji mwenye status "Inasubiri", bonyeza **Idhinisha** (au **Kataa**).
3. Mara akiidhinishwa, sales staff huyo anaweza ku-login na kufika `/dashboard/sales`.
4. Kwa mtumiaji aliyeidhinishwa lakini anasumbua, bonyeza **Zima Akaunti** — hataweza ku-login
   tena (ujumbe: "Akaunti yako haijaidhinishwa kuingia").

**Usalama uliowekwa:**
- `proxy.ts` (Next.js 16 imebadilisha jina kutoka `middleware.ts`) inazuia `/dashboard/admin/*`
  na `/dashboard/sales/*` kwa role isiyo sahihi, na inathibitisha upya `role`/`status` dhidi ya
  database kwenye kila request ili deactivation ifanye kazi papo hapo (si kusubiri session
  itakapoisha).
- Kila Server Action inayobadilisha data (approve/reject/deactivate) inathibitisha `session.user.role === "ADMIN"` yenyewe pia — proxy haitegemewi kama ulinzi pekee.
- `/signup/admin` inafungwa kiotomatiki mara admin wa kwanza akishaundwa (angalia server component ya ukurasa huo), tena inahitaji `ADMIN_SIGNUP_SECRET` sahihi.

Nenda [lib/auth.ts](lib/auth.ts), [proxy.ts](proxy.ts), na [lib/actions/](lib/actions) kwa undani wa code.

## Hatua Zinazofuata

1. "Add Admin" kutoka dashboard ya admin (badala ya kutegemea `/signup/admin` pekee)
2. Inventory & branch management
3. Sales & Purchases workflows
