# LOLNBY MFUMO

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
- **Charts:** Recharts
- **Dates:** date-fns (week starts Monday)
- **PDF export:** @react-pdf/renderer
- **Email:** Nodemailer (SMTP via `.env`)

## Muundo wa Folder

```
app/            Next.js App Router — routes na pages
components/     Reusable UI components
lib/            Prisma client (db.ts), auth config, validators, actions, data (DAL)
  lib/actions/    Server Actions (mutations) — kila moja inathibitisha role yenyewe
  lib/data/       Read queries (DTO pattern) — costPrice haifiki hapa kwa sales-staff queries
  lib/validators/ Zod schemas
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

Hii itaunda: matawi matatu (Main Branch, Woodland, Lolnby), admin user
(`admin@woodlanderp.com` / `Admin@12345`), supplier mmoja, customer mmoja, na spare parts 5 za
sample zenye inventory (Main Branch ina zote 5; Woodland na Lolnby zina baadhi kwa ajili ya
majaribio ya POS).

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

## Parts & Inventory (Phase 3)

| Route | Nani | Maelezo |
|---|---|---|
| `/dashboard/admin/parts` | Admin | List ya parts (search + filter kwa category), row moja kwa kila (part, branch) |
| `/dashboard/admin/parts/new` | Admin | Ongeza part mpya |
| `/dashboard/admin/parts/[id]/edit` | Admin | Hariri part |
| `/dashboard/sales/inventory` | Sales Staff | View-only, **hakuna Buying Price wala vitufe vya Edit/Delete** |

**Jinsi ya kuongeza part mpya:** `/dashboard/admin/parts` → "+ Ongeza Part" → jaza fomu (part
number, jina, category, buying/selling price, low stock threshold, description ya hiari) →
"Ongeza Part". Part mpya haina stock bado, hivyo inaonekana kwenye table na branch "—" na
quantity 0 (imewekwa alama "Low Stock" moja kwa moja).

**Jinsi Edit/Delete zinavyofanya kazi:**
- **Edit** inafungua fomu ile ile yenye data iliyojazwa tayari; kuhifadhi kunasasisha part hiyo
  (na kuzuia part number kugongana na part nyingine).
- **Futa** inaonyesha "Una uhakika unataka kufuta part hii?" — ukikubali, part inawekwa
  `isActive: false` (soft delete) badala ya kufutwa kabisa, ili historia ya mauzo/manunuzi
  isivunjike. Haipotei kwenye database, inapotea tu kwenye orodha (admin na sales staff wote).

**Jinsi table inavyotofautiana kati ya admin na sales staff:** Admin anaona columns 6 (ikiwemo
Buying Price) + Actions (Edit/Rekebisha Stock/Futa). Sales staff anaona columns 5 tu (bila
Buying Price, bila actions). Hii si suala la kuficha UI tu — query ya database
([lib/data/parts.ts](lib/data/parts.ts), `getInventoryForSalesTable`) inatumia Prisma `select`
inayoacha `costPrice` kabisa, hivyo haipo kwenye response inayotumwa kwa browser ya sales staff
(imehakikiwa moja kwa moja kwa kuangalia raw HTML/response body — hakuna `costPrice` wala namba
zake popote).

**Jinsi Stock Adjustment inavyofanya kazi:** Bonyeza "Rekebisha Stock" kwenye row yoyote →
modal inafungua ikiwa na branch (au dropdown ya kuchagua branch kama part haina stock bado),
chagua "Ongeza"/"Punguza", weka kiasi, chagua sababu (New stock/Damaged/Correction/Other) →
"Hifadhi". Hii inaunda rekodi kwenye `StockAdjustment` (audit trail: nani, lini, kiasi gani,
kwa nini) na inasasisha `Inventory.quantity` — vyote viwili kwenye transaction moja. Quantity
haiwezi kushuka chini ya 0 (server inazuia).

**Low Stock indicator:** Row yoyote yenye `quantity < lowStockThreshold` ya part hiyo inapata
badge nyekundu "(Low Stock)". Dashboard ya admin pia ina summary card ya "Low Stock" (idadi ya
rows za namna hiyo) na "Thamani ya Inventory" (jumla ya `quantity × costPrice`).

**Usalama:** Route zote za `/dashboard/admin/parts/*` zililindwa na `proxy.ts` (ADMIN pekee) na
tena kila Server Action (`createPart`, `updatePart`, `deletePart`, `adjustStock`) inathibitisha
`session.user.role === "ADMIN"` yenyewe. Hakuna hard-delete path popote kwenye app.

## Sales / POS (Phase 4)

| Route | Nani | Maelezo |
|---|---|---|
| `/dashboard/sales/pos` | Sales Staff | Point of Sale — lazima achague branch kwanza |
| `/dashboard/sales/history` | Sales Staff | Mauzo yake mwenyewe, filter kwa tarehe/branch/payment |
| `/dashboard/admin/sales` | Admin | Mauzo yote, filter pia kwa sales staff na "Manual Items Only" |
| `/dashboard/admin/sales/manual-items` | Admin | Manual items zilizouzwa, grouped, na "Convert to Official Part" |
| `/dashboard/admin/customers` | Admin | Add/Edit customers na credit limit |

**Inventory ni source of truth pekee:** hakuna namba ya quantity inayohifadhiwa mahali pengine —
kila mauzo, void, au stock adjustment inasoma na kubadilisha `Inventory.quantity` moja kwa moja
ndani ya `prisma.$transaction`.

**POS flow:** Chagua Branch (Woodland/Lolnby/Main Branch) → hakuna cart mpaka hapo. Tafuta part
kwa jina/namba (inventory ya branch hiyo TU) na ubofye kuiongeza kwenye cart (ikiongezwa mara ya
pili, quantity inaongezeka — imezuiwa isizidi iliyopo). Au bonyeza **"+ Manual Item"** kwa bidhaa
isiyo Part rasmi (jina, part number ya hiari, quantity, bei — haihusiani na Inventory kabisa,
inaonekana kwenye cart na risiti na badge ya njano **"Manual"**). Chagua Payment Method na, kama
ni credit, washa **"Is Credit Sale"** na uchague/ongeze Customer — server inazuia kama kiasi
kitazidisha `creditLimit` ya customer huyo (nimejaribu hili moja kwa moja: ujumbe "Kiasi
kinazidi credit limit ya Juma Motors..."). **Complete Sale** inafanya kila kitu kwenye
transaction moja: inasoma tena Inventory (kuzuia race condition), inapunguza stock kwa items za
kawaida (si manual), inaunda Sale + SaleItem(s), na kama ni credit, inaongeza balance ya
customer. Risiti inaonyeshwa mara moja (invoice number, tarehe, branch, muuzaji, items, badge ya
Manual, jumla).

**Void/Cancel Sale:** Sales staff anaweza ku-void mauzo yake mwenyewe ndani ya dakika 30 tangu
kuuza; Admin anaweza wakati wowote. Void inarudisha stock kwenye Inventory (kwa items za kawaida
tu — manual items haziguswi kabisa), inarudisha balance ya customer kama ilikuwa credit sale, na
inaweka `status: VOIDED` (rekodi haifutwi — imehakikiwa: nimejaribu void kwa cash sale na credit
sale, zote mbili zikarudisha stock/balance sahihi).

**Manual Items → Convert to Official Part:** `/dashboard/admin/sales/manual-items` inaonyesha
manual items zilizouzwa (kutoka mauzo ya `COMPLETED` pekee — voided hazihesabiwi), grouped kwa
jina, na idadi ya mara zilizouzwa + bei ya mwisho. **"Convert to Official Part"** inafungua fomu
ya Part ikiwa imejazwa kutoka manual item hiyo (jina, part number, bei) — admin anaweza kuhariri
kabla ya kuthibitisha, kisha anachagua Branch na Initial Quantity. Hii inaunda Part + Inventory +
rekodi ya `StockAdjustment` (reason: NEW_STOCK) kwa audit trail, sambamba na jinsi stock
adjustments za kawaida zinavyofanya kazi. **Mauzo ya nyuma yaliyokuwa manual hayabadiliki** —
bado yanaonekana na badge "Manual" kwenye history; ni mauzo yajayo tu yataona part hii kwenye
POS search ya kawaida (nimethibitisha hili: baada ya conversion, part mpya ilionekana mara moja
kwenye POS search ya Woodland).

**Customers:** Sales staff wanaweza kuongeza customer mpya haraka wakati wa POS (button "+ Mpya"
karibu na customer dropdown) — hii inaweka `creditLimit: 0` kiotomatiki. Kuhariri `creditLimit`
ni kazi ya Admin pekee (`/dashboard/admin/customers`).

**Usalama:** `completeSale`, `voidSale`, `createCustomer`/`updateCustomer`, na
`convertManualItemToPart` zote zinathibitisha role ya session yenyewe (si proxy pekee). Query ya
POS inventory (`lib/data/sales.ts`) haisomi hata `costPrice`.

## Reports & Analytics (Phase 5)

| Route | Nani | Maelezo |
|---|---|---|
| `/dashboard/admin/reports` | Admin | Report ya ledger (grouped by payment method, sales vs expenses, net profit) + viungo vya ripoti nyingine |
| `/dashboard/admin/reports/sales` | Admin | Mwenendo wa mauzo (chart), payment breakdown, credit vs cash |
| `/dashboard/admin/parts?tab=report` | Admin | Top selling, slow-moving, low stock, stock adjustments, value by branch (Inventory Report tab kwenye Parts page) |
| `/dashboard/admin/reports/staff` | Admin | Ranking ya sales staff kwa kipindi |
| `/dashboard/admin/reports/customers` | Admin | Nani ana deni + historia ya credit sales (`/reports/customers/[id]`) |
| `/dashboard/sales/my-performance` | Sales Staff | Ripoti yake binafsi pekee |

**Date filtering:** Kila ripoti ina tabs **Daily / Weekly / Monthly / Annually / Custom**
(`components/reports/ReportControls.tsx`) zinazobadilisha URL query params kupitia
`router.replace` (si `<form method="GET">`) — hii inafanya data ibadilike papo hapo bila full
page reload, ikiendana na ombi la "bila kureload". Wiki inaanza **Jumatatu**
(`date-fns` `weekStartsOn: 1`, angalia [lib/dateRanges.ts](lib/dateRanges.ts)). Chart granularity
inabadilika kiotomatiki: Daily → masaa 24, Weekly → siku 7, Monthly → siku za mwezi, Annually →
miezi 12.

**Export, Print & Share** (`components/reports/ReportActions.tsx`) zipo kwenye ripoti zote 5:
- **Download PDF / Print / Share WhatsApp / Send Email** — zote zinatumia endpoint moja
  (`/api/reports/pdf`) na function moja ya kujenga PDF (`lib/reports/build.ts`) ili kuepuka
  kurudia logic kati ya download na email attachment.
- **Print** inatumia `window.print()` + CSS `@media print { .no-print { display: none } }`
  (angalia [app/globals.css](app/globals.css)) kuficha controls/nav wakati wa kuchapisha —
  nimehakikisha class hii ipo kwenye page zote za ripoti.
- **Share WhatsApp**: inapakua PDF kwanza kiotomatiki kisha inafungua `wa.me` na ujumbe tayari,
  na kuonyesha note "PDF imepakuliwa, WhatsApp imefunguliwa — ambatanisha faili hiyo."
- **Send Email** inatumia Nodemailer na `.env` (`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`,
  `EMAIL_PASS`). Bila hizo kuwekwa, action inarudisha ujumbe wazi wa hitilafu badala ya
  kushindwa kimya kimya — nimejaribu hili moja kwa moja (SMTP haijawekwa kwenye mradi huu bado).
- **Export CSV** (Sales Report pekee, kama ilivyoombwa) — `/api/reports/sales-csv`.

**Usalama:** `/dashboard/admin/reports/*` ni Admin pekee; `/dashboard/sales/my-performance` ni
sales staff mwenyewe pekee. `/api/reports/pdf` inathibitisha role kwa kila `report` type
(nimejaribu: admin akijaribu `report=my-performance` anapata 403).

> **Kumbuka ya utendaji (performance):** Local Prisma Postgres dev server (ile ile
> iliyotajwa kwenye sehemu ya migration hapo juu) mara kwa mara ilikatika chini ya
> concurrent connections nyingi (`Promise.all` na queries 4-5 kwa wakati mmoja) — niligundua
> hili wakati wa kujaribu Inventory Report. Nimebadilisha maeneo yaliyoathirika
> (`lib/data/dashboard.ts`, sehemu ya inventory ndani ya `lib/reports/build.ts`, na
> `app/dashboard/admin/reports/inventory/page.tsx`) kutumia `await` za mfululizo badala ya
> `Promise.all`. Kwenye PostgreSQL ya kawaida (production) hili si tatizo — ni upungufu wa
> hii local dev proxy pekee.

## Expenses & Accounting (Phase 7)

| Route | Nani | Maelezo |
|---|---|---|
| `/dashboard/admin/expenses` | Admin | List/Add/Edit/Futa expenses (filter: period, category, branch) |
| `/dashboard/admin/suppliers` | Admin | Suppliers, balance (deni), Record Payment |
| `/dashboard/admin/reports/sales` | Admin | Sasa ina "Financial Summary" + chart ya Revenue/Expenses/Net Profit |

**Manual Item Cost Fix (Sehemu 1):** Fomu ya "Add Manual Item" kwenye POS sasa ina field
inayohitajika **"Buying Price / Cost Price"** (`manualCostPrice` kwenye `SaleItem`, nullable kwa
sababu manual items za zamani — kabla ya Phase 7 — hazina thamani hii, `?? 0` kwenye COGS).
Kwenye "Convert Manual Item to Official Part", `manualCostPrice` ya mwisho iliyotumika inatolewa
moja kwa moja kama pendekezo la `costPrice` (nimejaribu: item yenye Selling 500,000/Buying
300,000 ilitoa pendekezo la costPrice=300,000 kwenye fomu ya Part).

**Expenses (Sehemu 2):** `/dashboard/admin/expenses` ina `ReportControls` ile ile inayotumika
kwenye Reports zote (period + branch + **category** — `ReportControls` sasa inakubali
`categories` prop ya ziada), jumla ya expenses juu, na "+ Add Expense". Edit/Futa zinapatikana
TU kwa expenses za manual (`relatedSupplierPaymentId === null`) — zilizotengenezwa moja kwa moja
kutoka Supplier Payment zinaonyesha "Auto (Supplier Payment)" badala ya vitufe, na
`updateExpense`/`deleteExpense` zinazikataa kabisa hata kama mtu akijaribu kupitia console
(zimehakikiwa server-side, si UI tu).

**Supplier Payment → Expense (Sehemu 3 — msingi haukuwepo, umejengwa upya):** Uliruka Purchases
phase kabisa, kwa hivyo `Supplier.balance`, `SupplierPayment` model, na `/dashboard/admin/suppliers`
havikuwepo — nimejenga toleo dogo (Supplier CRUD + balance editable moja kwa moja na admin, kwa
kuwa hakuna Purchases-on-credit workflow bado ya kuongeza deni kiotomatiki). "Record Payment"
inafanya kila kitu kwenye `prisma.$transaction` moja: inaunda `SupplierPayment`, inaunda `Expense`
(category `SUPPLIER_PAYMENT`, `relatedSupplierPaymentId` ikielekeza kwenye malipo hayo), na
inapunguza `Supplier.balance`. Nimejaribu: balance 200,000 → Record Payment 80,000 → balance
120,000, na Expense ya 80,000 ikaonekana kwenye `/dashboard/admin/expenses` bila vitufe vya
Edit/Futa.

**Accounting engine — single source of truth (Sehemu 4):** `lib/accounting.ts`'s
`getFinancialSummary(range, filters)` ndiyo pekee inayotumika kila mahali (Dashboard, Sales
Report, PDF, CSV) — hakuna formula nyingine iliyoandikwa mahali pengine. Sales zenye
`status: VOIDED` hazihesabiki kabisa (wala Revenue wala COGS).

### Financial Summary — Test Case (imethibitishwa moja kwa moja)

Niliunda mauzo ya kweli kwenye Main Branch (haikuwa na mauzo mengine leo, hivyo branch filter
iliweza kutenganisha data safi kabisa kwa ajili ya uthibitisho):

- Manual item: Selling 500,000, Buying/Cost 300,000, quantity 1 → Sale.total = **500,000**,
  COGS ya item hiyo = **300,000**
- Expense ya manual: 50,000 (category Other, branch Main Branch)

Matokeo halisi kwenye Sales Report (`period=daily`, `branchId=Main Branch`) — sanjari kabisa na
mfano wa mtumiaji (Sales 500,000, COGS 300,000, Expenses 50,000 → Gross Profit 200,000, Net
Profit 150,000):

```
Total Sales Revenue:  +500,000
Total Expenses:       −50,000
Gross Profit:          200,000
Net Profit:             150,000
```

Nilijaribu pia bila branch filter (Daily, branches zote) ili kuthibitisha VOIDED sales
zinapuuzwa na Supplier Payment inahesabika kama Expense: jumla ya mauzo yasiyo-voided leo
668,000 (invoice #3: 150,000 + #4: 18,000 + #5: 500,000 — invoice #1 na #2 ni VOIDED,
hazikuhesabiwa), COGS 311,000 (300,000 + 11,000 ya Air Filter + 0 ya Fuel Pump Assembly ya
zamani isiyokuwa na `manualCostPrice`), Gross Profit 357,000, Expenses 130,000 (50,000 manual +
80,000 Supplier Payment), **Net Profit 227,000** — na Dashboard "Net Profit ya Leo"/"Net Profit
ya Mwezi Huu" zote zilionyesha 227,000 sawasawa, zikithibitisha function moja ya kati
inatumika kila mahali bila kutofautiana.

**Usalama:** `/dashboard/admin/expenses` na `/dashboard/admin/suppliers` ni Admin pekee
(nimejaribu: sales staff akijaribu anarudishwa `/dashboard/sales`). Sales staff hawaoni Expenses,
COGS, Gross Profit, au Net Profit popote — `/dashboard/sales/my-performance` na
`/dashboard/sales/history` havitumii `lib/accounting.ts` kabisa.

## Hatua Zinazofuata

1. "Add Admin" kutoka dashboard ya admin (badala ya kutegemea `/signup/admin` pekee)
2. Branch management (kuongeza/kuhariri matawi kwenye UI — kwa sasa ni seed data pekee)
3. Purchases kamili (order tracking, receiving stock, kuongeza Supplier.balance kiotomatiki
   kutoka manunuzi ya credit — kwa sasa balance inawekwa na admin moja kwa moja)
4. SMTP halisi kwenye `.env` ili "Send Email" ifanye kazi kikamilifu
