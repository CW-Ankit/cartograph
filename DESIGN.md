# Cartograph Design System

Visual design system and interface guidelines for Cartograph, inspired by the high-precision engineering aesthetic of [delta.dev](https://delta.dev/).

This document defines how Cartograph looks and feels across all phases.

---

## 1. Aesthetic Direction

Cartograph is a **dense developer instrument**, not a consumer dashboard. Someone stares at this screen for hours while tracing codebases they didn't write.

- **Quiet confidence**: Dark and light modes are dedicated, hand-tuned palettes—never automatic CSS inversions.
- **Precision framing**: 1px hairline borders (`#222227` dark / `#e2e8f0` light) frame all panels and tools. No soft blurry drop shadows; no double borders.
- **Zero gratuitous motion**: Nothing moves unless clicked. No ambient pulsing, floating animations, or bouncy transitions. Transitions are micro-instantaneous (100ms–120ms).
- **Geometric grid structure**: Main canvas utilizes a subtle radial dot-grid texture (`bg-grid-pattern`), grounding graph nodes in a physical coordinate space.

---

## 2. Color Palette & Semantic Rules

The color system rests on four deliberate decisions. Color carries meaning or does not exist.

### Base Palettes

| Token | Dark Mode | Light Mode | Usage |
|---|---|---|---|
| `--background` | `#09090b` | `#f8fafc` | Canvas and app backdrop |
| `--surface` | `#111114` | `#ffffff` | Primary panel backgrounds, cards, tool buttons |
| `--surface-raised` | `#18181c` | `#f1f5f9` | Hover states, elevated headers, active selections |
| `--border` | `#222227` | `#e2e8f0` | Hairline structural borders, panel dividers |
| `--border-subtle` | `#19191d` | `#f1f5f9` | Inset dividers, row separators |
| `--foreground` | `#f4f4f6` | `#09090b` | Primary text, active icons |
| `--foreground-muted`| `#8e8e99` | `#64748b` | Labels, captions, secondary information |

### Semantic Graph Colors

Only three colors earn hue in Cartograph:

- **Blue Accent** (`--accent`: `#3b82f6` dark / `#2563eb` light): Selected files, active nodes, focus outlines, primary interactive triggers.
- **Green Incoming** (`--incoming`: `#22c55e` dark / `#16a34a` light): Fan-in dependencies (files that import the selected target).
- **Amber Outgoing** (`--outgoing`: `#f59e0b` dark / `#d97706` light): Fan-out dependencies (files that the selected target imports).

Everything else—surfaces, borders, body copy, breadcrumbs—is greyscale.

---

## 3. Typography & Sizing

### Fonts

- **UI Sans**: `Geist Sans`, `-apple-system`, `BlinkMacSystemFont`, `sans-serif`. Used for natural language labels and panel names.
- **Code Mono**: `Geist Mono`, `ui-monospace`, `monospace`. Used for **all** file paths, symbols, branch names, dimensions, numbers, metrics, and command prompts.

### Micro-Typography Conventions

- **Panel & Section Eyebrows**: `text-[10px] font-mono uppercase tracking-wider text-foreground-muted`.
- **Status & Counter Badges**: `rounded-[3px] px-1.5 py-0.2 font-mono text-[9px] or text-[10px]`.
- **Button Text**: `font-mono text-xs (11px–12px)` with tight letter spacing.
- **File Paths**: Always monospace with slash separators styled in `text-border` or `text-foreground-muted`.

---

## 4. Component Standards

### 1. Control Sizing Uniformity

All top bar interactive elements—the Organization Switcher, the Invite button, the Theme toggle, and the User avatar—share a **uniform height of 28px (`h-7`)**.

```tsx
// Standard Tool Button profile
className="h-7 inline-flex items-center gap-1.5 rounded-[4px] border border-border bg-surface px-2.5 py-0 font-mono text-xs text-foreground transition-all duration-100 hover:bg-surface-raised hover:border-accent"
```

### 2. Clerk Components (Organization Switcher & User Button)

- **Only one organization control**: Never duplicate the organization name as static text alongside Clerk's switcher. The switcher sits in the breadcrumb (`cartograph / [OrganizationSwitcher]`).
- **Styling overrides**: Clerk's default internal stylesheets use hardcoded black text (`#131316`) on triggers. Always style Clerk triggers and popovers through `app/globals.css` mapping `.cl-organizationSwitcherTrigger *` and popover cards directly to `var(--foreground)` and `var(--surface)`.

### 3. Canvas & Graph Elements (Going forward into Phase 2+)

- **Nodes**: Rendered as crisp, hairline-bordered rectangular boxes (`rounded-[4px] border border-border bg-surface`). Folder nodes fold into compact boxes with node counts.
- **Edges**: SVG lines with arrow markers.
  - Green for imports leading into a file.
  - Amber for imports branching out.
  - Blue accent when connected to the active node.
- **Canvas Texture**: Use `.bg-grid-pattern` (radial dot grid spaced at 24px).

---

## 5. Implementation Rules for Future Phases

When adding features in subsequent phases:

1. **Check color tokens first**: Never invent hex codes. Use `var(--foreground)`, `var(--surface)`, `var(--border)`, `var(--accent)`, `var(--incoming)`, and `var(--outgoing)`.
2. **Hairline alignment**: Panels always connect via single borders (`border-r`, `border-l`, `border-t`, `border-b`). Never nest bordered boxes directly against bordered containers.
3. **Monospace for data**: If it is a file name, import count, blast radius depth, git hash, or line number, it must be monospace.
4. **No gratuitous badges**: Do not add warning icons, score ratings, or severity badges (out of scope per `project-doc.md`).
