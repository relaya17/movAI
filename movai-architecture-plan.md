# MoVAI — תוכנית ארכיטקטורה מלאה
**"Spotify לסרטים חוקיים וחינמיים"**

מסמך זה הוא תוכנית עבודה בלבד — אין לפתוח קוד עד שהתוכנית מאושרת ונקודות ההחלטה הפתוחות (סעיף 9) נסגרות.

---

## 0. תמצית הקונספט

מנוע גילוי סרטים המרכז תוכן **חוקי וחינמי** ממקורות רשמיים (לא מארח וידאו בעצמו), עם דירוגים, המלצות AI, חיפוש סמנטי ("סרטי מתח משנות ה-90 עם סוף מפתיע"), ורשימות צפייה אישיות. עומד ברמת production: TypeScript קפדני (ללא `any`), נגישות WCAG, רספונסיביות מלאה (נייד+טאבלט+דסקטופ), SEO חזק, ועלויות תפעול נמוכות.

**עיקרון ארכיטקטוני מרכזי: המערכת היא שכבת גילוי ומטא-דאטה בלבד. הצפייה בפועל מתבצעת תמיד אצל בעל הזכויות (YouTube / Internet Archive / אתר/אפליקציה של Tubi ו-Pluto TV).** זה הבסיס להגנה המשפטית כולה.

---

## 1. הגנה משפטית — הבסיס שהכול נשען עליו

### 1.1 מקורות תוכן: מה מותר בפועל (נבדק, לא הנחה)

| מקור | סטטוס משפטי בפועל | מה מותר לבנות עליו |
|---|---|---|
| **YouTube Data API + iframe player** | תנאי שימוש רשמיים וברורים של Google. הטמעה (embed) של וידאו ציבורי דרך ה-player הרשמי מותרת. | ✅ הטמעה מלאה. **חובה**: לוגו/קרדיט YouTube גלוי בכל מקום שמוצג בו תוכן API, איסור על שם/לוגו שמכיל "YouTube"/"YT", הלוגו חייב לקשר בחזרה לתוכן ב-YouTube. אין לצבור נתוני שימוש/הכנסות של YouTube. |
| **Internet Archive (archive.org)** | API פתוח, תוכן ברובו Public Domain או ברישיון פתוח. הכי "נקי" מבחינה משפטית. | ✅ שימוש חופשי יחסית, לבדוק רישיון פר-פריט (חלק מהתוכן הוא CC ולא PD). |
| **Tubi** | **אין API ציבורי פתוח לצד ג'.** ההטמעה (embed) מותרת רק לאתרים/שותפים **מורשים** דרך Content Partner Portal. גישה בלתי מורשית ל-API הפנימי שלהם מפרה את תנאי השימוש. | ⚠️ ב-MVP: **קישור חיצוני בלבד** (deep-link לאתר/אפליקציה של Tubi), לא הטמעה ולא scraping. הטמעה אמיתית = דורש הסכם שותפות רשמי (Phase 3+). |
| **Pluto TV** | דומה ל-Tubi: יש תוכנית שותפים לתוכן/הפצה, אך לא API פתוח לאגרגטורים חיצוניים. | ⚠️ אותו טיפול כמו Tubi — קישור חיצוני, לא הטמעה. |
| **TMDB (מטא-דאטה: כותרות, תקצירים, פוסטרים, דירוגים)** | ה-API **חינמי רק לשימוש שאינו מסחרי**. שימוש מסחרי (כולל מוצר עם פרסום/הכנסות) מחייב **הסכם בתשלום** מול TMDB. חובה בכל מקרה (גם חינמי): לוגו TMDB רשמי + המשפט: *"This product uses the TMDB API but is not endorsed or certified by TMDB"* במקום גלוי (עמוד About/Credits). | ✅ ל-MVP לא ממומן: מותר. **לפני כל מונטיזציה — חובה לפנות ל-TMDB לרישיון מסחרי**, אחרת יש להחליף למקור חלופי (למשל OMDb בתשלום, או מטא-דאטה עצמאית). |
| **IMDb ישירות** | אין API ציבורי חינמי של IMDb; IMDb מוכרים דאטה בתשלום (IMDb Datasets/API). scraping אסור בתנאי השימוש שלהם. | ❌ לא להשתמש ב-IMDb ישירות. TMDB הוא התחליף החוקי. |

