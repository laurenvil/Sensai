# Walkthrough — TypeScript & Lint Audit (WebApp Code Quality Pass)

## Summary

A full audit of the `Classes/webapp` source code was performed, resolving all TypeScript type errors, ESLint violations, and warnings. The production build was verified clean from zero to completion.

**Before:** 25 lint problems (13 errors, 12 warnings), plus a dead-code dead-fetch in `lib/github.ts`
**After:** 0 errors, 0 warnings. `tsc --noEmit` clean. `next build` successful (31 routes).

---

## What Was Checked

1. `npx tsc --noEmit` — TypeScript strict type checking across all source files
2. `npx eslint .` — ESLint with `eslint-config-next/core-web-vitals` + TypeScript rules
3. `npx next build` — Full production build (Turbopack, static generation, type recheck)

---

## Errors Fixed (13 total)

### 1. `@typescript-eslint/no-explicit-any` — 5 instances

React state typed as `any` or catch clauses typed as `any` — both are unsafe and disallowed in strict mode.

**Files:**
- `src/app/admin/drafts/[prNumber]/page.tsx` (state declarations)
- `src/app/api/admin/drafts/[prNumber]/route.ts` (catch clauses × 2)
- `src/app/api/admin/drafts/[prNumber]/files/route.ts` (catch clause)

**Fix — State types:**
```typescript
// Before
const [draft, setDraft] = useState<any>(null);
const [files, setFiles] = useState<any[]>([]);

// After
const [draft, setDraft] = useState<Record<string, string | number> | null>(null);
const [files, setFiles] = useState<Array<{ filename: string; content?: string; sha?: string }>>([]);
```

**Fix — Catch clauses:**
```typescript
// Before
} catch (error: any) {
  return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
}

// After
} catch (error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Failed" },
    { status: 500 }
  );
}
```

Same pattern applied to the inline `catch (err: any)` blocks in the page component's save/merge handlers.

---

### 2. `react-hooks/set-state-in-effect` — 4 instances

React 19 introduced this rule (via `eslint-config-next/core-web-vitals`) to catch synchronous `setState` calls in the body of a `useEffect`. Synchronous setState triggers a second render synchronously, degrading performance. The rule only flags direct (synchronous) calls — `.then()` and `.finally()` callbacks are fine.

**Files:**
- `src/app/admin/drafts/[prNumber]/page.tsx` — `setLoading(false)` in `else` branch
- `src/app/dashboard/page.tsx` — `setLoading(true)` at top of effect
- `src/components/admin-guard.tsx` — `setLoading(false)` in `!session` branch
- `src/hooks/use-admin-status.ts` — `setIsTeacher(false)` + `setLoading(false)` in `!session` branch

**Root cause:** All four used an early-return guard pattern like:
```typescript
useEffect(() => {
  if (!session) {
    setLoading(false);  // synchronous setState — triggers cascading render
    return;
  }
  fetch(...)...
}, [session]);
```

**Fix strategy — derive loading from session state:**

For `use-admin-status.ts` and `admin-guard.tsx`, replaced the boolean `loading` state with a computed value using `useMemo`, keyed off the NextAuth `status` field and a `fetchDone` boolean:

```typescript
const [fetchDone, setFetchDone] = useState(false);

useEffect(() => {
  if (!session) return;  // no synchronous setState
  let cancelled = false;
  fetch("/api/progress")
    .then(r => r.json())
    .then(data => { if (!cancelled) setIsTeacher(data.isTeacher === true); })
    .catch(() => { if (!cancelled) setIsTeacher(false); })
    .finally(() => { if (!cancelled) setFetchDone(true); });
  return () => { cancelled = true; };
}, [session]);

const loading = useMemo(() => {
  if (status === "loading") return true;   // NextAuth resolving
  if (!session) return false;              // Not signed in — nothing to fetch
  return !fetchDone;                       // Signed in — wait for fetch
}, [status, session, fetchDone]);
```

For `drafts/page.tsx`, initialized `loading` based on the current `status` value so it starts as `false` when unauthenticated:
```typescript
const [loading, setLoading] = useState(status === "loading" || status === "authenticated");
```

For `dashboard/page.tsx`, removed the pre-fetch `setLoading(true)` entirely (loading is already `true` from initialization) and added cancellation:
```typescript
useEffect(() => {
  if (!session) return;
  let cancelled = false;
  Promise.all([...])
    .then(([runsData, progressData]) => {
      if (cancelled) return;
      setRuns(runsData.runs || []);
      ...
    })
    .finally(() => { if (!cancelled) setLoading(false); });
  return () => { cancelled = true; };
}, [session]);
```

**Bonus:** The cancellation pattern (`let cancelled = false` + cleanup `() => { cancelled = true; }`) was added throughout — this prevents state updates on unmounted components, which is a separate React best practice.

---

## Warnings Fixed (12 total)

### 3. `@typescript-eslint/no-unused-vars` — 7 instances

Imported symbols and local variables that were never referenced.

