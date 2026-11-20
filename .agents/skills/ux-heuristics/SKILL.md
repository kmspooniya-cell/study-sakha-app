---
name: ux-heuristics
description: 'Evaluate and improve interface usability using heuristic analysis. Use when the user mentions "usability audit", "UX review", "users are confused", "heuristic evaluation", "form usability", "navigation problems", "Nielsen heuristics", "cognitive walkthrough", or "usability testing". Also trigger when reviewing a design for usability issues, improving form completion rates, or evaluating information architecture and navigation. Covers Nielsens 10 heuristics, severity ratings, and information architecture. For visual design fixes, see refactoring-ui. For conversion-focused audits, see cro-methodology.'
license: MIT
metadata:
  author: wondelai
  forked_by: mikeoptimax
  original: wondelai/skills/ux-heuristics
  version: "1.3.0"
---

# UX Heuristics Framework

Practical usability principles for evaluating and improving user interfaces. Based on a fundamental truth: users don't read, they scan. They don't make optimal choices, they satisfice. They don't figure out how things work, they muddle through.

## Core Principle

**"Don't Make Me Think"** - Every page should be self-evident. If something requires thinking, it's a usability problem.

**The foundation:** Users have limited patience and cognitive bandwidth. The best interfaces are invisible -- they let users accomplish goals without ever stopping to wonder "What do I click?" or "Where am I?" Every question mark that pops into a user's head adds to cognitive load and increases the chance they'll leave. Design for scanning, satisficing, and muddling through -- because that's what users actually do.

## Scoring

**Goal: 10/10.** When reviewing or creating user interfaces, rate them 0-10 based on adherence to the principles below. A 10/10 means full alignment with all guidelines; lower scores indicate gaps to address. Always provide the current score and specific improvements needed to reach 10/10.

## Krug's Three Laws of Usability

### 1. Don't Make Me Think

Every question mark that pops into a user's head adds cognitive load. Clever names lose to clear names. Marketing-speak creates friction. Use self-evident labels, action-oriented buttons, plain language.

### 2. It Doesn't Matter How Many Clicks

Cognitive effort per click matters more than click count. Three mindless, confident clicks beat one confusing click. Users abandon when confused, not when they've clicked too many times.

### 3. Get Rid of Half the Words

Get rid of half the words on each page, then get rid of half of what's left. Happy-talk, unnecessary instructions, and polite fluff all compete with content that matters.

### 4. The Trunk Test

If users were dropped on any random page, could they instantly answer: what site is this? what page am I on? what are my options? where am I in the hierarchy? can I search? Logo, page title, breadcrumbs, visible nav — all mandatory.

## Nielsen's 10 Usability Heuristics

1. **Visibility of System Status** — Keep users informed via timely feedback. Progress bars, confirmations, loading states. Silent failures destroy trust.

2. **Match Between System and Real World** — Speak users' language. "Sign in" not "Authenticate". Follow real-world metaphors (shopping cart, trash). One term per concept.

3. **User Control and Freedom** — Clear emergency exits. Undo beats confirmation dialogs. Back buttons must never break. Soft delete with undo beats permanent deletion.

4. **Consistency and Standards** — Same words, styles, behaviors mean the same thing throughout. Follow platform conventions (logo top-left, search top-right).

5. **Error Prevention** — Constrained inputs, autocomplete, sensible defaults, "unsaved changes" warnings. Prevent slips (accidental wrong action) and mistakes (wrong intention).

6. **Recognition Rather Than Recall** — Show options, don't require memorization. Breadcrumbs, recent searches, pre-filled fields. Human working memory holds ~7 items.

7. **Flexibility and Efficiency of Use** — Keyboard shortcuts, bulk actions, saved searches, command palettes for power users. Progressive disclosure keeps it simple for beginners.

8. **Aesthetic and Minimalist Design** — Every element must earn its place. One primary CTA per page. When everything screams for attention, nothing stands out.

9. **Help Users Recognize, Diagnose, and Recover from Errors** — Error messages: what happened, why, and how to fix it. Plain language, specific, never blame the user, preserve their input.

10. **Help and Documentation** — Searchable, task-focused, contextual. Tooltips, inline hints, searchable knowledge base, guided tours.

## Severity Rating Scale

| Severity | Rating | Description | Priority |
|----------|--------|-------------|----------|
| 0 | Not a problem | Disagreement only | Ignore |
| 1 | Cosmetic | Minor annoyance | Fix if time |
| 2 | Minor | Causes delay/frustration | Schedule fix |
| 3 | Major | Significant task failure | Fix soon |
| 4 | Catastrophic | Prevents task completion | Fix immediately |

Rate by: Frequency + Impact + Persistence.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Mystery meat navigation | Add text labels alongside icons |
| Too many choices | Reduce to 7±2 items |
| No "you are here" indicator | Highlight current nav + breadcrumbs |
| No inline validation | Validate on blur with specific messages |
| Wall of text | Break with headings, bullets, whitespace |
| No loading indicators | Show spinner/skeleton screen |
| Tiny tap targets | Minimum 44x44px |
| Hover-only information | Don't hide critical info behind hover |
| No undo | Provide undo for all non-destructive actions |
| Broken back button | Never hijack browser history |

## Quick Diagnostic

| Question | If No → Action |
|----------|---------------|
| Can I tell what site/page this is immediately? | Add clear logo, page title, breadcrumbs |
| Is the main action obvious? | Create visual hierarchy, single primary CTA |
| Is navigation clear? | Apply Trunk Test, add "you are here" indicators |
| Does system show what's happening? | Add loading states, confirmations, progress |
| Are error messages helpful? | Rewrite in plain language with specific fix |
| Can users undo or go back? | Add undo, cancel, back everywhere |
| Does it work without hover? | Replace hover-only with visible alternatives |

## Heuristic Conflicts

- **Simplicity vs. Flexibility** → Use progressive disclosure
- **Consistency vs. Context** → Consistent patterns, contextual prominence
- **Efficiency vs. Error Prevention** → Prefer undo over confirmation dialogs
- **Discoverability vs. Minimalism** → Primary actions visible, secondary hidden

---

*Based on Steve Krug's "Don't Make Me Think" and Jakob Nielsen's 10 Usability Heuristics. MIT License — original by wondelai.*
