---
name: ios-hig-design
description: 'Apply Apple Human Interface Guidelines to iPhone app design. Use when building, reviewing, or refactoring any iOS/iPhone interface. Covers layout, safe areas, navigation patterns, typography with Dynamic Type, Dark Mode, accessibility (VoiceOver, Reduce Motion), SF Symbols, gestures, components, privacy patterns, and system integration. Conditional phase trigger: activate when site/app has a PWA or iOS native component.'
license: MIT
metadata:
  author: ehmo
  forked_by: mikeoptimax
  original: ehmo/platform-design-skills/skills/ios
  version: "1.0.0"
---

> Local adaptation: This section maps the upstream iOS guidance to this Expo/React Native project.

# iOS Design Guidelines for iPhone

Comprehensive rules derived from Apple's Human Interface Guidelines. Apply these when building, reviewing, or refactoring any iPhone app interface.

---

## 1. Layout & Safe Areas — CRITICAL

- **44pt minimum touch targets** on all interactive elements (buttons, links, toggles)
- **Never place content under status bar, Dynamic Island, or home indicator** — use safe areas
- **Primary actions in thumb zone** (bottom of screen); secondary/nav at top
- **Support all screen sizes** — iPhone SE (375pt) through Pro Max (430pt) — no hardcoded widths
- **8pt grid alignment** — spacing/padding in multiples of 8 (4pt for fine adjustments)
- **Support landscape** unless task-specific (camera, etc.)

---

## 2. Navigation — CRITICAL

- **Tab bar at bottom** for 3–5 top-level sections; SF Symbols (filled = selected, outline = unselected)
- **Never use hamburger menus** — hides navigation, reduces discoverability
- **Large titles** (`.navigationBarTitleDisplayMode(.large)`) on primary views; transitions to inline on scroll
- **Never override back swipe** — left-edge swipe is a system expectation
- **Use NavigationStack** (not deprecated NavigationView) for hierarchical content
- **Preserve state** when navigating back or switching tabs

---

## 3. Typography & Dynamic Type — HIGH

- **Use semantic text styles** (`.headline`, `.body`, `.caption`) — never hardcoded sizes
- **Support Dynamic Type including accessibility sizes** (up to ~200%) — layouts must reflow, never clip
- **Custom fonts must scale** — use `Font.custom(_:size:relativeTo:)` in SwiftUI
- **Minimum 11pt text** — prefer 17pt for body
- **Hierarchy through weight and size** — not color alone

---

## 4. Color & Dark Mode — HIGH

- **Use semantic system colors** (`.primary`, `.secondary`, `Color(.systemBackground)`) — auto-adapt to light/dark
- **Provide light and dark variants** for all custom colors in asset catalog
- **Never rely on color alone** — pair with text, icons, or shapes (8% of men have color vision deficiency)
- **4.5:1 contrast minimum** (normal text); 3:1 (large text 18pt+)
- **One accent color** for all interactive elements throughout the app
- **Three-level background hierarchy:** `systemBackground` → `secondarySystemBackground` → `tertiarySystemBackground`

---

## 5. Accessibility — CRITICAL

- **VoiceOver labels on all interactive elements** — every icon-only button needs `.accessibilityLabel()`
- **Logical VoiceOver navigation order** — use `.accessibilitySortPriority()` when layout order differs
- **Support Bold Text** — SwiftUI text styles handle this; custom rendering must check `legibilityWeight`
- **Support Reduce Motion** — `@Environment(\.accessibilityReduceMotion)` to disable decorative animations
- **Support Increase Contrast** — `@Environment(\.colorSchemeContrast)` for high-contrast variants
- **Never convey info only by color, shape, or position** — multiple channels required
- **Alternative interactions for all gestures** — every custom gesture needs a tap/menu equivalent

---

## 6. Gestures & Input — HIGH