**מסקנת MVP**: מנוע הגילוי בפועל (עם וידאו מוטמע) נבנה סביב **YouTube + Internet Archive** בלבד. Tubi/Pluto TV מופיעים בקטלוג רק כ"קישורי מעבר" (כרטיס סרט → כפתור "צפה ב-Tubi" שפותח טאב חדש), לא כווידאו מוטמע. הרחבה לשותפות רשמית = Phase מאוחר יותר, תלוי בתגובת החברות.

### 1.2 מסמכים משפטיים שחובה לפני השקה (גם MVP)

1. **תנאי שימוש (ToS)** — כולל סעיף מפורש: "האתר אינו מארח קבצי וידאו; כל תוכן מוצג/מקושר ממקורות צד ג' תחת האחריות שלהם".
2. **מדיניות פרטיות** — תואמת GDPR (משתמשים מה-EU), CCPA (ארה"ב), וחוק הגנת הפרטיות הישראלי (1981 + תיקון 13 שנכנס לתוקף). כולל: אילו נתונים נאספים, עוגיות, שיתוף עם ספקי AI (אם שולחים שאילתות חיפוש למודל חיצוני).
3. **מדיניות DMCA / הסרת תוכן** — טופס "דיווח על הפרת זכויות" + מייל ייעודי + SLA להסרה, גם אם אתם לא מארחים — כדי להראות תום לב.
4. **Disclaimer בולט בכל עמוד סרט** — מקור התוכן, ושאין קשר/מיזוג עם TMDB/YouTube/Tubi/Pluto.
5. **מדיניות עוגיות + באנר הסכמה** (cookie consent) אם יש אנליטיקס/פרסום.
6. **גיל שימוש מינימלי + תיוג תוכן למבוגרים** אם רלוונטי.
7. **הצהרת נגישות** (Accessibility Statement) — נדרשת בישראל לפי תקנות שוויון זכויות לאנשים עם מוגבלות, לאתרים עם היקף פעילות משמעותי.

> החלק המשפטי הזה הוא לא "ניירת" — הוא קובע את הארכיטקטורה בפועל (מה מוטמע, מה רק מקושר). מומלץ אימות סופי מול עו"ד לפני השקה מסחרית; המסמך הזה נותן בסיס נכון אך אינו ייעוץ משפטי.

---

## 2. מבנה המונריפו (Turborepo + pnpm)

```
movai/
├── apps/
│   ├── web/                 # Next.js (App Router) — SSR/SSG ל-SEO, responsive, PWA
│   └── api/                 # NestJS (Node.js + TS) — REST/GraphQL, אימות, orchestration
├── packages/
│   ├── ui/                  # ספריית קומפוננטות משותפת (React + Tailwind), נגישה מהיסוד
│   ├── types/                # טיפוסים משותפים (Movie, User, Review...) + zod schemas
│   ├── api-client/           # קליינט מסונכרן ל-API (מבוסס OpenAPI/tRPC) — type-safe קצה-לקצה
│   ├── content-adapters/     # אדפטר לכל מקור תוכן (youtube, archive-org, tubi-link, pluto-link, tmdb)
│   ├── recommendation-engine/# לוגיקת המלצות + חיפוש סמנטי
│   ├── design-tokens/         # tokens.json + themes (light/dark) + tailwind preset
│   ├── config/               # tsconfig, eslint, prettier משותפים — single source of truth
│   └── testing-utils/        # פיקסצ'רים ועזרי בדיקה משותפים
├── turbo.json
├── pnpm-workspace.yaml
├── renovate.json              # מדיניות עדכון תלויות מבוקרת
├── .nvmrc                     # Node version pinning
├── .changeset/                # ניהול גרסאות לפאקג'ים פנימיים (semver אמיתי, לא רק תג גרסה)
└── .github/workflows/         # CI: lint, typecheck, test, build, preview deploy, k6, Chromatic
```

**למה Turborepo+pnpm ולא Nx**: overhead נמוך יותר, caching מהיר, מתאים ל-stack React/Next+Node בלי הצורך ב-generators מורכבים של Nx. אם הצוות יגדל משמעותית בעתיד — מעבר ל-Nx אפשרי כי מבנה ה-packages כבר מודולרי.

---

## 3. Stack טכנולוגי לפי שכבה

| שכבה | טכנולוגיה | הנמקה |
|---|---|---|
| Frontend | **Next.js 15 + React + TypeScript (strict)** | App Router = SSR/SSG טבעי ל-SEO; Image Optimization מובנה; Route handlers לשכבת BFF קלה |
| Styling | Tailwind CSS + Radix UI primitives | Radix = נגישות (ARIA, focus management) מובנית ברמת primitives, לא בונים ARIA מאפס |
| Backend API | **NestJS (Node.js + TypeScript strict)** | ארכיטקטורת מודולים מסודרת, DI, מתאים ל-monorepo production, kill-switch לכל אדפטר תוכן בנפרד |
| Validation | **Zod** בגבול כל API (request/response) | מחליף `any` בבדיקת runtime אמיתית + מסיק טיפוסים אוטומטית (`z.infer`) |
| Type-safety קצה-לקצה | tRPC (או OpenAPI generator אם צריך API ציבורי) | חוזה טיפוסים אחיד בין `api` ל-`web`, בלי `any`, בלי דריפט |
| DB | PostgreSQL (מנוהל: Neon / Supabase — free tier נדיב) | יחסים ברורים (users, watchlists, ratings), תמיכה מלאה ב-Prisma/Drizzle, PgBouncer pooling מובנה |
| ORM | **Drizzle ORM** | טיפוסים מדויקים מה-schema, בלי generation שכבתי מסורבל, קליל וזול ריצה |
| Cache/Queues | Redis (Upstash free tier) + BullMQ | Cache לתוצאות המלצה/חיפוש, תורים ל-ingestion מתוזמן מהמקורות, dead-letter queue |
| חיפוש | **Meilisearch** (self-host זול) | חיפוש טקסט מהיר+טיפוגרפי; לשילוב עם חיפוש סמנטי (סעיף 5) |
| אחסון תמונות/פוסטרים | Cloudflare Images / R2 | זול, CDN מובנה, מוריד עומס מהשרת, AVIF/WebP אוטומטי |
| Auth | Auth.js (NextAuth) / Lucia | ניהול משתמשים + OAuth, בלי לבנות אימות מאפס |
| Hosting Web | Vercel (Hobby→Pro) | Edge network + SSR מובנה, instant rollback, מתלכד טבעי עם Next.js |
| Hosting API | Fly.io / Railway | Docker קל, קנה מידה הדרגתי, זול ב-MVP |
| Monitoring | Sentry (errors) + Vercel Analytics / Plausible (privacy-friendly) | לא Google Analytics כברירת מחדל — פחות חיכוך פרטיות/GDPR |
| CI/CD | GitHub Actions | lint+typecheck+test+build כ-gate על כל PR, preview deploy אוטומטי |
| Testing | **Vitest** (unit/integration) + **Playwright** (E2E) + **Chromatic** (visual regression) + **k6** (load) | Test pyramid מלא — כל שכבה מכוסה, k6 לפני כל השקה |
| Security scanning | **Dependabot** (גרסאות) + **Snyk** (vulnerabilities) + CSP headers + gitleaks | gate ב-CI, לא בדיקה ידנית בדיעבד |
| Feature flags / A/B | **GrowthBook** (open source) | מדידת אפקטיביות המלצות, rollout הדרגתי, בלי deploy לכל שינוי קטן |
| Product Analytics | **PostHog** (self-host / cloud, privacy-friendly) | funnels, retention, session replay — לא רק page views כמו Plausible |
| Design tokens | `packages/design-tokens` (CSS variables + Tailwind theme) | dark mode, rebranding בנגיעה אחת, עקביות צבעים/spacing בין web/ui |
| Uptime monitoring | **UptimeRobot** / **Better Uptime** (free tier) | health checks + public status page, ניטור לפני שמשתמש מדווח על נפילה |
| Micro-interactions | **Framer Motion** | אנימציות spring איכותיות, עטופות ב-`useReducedMotion` |

---

## 4. אפס `any` — איך אוכפים את זה בפועל, לא רק בכוונה

1. **tsconfig קפדני משותף** ב-`packages/config`:
   ```json
   {
     "compilerOptions": {
       "strict": true,
       "noImplicitAny": true,
       "noUncheckedIndexedAccess": true,
       "exactOptionalPropertyTypes": true,
       "noImplicitOverride": true
     }
   }
   ```
2. **ESLint rule חוסם**: `@typescript-eslint/no-explicit-any: "error"` (לא warning) + `no-unsafe-assignment`, `no-unsafe-member-access` מופעלים — CI נכשל אם מישהו מכניס `any`.
3. **גבולות מערכת (API, תגובות ממקורות חיצוניים)** — תמיד `unknown` + `zod.parse()`, לא `any`. כל תשובת YouTube/TMDB/Archive עוברת סכימת אימות לפני שהיא נכנסת לקוד.
4. **Discriminated unions** לייצוג מקור התוכן (`{ source: 'youtube', ... } | { source: 'archive', ... } | { source: 'external-link', ... }`) במקום טיפוס גנרי רופף — מכריח את המהדר לטפל בכל מקרה.
5. **Pre-commit hook (husky + lint-staged)** שמריץ typecheck על קבצים שהשתנו — תפיסה לפני push, לא רק ב-CI.

---

## 5. מנוע המלצות + חיפוש חכם

- **שכבה 1 — חיפוש טקסטואלי/פילטרים**: Meilisearch על מטא-דאטה (ז'אנר, שנה, שחקנים, מקור).
- **שכבה 2 — חיפוש סמנטי (embeddings)**: וקטור embedding לכל סרט (מבוסס תקציר+ז'אנר+תגיות) ב-pgvector/Postgres. שאילתה כמו "סרטי מתח משנות ה-90 עם סוף מפתיע" עוברת ל-embedding ומושווית בדמיון קוסינוס — לא צריך מסד וקטורי נפרד יקר, pgvector מספיק בשלב זה.
- **שכבה 3 — סיווג AI לתוכן**: מודל LLM (Claude API) מסווג טון/טרופים/רמת אלימות/twist-ending מתוך תקציר+כתוביות זמינות — נשמר כתגיות structured (zod schema), לא טקסט חופשי, כדי שיהיה שאיל וניתן לסינון.
- **שכבה 4 — המלצות אישיות**: היברידי — content-based (דמיון embeddings לסרטים שהמשתמש דירג גבוה) + collaborative filtering קליל (co-viewing patterns) כש-יש מספיק משתמשים. מתחילים מ-content-based בלבד (לא צריך משתמשים רבים כדי לעבוד).
- כל קריאה ל-LLM חיצוני = **cache אגרסיבי** (Redis) לפי movie-id, כדי לא לשלם על אותו סיווג פעמיים — קריטי לעלויות.

---

## 6. נגישות (WCAG 2.1 AA) — לא checklist בסוף, חלק מהקומפוננטות

- כל קומפוננטת UI ב-`packages/ui` בנויה על Radix primitives → focus trap, ARIA roles, keyboard nav "בחינם".
- ניגודיות צבעים לפי AA (4.5:1 טקסט רגיל, 3:1 טקסט גדול) — נאכף ב-Storybook + בדיקת axe-core אוטומטית ב-CI.
- כל תמונה/פוסטר עם `alt` משמעותי (לא "poster.jpg").
- ניווט מקלדת מלא לכל הדף (כולל carousel/גלריית סרטים — לא לוכד פוקוס).
- כתוביות/תמלול לתוכן וידאו כשזמין מהמקור (YouTube תומך caption tracks — לחשוף ב-UI).
- `prefers-reduced-motion` מכובד באנימציות (כולל Framer Motion — סעיף 16.2).
- בדיקת screen-reader (VoiceOver/NVDA) כחלק מ-QA לפני כל release גדול, לא רק לינטר אוטומטי.
- הצהרת נגישות בעברית בפוטר (ראה סעיף 1.2).

---

## 7. רספונסיביות + PWA (מובייל+טאבלט+דסקטופ)

- **Mobile-first**: Tailwind breakpoints, כל קומפוננטה נבדקת קודם ברוחב 360px.
- **PWA מלא**: `manifest.json` + service worker (next-pwa / Workbox) — installable מהדפדפן בנייד, אייקון על מסך הבית, offline shell לעמודים שכבר נצפו.
- תמונות רספונסיביות (`next/image` עם `sizes` נכון) — לא שולחים פוסטר 4K לטלפון.
- Core Web Vitals כ-gate: LCP<2.5s, CLS<0.1, נבדק אוטומטית ב-CI עם Lighthouse CI על preview deploy.
- אין תלות ב-hover בלבד לאף פעולה קריטית (בעיה נפוצה בנייד).

---

## 8. SEO "מפואר"

- SSR/SSG לכל עמוד סרט (Next.js) — לא CSR בלבד, גוגל חייב HTML מלא.
- **Structured Data (schema.org `Movie`/`VideoObject`)** בכל עמוד סרט — כרטיסי תוצאה עשירים בגוגל.
- Sitemap דינמי + robots.txt מנוהלים אוטומטית (נבנה מחדש עם כל תוכן חדש).
- Open Graph + Twitter Cards לשיתוף.
- Canonical URLs (למניעת דופליקציה בין פילטרים/query params).
- מהירות טעינה (Core Web Vitals, סעיף 7) — פקטור דירוג ישיר בגוגל.
- i18n מובנה מהיום הראשון (עברית + אנגלית לפחות) — hreflang tags נכונים.
- **GEO (סעיף 16.3)** — אופטימיזציה למנועי AI (ChatGPT/Perplexity), לא רק לגוגל קלאסי.

---

## 9. נקודות שדורשות החלטה שלך לפני שממשיכים לביצוע

1. **שם/מותג** — "MoVAI" הוא רק שם עבודה (מתאים לשם התיקייה). לבחור שם סופי ולבדוק זמינות דומיין.
2. **מונטיזציה** — האם יהיה פרסום/תרומות/פרימיום בעתיד? קובע אם TMDB חייב רישיון מסחרי מהיום הראשון או אפשר להתחיל non-commercial.
3. **פנייה רשמית ל-Tubi/Pluto TV** — האם לפתוח מגע לשותפות רשמית עתידית (Phase 3+), או להישאר עם deep-link בלבד ל-MVP?
4. **היקף שפות** — עברית בלבד ל-MVP, או עברית+אנגלית מהיום הראשון?

---

## 10. Roadmap

| Phase | תוכן |
|---|---|
| **0 — יסודות** | הקמת monorepo, CI/CD, tsconfig/eslint משותפים, ToS/Privacy/DMCA בסיסיים, עיצוב UI system נגיש; הוספת security headers בסיסיים (CSP), תשתית Vitest ל-unit tests, ו-`renovate.json` לניהול עדכוני תלויות מבוקר |
| **1 — MVP גילוי** | קטלוג מ-YouTube+Internet Archive, מטא-דאטה מ-TMDB (non-commercial), חיפוש טקסטואלי, כרטיסי סרט עם deep-link ל-Tubi/Pluto, רשימת צפייה, auth בסיסי; הוספת retry/circuit-breaker לכל content adapter, health checks בסיסיים ו-UptimeRobot, connection pooling ל-DB, skeleton loaders ו-ISR לעמודי סרט, rate limiting על ה-API |
| **2 — אישיות** | דירוגים, המלצות content-based, embeddings+pgvector, חיפוש סמנטי; הוספת onboarding quiz לפתרון cold-start, GrowthBook A/B testing setup ראשוני, PostHog funnels, Playwright E2E לזרימות קריטיות |
| **3 — AI מתקדם** | סיווג תוכן ב-LLM, חיפוש בשפה טבעית מורכב, המלצות היברידיות (collaborative); השקת \"Movie concierge\" (צ'אט שיחתי מעל החיפוש הסמנטי), ניסוי אלגוריתמי המלצה נוספים ב-A/B, ו-job תקופתי לבדיקת \"רקבון קישורים\" (YouTube/Archive) |
| **4 — קנה מידה** | אופטימיזציית SEO/ביצועים, PWA מלא, בדיקת נגישות מלאה עם screen readers, ליטוש UX; הוספת בדיקות עומס k6 לפני השקה, GEO + `llms.txt`, Chromatic visual regression, bundle-size gate ב-CI, תמונות AVIF/WebP אוטומטיות, micro-interactions ב-Framer Motion |
| **5 — עסקי** | פנייה לרישיון TMDB מסחרי (אם רלוונטי), מגעים לשותפות Tubi/Pluto, ניטור/Sentry מלא, הקשחת אבטחה; ביצוע OWASP Top 10 audit, הקמת public status page, Snyk dependency audit מלא ותיעוד אסטרטגיית rollback/canary deploy |

---

## 11. ביצועים — "הכי מהיר בעולם" בפועל

- **ISR + stale-while-revalidate** לעמודי סרט (לא רק SSR/SSG סטטי) — עמודים נבנים פעם אחת ומוגשים מ-CDN, מתעדכנים ברקע.
- **תקציב bundle-size נאכף ב-CI** (`size-limit` / `@next/bundle-analyzer`) — build נכשל אם חורגים מהתקציב.
- **Connection pooling ל-Postgres** (PgBouncer / Neon pooler מובנה) — חובה בסביבת serverless/edge כדי לא לחנוק את ה-DB.
- **Prefetch אגרסיבי** (`next/link` prefetch, `<link rel="preload">` לתמונת LCP) — טעינה מוקדמת של העמוד/המשאב הבא.
- **Skeleton loaders + optimistic UI** — תחושת מהירות גבוהה גם כשיש latency ברשת.
- **תמונות AVIF/WebP** כברירת מחדל דרך `next/image` — צמצום משמעותי ברוחב הפס.

---

## 12. יציבות ו-Resilience — הפער הכי גדול היום

- **Retry + exponential backoff + circuit breaker** לכל `content adapter` (YouTube/TMDB/Archive) באמצעות שכבת resilience גנרית ב-`packages/content-adapters`.
- **Graceful degradation**: אם TMDB/YouTube נופל — מציגים נתוני cache אחרונים, לא שגיאה למשתמש.
- **Health checks + uptime monitoring** (Better Uptime / UptimeRobot) + **public status page** — ניטור לפני שמשתמשים מדווחים.
- **Dead-letter queue** ל-BullMQ jobs שנכשלים אחרי מספר ניסיונות — עם alerts מסונכרנים ל-Sentry.
- **Backup / point-in-time-recovery** ל-DB (Neon/Supabase) עם תיעוד תדירות בדיקות השחזור בפועל.
- **Rollback strategy + canary/preview deploys** לפני production, בשילוב feature flags.
- **בדיקת "רקבון קישורים" תקופתית** — job שבודק אם סרטוני YouTube/Archive נמחקו (404/410), מסמן `linkStatus = 'dead'` ב-DB ומסתיר אותם מהקטלוג.

---

## 13. אבטחה — חסר כמעט לגמרי היום

- **CSP headers + security headers** (`next-safe` / הגדרה ידנית) בכל תגובת HTTP.
- **Rate limiting על ה-API** (per-IP/per-user) ב-NestJS למניעת ניצול לרעה ושחיקת quota של YouTube/TMDB.
- **Dependency vulnerability scanning** (Dependabot/Snyk + `npm audit`) כ-gate ב-CI, לא כבדיקה ידנית בדיעבד.
- **Secrets management** ב-Vercel/Fly (env vars בלבד) + שימוש ב-gitleaks/git-secrets למניעת דליפת מפתחות ל-git.
- **OWASP Top 10 checklist** לפני Phase 5 (עסקי) — סקירה מסודרת של Injection, XSS, Auth, IDOR, Misconfiguration ועוד.

---

## 14. בדיקות איכות (Test Pyramid)

- **Unit tests**: Vitest לכל לוגיקה ב-`packages/` (recommendation engine, adapters, validation).
- **Integration tests**: לכל `content adapter` (כולל מקרים של 4xx/5xx) ול-pipeline של recommendation engine.
- **E2E**: Playwright לזרימות קריטיות — חיפוש, צפייה, ניהול watchlist, הרשמה/התחברות.
- **Visual regression**: Chromatic/Storybook לקומפוננטות UI ב-`packages/ui`.
- **Load testing**: k6 לפני השקה כדי לוודא שה"מהיר" שורד עומס אמיתי (p95 latency נמוך, error rate זניח).

---

## 15. חכם ומתוחכם יותר

- **A/B testing framework** (GrowthBook - open source, זול) למדידת אפקטיביות המלצות ושינויים ב-UX.
- **Onboarding quiz קצר** לפתרון cold-start (בחירת ז'אנרים, עשורים וסרטים אהובים) לפני שיש היסטוריית דירוגים.
- **"Movie concierge"** — צ'אט שיחתי (לא רק שורת חיפוש) מעל שכבת החיפוש הסמנטי (סעיף 5) שמתרגם שיחה לשאילתות חיפוש/המלצה.

---

## 16. עיצוב 2027 + GEO (Generative Engine Optimization)

- **Design system עם tokens אמיתיים** (לא Tailwind אד-הוק) ב-`packages/design-tokens` — `tokens.json` + themes (light/dark) + Tailwind preset.
- **Dark mode מובנה מהיום הראשון** (media query + toggle ידני).
- **Micro-interactions מדודות** (Framer Motion) שמכבדים `prefers-reduced-motion` (בהמשך לסעיף 6).
- **GEO**: קובץ `llms.txt` בשורש הדומיין + מבנה תוכן Markdown-friendly לעמודי סרטים, כדי שמנועי AI (ChatGPT/Perplexity/Google AI Overviews) יבינו ויצטטו את האתר בקלות — תוספת ל-SEO הקלאסי (סעיף 8).

---

## 17. ניהול גרסאות ותלויות — "מאוחד וגרסאות יציבות"

- **Exact version pinning** (לא `^ranges`) לכל התלויות החיצוניות, ושימוש ב-`workspace:*` לתלויות פנימיות במונריפו.
- **Renovate/Dependabot** עם auto-merge לעדכוני patch בלבד, ו-PR ידני ל-minor/major עם review ו-CHANGELOG.
- קובץ **`.nvmrc` + שדה `engines`** ב-`package.json` לנעילת גרסת Node ו-pnpm בין dev/CI/production.
- **API versioning** (`/v1/...`) בשכבת NestJS לתאימות לאחור, עם נתיב `/v2/` לשינויים שוברי תאימות בעתיד.

---

**המקורות המשפטיים שנבדקו לכתיבת סעיף 1:**

- [TMDB API Terms of Use](https://www.themoviedb.org/api-terms-of-use)
- [Tubi Creators & Content Services Terms of Use](https://partner.tubitv.com/legal/terms)
- [Pluto TV — Distribution, Content and Advertising Partners](https://pluto.tv/partners)
- [YouTube API Services Terms of Service](https://developers.google.com/youtube/terms/api-services-terms-of-service)
- [YouTube API Services — Developer Policies](https://developers.google.com/youtube/terms/developer-policies)
- [YouTube API Services — Branding Guidelines](https://developers.google.com/youtube/terms/branding-guidelines)
