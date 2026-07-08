# MoVAI

מנוע גילוי סרטים חוקיים וחינמיים. ראו `movai-architecture-plan.md` לתוכנית המלאה.

## פיתוח מקומי

```bash
corepack enable   # מפעיל את גרסת pnpm המוגדרת ב-packageManager
pnpm install

# תשתית מקומית (Postgres+Redis+Meilisearch):
docker compose up -d
cp .env.example .env.local   # ומלאו את הערכים הרלוונטיים (ראו הערות בקובץ)

# מיגרציות DB:
pnpm --filter @movai/db db:generate   # כבר נוצר - drizzle/0000_good_devos.sql
pnpm --filter @movai/db db:migrate

pnpm dev          # מריץ apps/web ו-apps/api במקביל (turbo)
```

**הערה סביבתית**: אם אתם מריצים בתוך תיקייה מסונכרנת (לדוגמה כונן רשת/iCloud/OneDrive),
`pnpm install` עלול להיכשל עם שגיאת `EPERM: operation not permitted, unlink` — זו מגבלה של
מערכת הקבצים המסונכרנת (לא תומכת ב-unlink של קבצים זמניים של pnpm), ולא קשורה לפרויקט עצמו.
פתרון: להריץ `pnpm install` על דיסק מקומי רגיל.

## פקודות עיקריות

- `pnpm lint` — ESLint על כל החבילות, כולל חסימת `any` (architecture plan §4)
- `pnpm typecheck` — TypeScript strict על כל החבילות
- `pnpm test` — Vitest (unit/integration) על כל החבילות
- `pnpm build` — build ל-production של `apps/web` (Next.js) ו-`apps/api` (NestJS)

## מבנה

ראו סעיף 2 במסמך התוכנית (`movai-architecture-plan.md`) למפת המונריפו המלאה. סקירה מהירה:

| חבילה | תפקיד |
|---|---|
| `apps/web` | Next.js App Router — קטלוג, עמוד סרט, Auth.js, PWA, SEO |
| `apps/api` | NestJS — health, movies search, rate limiting |
| `packages/types` | טיפוסים משותפים + zod schemas (מקור אמת יחיד) |
| `packages/db` | Drizzle schema (Postgres) + client מאוחד |
| `packages/cache` | Redis client + cache-aside גנרי |
| `packages/search` | Meilisearch client + אינדוקס + חיפוש |
| `packages/queue` | BullMQ — ingestion queue, link-check יומי, dead-letter |
| `packages/content-adapters` | אדפטרים ל-YouTube/Internet Archive עם circuit breaker |
| `packages/recommendation-engine` | cosine similarity להמלצות content-based |
| `packages/ui` | קומפוננטות React נגישות (Button, MovieCard, Skeleton) |
| `packages/design-tokens` | צבעים/spacing/radius — מקור אמת לעיצוב |
| `packages/config` | tsconfig + ESLint משותפים (כולל חסימת `any`) |

## סטטוס נוכחי

**Phase 0 — הושלם**
- מונריפו Turborepo+pnpm, TypeScript strict (איפוס `any` נאכף ב-CI), CI ב-GitHub Actions
- 4 עמודי משפט (ToS/Privacy/DMCA/Accessibility), UI נגיש מהיסוד

**Phase 1 — הושלם**
- `@movai/db`: סכמת Drizzle מלאה (movies, users/accounts/sessions לפי @auth/drizzle-adapter, watchlist, ratings, user_preferences) + מיגרציה ראשונה נוצרה
- `@movai/cache`: Redis + cache-aside עם אימות zod על כל ערך במטמון
- `@movai/search`: Meilisearch — אינדוקס movies, חיפוש טקסט+פילטרים
- Auth.js v5 (GitHub provider) מחובר ל-DB דרך DrizzleAdapter, עמוד sign-in, כפתור sign-out בכותרת
- `@movai/queue`: BullMQ — תור ingestion (adapter→search index), job יומי לבדיקת רקבון קישורים (§12.6) עם rate limiting, dead-letter queue לג'objים שמיצו נסיונות
- `apps/api`: MoviesService עכשיו מחפש קודם ב-Meilisearch (עם cache-aside), ונופל בחזרה לאדפטרים חיים אם האינדקס לא זמין; health endpoint בודק Postgres/Redis/Meilisearch בפועל
- `docker-compose.yml` לסביבת פיתוח מקומית (Postgres+Redis+Meilisearch)

**Phase 1 (המשך) — הושלם**
- `packages/db`: movies repository מלא (`upsertMovie` שומר על id/createdAt בעדכון חוזר, `getMoviesDueForLinkCheck`, `updateMovieLinkStatus`, `getMovieBySlug`, `listMovies`)
- `apps/api/src/worker.ts`: תהליך נפרד מה-HTTP API שמפעיל בפועל את ה-BullMQ workers (ingestion + link-check) עם חיבור אמיתי ל-DB/search/adapters, dead-letter routing, ותזמון ה-job היומי (`pnpm --filter @movai/api dev:worker` / `start:worker`)
- ה-ingestion pipeline שלם מקצה לקצה עכשיו: job → adapter.search() → upsert ל-Postgres + אינדוקס ל-Meilisearch
- `POST /v1/admin/ingest` — endpoint מוגן (header `x-admin-key` מול `ADMIN_API_KEY`) להפעלה ידנית של ingestion; מתועד כפתרון זמני עד שתהיה מערכת הרשאות אמיתית
- 29 בדיקות יחידה עוברות בכל המונריפו
- דף הבית כולל hero promo (וידאו+תמונה מ-Cloudinary) מעל הקטלוג; `next.config.mjs` עודכן להתיר את המקור הזה (remotePatterns + CSP img-src/media-src)

**Phase 1 (המשך 2) — הושלם**
- CSP עבר מ-`next.config.mjs` הסטטי ל-`middleware.ts` עם nonce לכל בקשה — CSP סטטי בלי nonce חסם את סקריפטי ה-hydration של App Router (`self.__next_f.push`) ומנע מ-React לרוץ בכלל בדפדפן
- דף הבית בודק session (`auth()`): לא מחובר ← מסך פרומו (וידאו עם רשת ביטחון: timeout+onError+onStalled, בלי כפתור עליו) ואז מסך עם הרקע שנבחר + כפתורי התחברות; מחובר ← קטלוג מלא לפי קטגוריות (`CategoryRow`) עם header/footer נגישים וקישורים משפטיים
- אימות אימייל+סיסמה (Credentials provider) לצד Google/GitHub — עמודת `passwordHash` בטבלת `users` (מיגרציה `0001`), bcryptjs לגיבוב, session strategy עבר ל-`jwt` (נדרש לתמיכה ב-Credentials), דפי `/sign-in` ו-`/sign-up` עם טופס + הודעות שגיאה (`useActionState`)
- `packages/ui`: `Button` עכשיו משתמש ב-`tailwind-merge` כדי ש-className חיצוני ידרוס נכון את מחלקות ה-variant (היה באג ניגודיות אמיתי — טקסט לבן על כפתור לבן)

**נשאר לביצוע (Phase 2+)**
- pgvector במקום jsonb לעמודת embedding (ברגע שיש Postgres עם ההרחבה)
- 4 ההחלטות הפתוחות בסעיף 9 של התוכנית (מותג, מונטיזציה, שותפות Tubi/Pluto, שפות)
- חיבור apps/web לקרוא מה-API האמיתי במקום lib/movies.ts הסטטי
- onboarding quiz, Movie Concierge, A/B testing (GrowthBook), PostHog