Standard iOS gesture vocabulary: tap (primary action), long press (context menu), swipe horizontal (delete/back), pinch (zoom).

**System gestures — NEVER override:**
- Swipe from left edge (back navigation)
- Swipe down from top-left (Notification Center)
- Swipe down from top-right (Control Center)
- Swipe up from bottom (home/app switcher)

Custom gestures must be discoverable (visual hints) and have visible button/menu alternatives.

---

## 7. Components — HIGH

- **Button styles:** `.borderedProminent` (primary CTA), `.bordered` (secondary), `.borderless` (tertiary), `.destructive` role (red for delete)
- **Alerts only for critical decisions** — 2 buttons preferred, max 3. Never for tips or non-critical info.
- **Sheets for scoped tasks** — always provide dismiss path (close button + swipe down); use `.presentationDetents()` for half-sheet
- **Lists:** `.insetGrouped` default; swipe actions for common operations; 44pt minimum row height
- **Tab bar never hidden** during navigation within a tab
- **Context menus** (long press) for secondary actions — never the only access path
- **SF Symbols:** match weight to adjacent text; use hierarchical/multicolor/palette rendering modes appropriately; use `symbolEffect` for animations (iOS 17+)

---

## 8. Patterns — MEDIUM

- **Onboarding:** Max 3 pages, always skippable, defer sign-in until needed
- **Loading:** Skeleton views matching final layout — never full-screen blocking spinners
- **Launch screen:** Must match first app screen — no splash logos or branding delays
- **Modality:** Sparingly, focused tasks only, always dismissable, never stack modals
- **Feedback:** Visual state change + haptic (`UIImpactFeedbackGenerator`, `UINotificationFeedbackGenerator`)

---

## 9. Privacy & Permissions — HIGH

- **Request permissions in context** — never at app launch
- **Explain before system prompt** — show custom explanation screen first (system dialog only appears once)
- **Sign in with Apple required** if any third-party auth is offered
- **Don't require accounts** for basic exploration
- **ATT prompt** if cross-app tracking; respect denial

---

## 10. Anti-Patterns — Never Do These

1. Hamburger menus — use tab bar
2. Custom back buttons breaking swipe-back
3. Full-screen blocking spinners — use skeleton views
4. Splash screens with logos — mirror first app screen
5. Requesting all permissions at launch
6. Hardcoded font sizes — use text styles
7. Color alone for state — pair with icons/text
8. Alerts for non-critical info — use banners/toasts
9. Hiding tab bar on push navigation
10. Ignoring safe areas with `.ignoresSafeArea()` on content
11. Non-dismissable modals
12. Custom gestures without visible alternatives
13. Touch targets under 44pt
14. Stacked modals
15. Dark Mode as afterthought — use semantic colors

---

## Evaluation Checklist

- [ ] All touch targets ≥ 44pt
- [ ] No content clipped under Dynamic Island/home indicator
- [ ] Tab bar used for top-level sections (no hamburger)
- [ ] Back swipe works throughout
- [ ] All text uses text styles (Dynamic Type support)
- [ ] Layouts reflow at accessibility text sizes
- [ ] Semantic colors used (Dark Mode works)
- [ ] Contrast ≥ 4.5:1 for normal text
- [ ] VoiceOver reads all screens logically
- [ ] Reduce Motion disables decorative animations
- [ ] Permissions requested in context, not at launch
- [ ] Custom explanation before each system permission dialog
- [ ] No full-screen blocking spinners
- [ ] Modals have dismiss path

## Expo / React Native Implementation

Apply the iOS guidance as design criteria, not as SwiftUI implementation instructions. Use this project's React Native and React Navigation patterns; do not introduce SwiftUI APIs such as `NavigationStack`. Before changing Expo or React Native APIs, follow the versioned documentation requirements in the repository's `AGENTS.md`.

---

*Based on Apple Human Interface Guidelines. MIT License — original by ehmo/platform-design-skills.*
