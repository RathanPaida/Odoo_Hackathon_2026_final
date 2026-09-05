# DealFlow360 — Design Tokens

Single source of truth for color, type, layout, and motion.
Implemented in `src/app/globals.css`.

## Color

| Role | Token | Notes |
|---|---|---|
| Page bg (dark) | `--background` `#0a0a0f` | Internal workspace |
| Surface | `--card` `#111827` | Panels, tables |
| Border | `--border` `#1e293b` | Hairlines, dividers |
| Foreground | `--foreground` `#e2e8f0` | Body text |
| Muted fg | `--muted-foreground` `#94a3b8` | Secondary text |
| Brand | `--primary` `#6366f1` | Indigo. One accent. |
| Destructive | `--destructive` `#ef4444` | Remove / reject actions |

### Semantic status (one language for pills + tags)

| State | fg / bg / border |
|---|---|
| Pending / Under review | `--status-pending-*` amber |
| Approved / Active | `--status-approved-*` emerald |
| Rejected / Overdue | `--status-rejected-*` rose |
| Info / Draft / Future | `--status-info-*` blue |
| Negotiating / Revision | `--status-negotiating-*` violet |
| Neutral | `--status-neutral-*` slate |

### Risk tiers (backend-computed, frontend displays only)

| Tier | fg / bg / border |
|---|---|
| Low (0–10) | `--risk-low-*` emerald |
| Medium (10–25) | `--risk-medium-*` amber |
| High (25+) | `--risk-high-*` rose |

The frontend never re-derives risk. It reads what the approval API returns.

## Type

One family: **Inter** (already loaded via globals). Roles:

- Display / page title: 24–30px, weight 600, tight tracking (`tracking-tight`)
- Section heading: 16–18px, weight 600
- Body: 14px, weight 400
- Data / numeric: 14px, `.tabular` (font-variant-numeric: tabular-nums) for clean alignment in tables
- Eyebrow: 11px, weight 600, uppercase, `tracking-wider` — used sparingly, only when there is a true grouping role (e.g. "Deal Metrics")

## Layout

- Workspace container: `max-w-7xl mx-auto px-6 py-8`
- Card grid: `gap-5` standard
- Dense tables: row padding `px-5 py-3.5`, font 13–14px
- Portal container: `max-w-4xl mx-auto px-6 py-12`, lower density, larger spacing

Two distinct densities, same token set.

## Motion

Two deliberate moments only — not hover effects on every card:

1. **Live margin / risk indicator update**: when quote lines change, the totals re-render with a 180ms ease-out fade.
2. **Risk score breakdown reveal**: when an approval detail opens, the per-line breakdown table fades in (180ms ease-out).

All other transitions are 120–150ms color/border only. Honors `prefers-reduced-motion`.