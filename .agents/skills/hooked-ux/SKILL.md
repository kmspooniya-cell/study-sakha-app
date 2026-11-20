---
name: hooked-ux
description: 'Design habit-forming product loops using the Hook Model (Trigger, Action, Variable Reward, Investment). Use when the user mentions "users arent coming back", "engagement loops", "habit formation", "push notifications", "variable rewards", "daily active users", "habit zone", or "user retention loops". Also trigger when designing notification strategies, building streaks or progress systems, or analyzing why users stop using a product after initial signup. Covers ethics evaluation and onboarding for habits. For conversion-focused audits, see cro-methodology.'
license: MIT
metadata:
  author: wondelai
  forked_by: mikeoptimax
  original: wondelai/skills/hooked-ux
  version: "1.2.0"
---

# Hook Model Framework

Framework for building habit-forming products. Habits are not created — they are built through successive cycles through the Hook.

```
Trigger → Action → Variable Reward → Investment
    ↑                                      │
    └──────────────────────────────────────┘
```

**Habit Zone:** Products enter the habit zone when used frequently enough AND with enough perceived value that usage becomes automatic.

## Scoring

**Goal: 10/10.** Rate product engagement mechanics 0-10 against these principles. Always provide current score and specific improvements needed to reach 10/10.

## The Four Phases

### 1. Trigger

The actuator of behavior. External triggers (notifications, emails, ads) get users started. Internal triggers (boredom, loneliness, FOMO) are the goal — they make users prompt themselves.

**Key principle:** Map your product to the specific negative emotion it resolves. Instagram resolves boredom. Google resolves uncertainty. Slack resolves anxiety about missing information.

**Ethical boundary:** Never exploit vulnerable emotional states (depression, addiction, grief). Triggers must connect users to genuine value, not manufacture anxiety.

### 2. Action

The simplest behavior done in anticipation of reward. Fogg Behavior Model: **B = Motivation × Ability × Trigger.** All three must converge simultaneously.

**Key principle:** Increasing ability (reducing friction) is almost always more effective than increasing motivation. Every extra step, field, or decision is a drop-off point.

Six elements of simplicity: time, money, physical effort, brain cycles, social deviance, non-routine. Reduce each.

**Ethical boundary:** Reducing friction should make genuinely valuable actions easier — not trick users into actions they'd regret.

### 3. Variable Reward

Dopamine spikes during **anticipation** of uncertain reward, not upon receiving it. Predictable rewards lose power. Variability sustains engagement.

Three types:
- **Tribe** — social validation (likes, comments, replies)
- **Hunt** — search for resources/information (infinite scroll, search results)
- **Self** — personal mastery/achievement (streaks, levels, unlocks)

**Ethical boundary:** Variable rewards should deliver genuine value. If users feel worse after engaging (regret, time loss, anxiety), the reward system is extractive.

### 4. Investment

Users invest time, data, effort, social capital, or money — which improves the product for next use and raises switching costs. Investment loads the next trigger.

**IKEA effect:** People value what they put effort into. Data investment (preferences → better recommendations), content investment (posts they don't want to lose), reputation investment (followers, ratings), social investment (connections that only exist on platform).

**Ethical boundary:** Let users leave with their data. Make staying the better choice through real value, not artificial lock-in.

## The Habit Zone

| | Low Frequency | High Frequency |
|-|---------------|----------------|
| **High Value** | Viable (needs marketing) | **HABIT ZONE** |
| **Low Value** | Failure | Failure |

## Habit Testing (5% Rule)

A product has formed a habit when at least 5% of users show unprompted, habitual usage.

1. Who are the habitual users? What do they have in common?
2. What's the Habit Path (common action sequence)?
3. What internal trigger drives behavior — what emotion precedes usage?

## The Manipulation Matrix

| | **Maker Uses Product** | **Maker Doesn't Use** |
|-|------------------------|----------------------|
| **Improves User's Life** | **Facilitator** ✅ | Peddler |
| **Doesn't Improve Life** | Entertainer | **Dealer** ❌ |

Aim to be a Facilitator. Don't use Hook Model when your product doesn't genuinely improve lives, targets vulnerable populations, or when business model depends on user regret.

## Onboarding Audit Checklist

- [ ] First action is obvious and completable in under 60 seconds
- [ ] Value proposition is clear before asking for investment
- [ ] Right external trigger used for the right user
- [ ] All unnecessary friction removed from core action
- [ ] User gets immediate feedback after first action
- [ ] Variable element present in first reward (surprise, delight)
- [ ] Investment asked AFTER reward, not before
- [ ] Investment loads the next trigger (creates content → triggers notification)

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Relying on external triggers indefinitely | Map to internal emotion within 30 days |
| Core action too complex | Simplify to minimum viable action |
| Predictable rewards | Add variability across tribe/hunt/self |
| Investment before reward | Always: trigger → action → reward → investment |
| Ignoring ethics | Run Manipulation Matrix check |

---

*Based on Nir Eyal's "Hooked: How to Build Habit-Forming Products". MIT License — original by wondelai.*