| File | Removed |
|------|---------|
| `src/app/admin/drafts/[prNumber]/page.tsx` | `Check` (lucide icon), `session` (destructured but unused) |
| `src/app/api/progress/route.ts` | `env` (import) |
| `src/app/courses/[slug]/page.tsx` | `ExternalLink` (lucide icon), `session` + `useSession` import entirely |
| `src/app/dashboard/contract/page.tsx` | `pathLabel` (local variable — value computed but never used in body template) |
| `src/app/admin/page.tsx` | `Copy` (lucide icon), `handleBulkInvite` (async function defined but never wired to any button) |

`handleBulkInvite` was a complete async function (~25 lines) that bulk-invited users. It was fully implemented but had no UI trigger. Removed entirely to eliminate the dead code.

### 4. `@next/next/no-img-element` — 3 instances

Native `<img>` elements prevent Next.js from applying automatic image optimization (lazy loading, WebP conversion, responsive sizing, CDN caching). The rule requires using `next/image`'s `<Image>` component.

**Files:**
- `src/components/navbar.tsx` — GitHub avatar in nav bar
- `src/app/admin/page.tsx` — Student avatars in classroom table
- `src/app/admin/students/[username]/page.tsx` — Large avatar in student profile header

**Fix — each instance:**
```typescript
// Before
import Link from "next/link";
...
<img src={user.avatarUrl} alt={user.name} className="h-8 w-8 rounded-full" />

// After
import Image from "next/image";
import Link from "next/link";
...
<Image src={user.avatarUrl} alt={user.name} width={32} height={32} className="h-8 w-8 rounded-full" />
```

Width/height set to match the CSS dimensions (`h-8 w-8` = 32px, `h-16 w-16` = 64px).

**Required config addition** in `next.config.ts` to allow GitHub's CDN domain:
```typescript
images: {
  remotePatterns: [
    { protocol: "https", hostname: "avatars.githubusercontent.com" },
  ],
},
```

Without this, `<Image>` throws at runtime for external URLs.

---

## Dead Code Removed

### 5. Unused API call in `src/lib/github.ts`

`listContractIssues()` made three GitHub API calls: one with AND-logic (which doesn't work as intended on GitHub's API — comma-separated labels are treated as OR), then two separate calls for `contract-pending` and `contract-approved`. The first call's result was stored in `{ data }` but never used anywhere — a clear leftover from the function's initial draft.

```typescript
// Before — dead fetch
const { data } = await octokit.issues.listForRepo({  // data never read
  labels: "contract-pending,contract-approved",
  ...
});
// Also fetch pending-only and approved-only since the above is AND logic
const [pending, approved] = await Promise.all([...]);

// After — direct fetch only
// Fetch pending and approved separately since GitHub labels filter uses AND logic
const [pending, approved] = await Promise.all([...]);
```

This removes a redundant network call on every contract list load.

---

## New Documentation Added

### `docs/WebApp-Framework-Walkthrough.md`

A top-level developer walkthrough covering:

- Tech stack and rationale
- Full project directory structure with annotations
- Authentication flow (GitHub OAuth → NextAuth JWT → session)
- Three core data flows: student progress, AI module generation, learning contracts
- Key patterns: API auth helper, AdminGuard, React effect cancellation
- SQLite schema overview
- Local development setup
- Linting and type-check commands
- Deployment considerations (Vercel, `serverExternalPackages`, image domains)
- Extension guide: adding API routes, pages, and curriculum modules

---

## Files Modified

| File | Change |
|------|--------|
| `src/app/admin/drafts/[prNumber]/page.tsx` | Replace `any` state types; fix catch clauses; remove unused imports; restructure effect |
| `src/app/admin/drafts/page.tsx` | Replace `any[]` state type; fix set-state-in-effect; add cancellation |
| `src/app/api/admin/drafts/[prNumber]/route.ts` | Fix both catch clauses (`any` → `unknown`) |
| `src/app/api/admin/drafts/[prNumber]/files/route.ts` | Fix catch clause |
| `src/app/dashboard/page.tsx` | Remove synchronous `setLoading(true)`; add cancellation |
| `src/app/dashboard/contract/page.tsx` | Remove unused `pathLabel` |
| `src/app/courses/[slug]/page.tsx` | Remove unused `ExternalLink`, `session`, `useSession` |
| `src/app/api/progress/route.ts` | Remove unused `env` import |
| `src/app/admin/page.tsx` | Remove `Copy`, `handleBulkInvite`; replace `<img>` with `<Image>` |
| `src/app/admin/students/[username]/page.tsx` | Replace `<img>` with `<Image>` |
| `src/components/admin-guard.tsx` | Refactor to `useMemo`-derived loading; fix set-state-in-effect |
| `src/components/navbar.tsx` | Replace `<img>` with `<Image>` |
| `src/hooks/use-admin-status.ts` | Refactor to `useMemo`-derived loading; fix set-state-in-effect |
| `src/lib/github.ts` | Remove dead `{ data }` fetch from `listContractIssues` |
| `next.config.ts` | Add `images.remotePatterns` for `avatars.githubusercontent.com` |

**New files:**
| File | Description |
|------|-------------|
| `docs/WebApp-Framework-Walkthrough.md` | Developer walkthrough (architecture, patterns, setup) |
| `docs/Development/12-TypeScript-Lint-Fix-Walkthrough.md` | This document |
