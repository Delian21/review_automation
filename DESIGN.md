# DESIGN — Review Request App

Read after VOWS.md and PROJECT.md. Anything not decided here: ask before choosing.

## Who and what

Owners of small salons, spas, and dental or wellness practices in the US, UK, Canada, and Australia. Mostly on their phones, busy, not technical. The design must feel calm, clean, and trustworthy, with a slightly premium finish.

## Mood

Calm, clean, trustworthy, a little premium. Soft and natural, never clinical, never loud. Avoid neon, pure black, pure white, and harsh saturated blue.

## Colour tokens

Define these as CSS variables. Light is the default; dark applies via `prefers-color-scheme` and a manual toggle.

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#FAF8F4` | `#101817` |
| `--surface` | `#FFFFFF` | `#17221F` |
| `--text` | `#1F2A2E` | `#EAF1EE` |
| `--text-muted` | `#5B6B6F` | `#9AAAA5` |
| `--primary` | `#2F6F6A` | `#5FB3AA` |
| `--primary-text` | `#FFFFFF` | `#0E1A18` |
| `--accent` | `#C9A27A` | `#D9B88F` |
| `--border` | `#E7E2D9` | `#243430` |

Rules:
- Accent is for decoration only (underlines, icons, small highlights). Never for body text, since it is too light to read.
- In dark mode, buttons use dark text on the light teal, not white.
- Never use `#000` or `#FFF` as a page background or body text colour.
- Check contrast (WCAG AA, 4.5:1 for body text) in both modes before calling any screen done.

## Typography

Two families, clearly distinct. Suggested, confirm with me before installing:
- Headings: **Fraunces** (serif, soft and premium). Weight 500 to 600.
- Body and UI: **Figtree** (clean sans). Weight 400, 500, 600.

Rules:
- Body text at least 16px on mobile. Line length under 70 characters.
- Sentence case everywhere. No all-caps labels.
- Headlines in a single style: no single word picked out in italic or a different colour.
- Use system fonts as the fallback stack so text shows instantly.

## Glass effect (use sparingly)

Inspired by Apple's Liquid Glass. On the web we can only approximate it with blur, translucency, and a light edge. We do not fake refraction.

Use glass in at most **two places**: the sticky top navigation, and one floating card over the hero. Everything else is solid `--surface`. If glass is everywhere, it stops being special and hurts readability.

```css
:root {
  --glass-bg: rgba(255, 255, 255, 0.55);
  --glass-border: rgba(255, 255, 255, 0.7);
  --glass-shadow: 0 8px 32px rgba(31, 42, 46, 0.10);
}
@media (prefers-color-scheme: dark) {
  :root {
    --glass-bg: rgba(23, 34, 31, 0.55);
    --glass-border: rgba(255, 255, 255, 0.10);
    --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
  }
}
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(18px) saturate(160%);
  -webkit-backdrop-filter: blur(18px) saturate(160%);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow), inset 0 1px 0 rgba(255, 255, 255, 0.35);
  border-radius: 20px;
}
/* Fallback: browsers without blur, or users who reduce transparency */
@supports not (backdrop-filter: blur(1px)) {
  .glass { background: var(--surface); }
}
@media (prefers-reduced-transparency: reduce) {
  .glass { background: var(--surface); backdrop-filter: none; -webkit-backdrop-filter: none; }
}
```

Rules:
- Glass only shows up when something is behind it. Put soft blurred colour shapes (sage and sand, low opacity) behind the hero so the glass has something to blur.
- Text on glass must still pass contrast over the busiest part of the background. If it does not, make the glass more opaque.
- Keep blur at 18px or lower and never stack glass on glass. Many people will open this on mid-range Android phones, where heavy blur makes scrolling lag.
- No glass on forms, tables, or long text.

## Layout and components

- Mobile first. Design at 360px wide, then scale up.
- One main action per screen, in `--primary`.
- Generous spacing. One radius scale (12px inputs and buttons, 20px cards). No decorative gradients on solid surfaces.
- Visible keyboard focus on every interactive element.
- Motion: one gentle page-load reveal at most, plus feedback when someone taps something. Anchor links (for example "Join the waitlist") scroll smoothly rather than jumping. Respect `prefers-reduced-motion`.
- Ambient drift: soft colour shapes behind the hero glass card, so the glass has something to blur, with a faint smoke-like texture drifting over them. These are the only looping animations on the site. Transform and opacity only — never animate blur radius or size. Blobs loop between 25 and 40 seconds; smoke between 40 and 60. The smoke texture is a single small grayscale WebP (under 100 KB) used as a CSS mask on two or three differently scaled and rotated layers. Never animate SVG turbulence, canvas, WebGL, or video, and never clip the shapes against a hard edge — they must fade out before the hero ends. Both must stay clear of the headline and subhead at every point in the drift, and must not reduce text contrast below WCAG AA anywhere in their travel. Colours and opacities are theme tokens with separate light and dark values; dark uses lower opacity so nothing glows or goes muddy. Off entirely under `prefers-reduced-motion` (a static frame is fine), and paused while the tab is hidden.

## Voice

Plain and friendly. Short sentences, active verbs, no jargon. Buttons say exactly what happens ("Join the waitlist", not "Submit"). Errors say what went wrong and how to fix it, without apologising.

## Copy rules

- Every customer receives the review link. Never write copy that says or implies unhappy customers are filtered or hidden.
- Mention the private feedback option only as an extra: "Something wrong? Tell us directly."
- No claims we cannot back up (no "guaranteed 5-star reviews", no review counts we have not measured).

## Open questions for the agent to ask me

- Final product name and logo
- Whether to include a dark mode toggle in version 1 or follow the system setting only
- Which two or three reference sites to match for look and feel
