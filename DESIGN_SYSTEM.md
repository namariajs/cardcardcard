# GO Desk Design System

A reference for the visual language actually implemented in this app today. Every value
below was pulled directly from `src/index.css` and the components that use it — nothing
here is proposed or aspirational. Line numbers refer to `src/index.css` unless noted.

This is a reference document, not a target — it does not mean the app is currently
consistent with itself everywhere (see **Cleanup needed** at the end).

## Colors

All defined as CSS variables in `:root` (lines 2–20):

| Variable | Value | Used for |
|---|---|---|
| `--pink` | `#F17DA3` | Primary accent — `.btn-primary`, focus outlines, tab active state hints, stat-clickable chevron |
| `--pink-dark` | `#C65C81` | Link color inside `.menu-card` text, "Abrir formulário →" link text |
| `--pink-deep` | `#9C3F62` | Emphasis text on pink backgrounds — headings inside pink boxes, `.btn-ghost`/`.btn-danger` text, `.badge.pendente`, price displays |
| `--pink-light` | `#FCE3EC` | Light pink fill — badge/chip backgrounds, `.qty-stepper-btn`, borders on softer boxes |
| `--pink-softer` | `#FFF3F7` | Softest pink fill — `.btn-ghost` background, `.hint`-adjacent boxes, table header background |
| `--bg` | `#FFFBFC` | Page background (`body`) |
| `--ink` | `#28232C` | Primary text color |
| `--ink-soft` | `#8B8494` | Secondary/muted text — labels, meta rows, hints |
| `--card` | `#FFFFFF` | Card/surface background |
| `--border` | `#F3E3EA` | Default hairline border color everywhere |
| `--sage` | `#4E9A70` | Positive/confirm accent — `.btn-sage` |
| `--sage-light` | `#E4F3EA` | Positive background — `.badge.pago`, unlocked lock-chip |
| `--amber` | `#D68A2A` | Warning accent (declared, rarely referenced directly) |
| `--amber-light` | `#FBEBD3` | Warning background — `.badge.atrasado`, `.gom-claims-box.warn` |
| `--orange` | `#E07A1F` | Used once, for `.psum-value.pending` |
| `--shadow` | `0 10px 28px -14px rgba(156,63,98,0.22)` | Larger elevation — modals, public form card, hover-raised cards |
| `--shadow-sm` | `0 4px 14px -8px rgba(156,63,98,0.18)` | Default card elevation |

**Colors used as literals, not variables** (worth knowing, since they're repeated by
value rather than name):
- `#2F5C40` — dark green text, always paired with `--sage-light` backgrounds, for
  "confirmed/ok/available" text (`.item-joiner.unclaimed`, `.badge.pago` text,
  `.modal-success-msg`, `.psum-value.ok`, `.track-msg.ok`).
- `#8A5A16` — dark amber text, always paired with `--amber-light`, for "late/warning"
  text (`.badge.atrasado`, `.psum-value.late`, `.gom-claims-box.warn h3`).
- `#C0392B` — one-off, `.psum-value.danger`.
- `#CFE7D9` — green border paired with `--sage-light` (`.lock-chip.unlocked`,
  `.lock-note.unlocked`, `.modal-success-msg` border).
- `#FFFAFC` — table row hover.
- `rgba(40,35,44,0.42)` — modal backdrop overlay.
- `rgba(241,125,163,0.7)` — `.btn-primary` hover glow.

**Pattern**: success state = `--sage-light` bg + `#2F5C40` text. Warning/late state =
`--amber-light` bg + `#8A5A16` text. Both text colors are literals, not variables, and
repeated in every place that pairing shows up — see Cleanup.

## Typography

**Font families** (loaded via Google Fonts in `index.html`, weights 500/600/700/800 for
Outfit are requested but **800 is never actually used** anywhere in the codebase):
- **Inter** — default body font (`body`), and every `.btn`/`.tab-btn`.
- **Outfit** (`.display` class, or referenced directly in dozens of rules) — all
  headings, stat/price/numeric display values, card titles. This is the "display" font
  for anything meant to draw the eye.
- **IBM Plex Mono** (`.mono` class) — IDs, codes, monetary figures in a few spots
  (`.joiner-total`, `.val-box .amt`).

**Size scale** as actually used (not a designed scale, just what's in the CSS):

| Size | Where |
|---|---|
| 10px | `.tab-badge` count |
| 10.5px | `.stat-label`, `.badge`, `.item-id`, `.ceg-chip`, `th` |
| 11px | global `label`, `.track-msg`, `.ceg-count` |
| 11.5px | `.reg-actions`/`.card-actions` small buttons, `.claim-info`, `.reg-row`, `.late-fee-note` |
| 12–12.5px | `.joiner-sub`, `.meta-row`, `.hint`, `.pay-row-label`, `td`, `.panel-intro p` |
| 13–13.5px | `.btn` default, global input/select/textarea, `.styled-select`, `.autocomplete-option`, `.public-rules` |
| 14–14.5px | `.lock-chip .btn`, `.hero p` |
| 15–15.5px | `.psum-value`, `.reg-name`, `.joiner-handle` |
| 16–16.5px | `.item-name`, `.pay-card-head h4`, `.gom-claims-box h3`, `.panel-summary-head h4` |
| 18–19px | `.panel-intro h3`, `.modal h3` / `.form-section h3` (every modal and public-form section header) |
| 20px | `.stat-value` |
| 28–38px | `.hero h1` (`clamp(28px, 4vw, 38px)`) — the one true page-title size |

**Weight**: 400 is body text default; explicit **500** is used specifically to escape
the global uppercase `label` styling on checkbox/radio option text (see Cleanup — this
exact override is duplicated many times instead of being a class); **600** is the button
and most-headings weight; **700** is stat/badge/price emphasis.

**Uppercase + letter-spacing**: small labels (`label`, `.stat-label`, `.eyebrow`, `th`,
`.psum-label`) are consistently `text-transform: uppercase` with `letter-spacing`
between `0.03em`–`0.08em`. This is the established "field label" / "small section
label" look.

## Spacing

- **Card padding**: 14px (`.item-card`, tight cards) up to 20px (`.reg-card`,
  `.pay-card`, `.panel-*`); modals use 26px; the public form card uses 28px.
- **Grid gap between cards**: 14–16px (`.grid`, `.joiner-grid`, `.registry-grid`).
- **Section bottom margin**: 14–24px depending on context (`.gom-claims-box` 24px,
  most cards 14–18px).
- **Border-radius scale**:
  - 10–12px — small controls (inputs, `.track-msg`, `.photo-preview`)
  - 14–16px — medium boxes (`.stat`, `.public-rules`, `.lock-note`, `.claim-row`)
  - 18–20px — standard cards (`.item-card`, `.reg-card`, `.joiner-card`, `.pay-card`,
    `.menu-card`, `.panel-intro`)
  - 22px — modals, `.public-form-card`
  - 999px — pills (`.btn`, `.badge`, `.tabs`, `.tab-badge`, `.item-joiner`)

## Buttons

Base `.btn`: Inter 600, 13px, fully pill-shaped (`border-radius: 999px`), padding
`10px 16px`, no border, `translateY(-1px)` on hover.

| Class | Look | Role / where used |
|---|---|---|
| `.btn-primary` | `--pink` bg, white text | The single main action per screen: Continuar, Enviar formulário, Cadastrar joiner, + Adicionar item, + Novo formulário |
| `.btn-ghost` | `--pink-softer` bg, `--pink-deep` text | Secondary action: Cancelar, Voltar, most toolbar buttons (Categorias, Importar, Copiar link) |
| `.btn-sage` | `--sage` bg, white text | Positive/confirm: Confirmar pagamento, Aprovar, Marcar como entregue, Encerrar/Reabrir formulário |
| `.btn-danger` | white bg, `--pink-deep` text, `--pink-light` border | Destructive: Remover, Rejeitar, delete icons — deliberately light/subtle, not solid red |
| `.btn-outline` | white bg, `--ink` text, `--border` border | Neutral/tertiary: Ver comprovante, Ver nos Correios |

Small icon-only or compact buttons don't have a dedicated class — they reuse one of the
above with an inline `padding` override (`.card-actions .btn`/`.reg-actions .btn` are
`7px 8px` at `11.5px`; ad hoc icon buttons like ✎/✕/🗑/↑/↓ use inline
`padding: '4px 8px'` or `'6px 10px'`).

## Cards

Every content card in the app is a variation on the same recipe:
```css
background: var(--card);
border: 1px solid var(--border);
border-radius: 18–20px;
padding: 14–20px;
box-shadow: var(--shadow-sm);
```
Named instances: `.item-card`, `.reg-card`, `.joiner-card`, `.pay-card`, `.menu-card`,
`.panel-intro`, `.panel-summary`, `.stat`, `.toolbar`. Modals use the same recipe at a
slightly larger radius (22px) and padding (26–28px), with no visible border (just the
larger `--shadow`) and an explicit `#fff` background rather than `var(--card)` (currently
the same color, but not expressed as the same token).

## Badges / pills

`.badge`: 10.5px, weight 700, pill shape, padding `4px 9px`, 1px transparent border.

| Modifier | Background / text | Used for |
|---|---|---|
| `.badge.pago` | `--sage-light` / `#2F5C40` | "PAGO", "🟢 Aberto" (open form) |
| `.badge.pendente` | `--pink-light` / `--pink-deep` | "PENDENTE" |
| `.badge.atrasado` | `--amber-light` / `#8A5A16` | "ATRASADO", "⏰ Prazo encerrado", the Itens tab's "📷 fotos pendentes" chip |
| `.badge.neutral` | `--pink-softer` / `--ink-soft`, bordered | "🔒 Encerrado", item categories, misc tags |

Other pill-shaped patterns that aren't `.badge` but serve the same purpose:
`.item-joiner` (pink-light/pink-deep, or sage-light/`#2F5C40` when `.unclaimed`),
`.reg-social`, `.ceg-count`, `.pay-waiting`, `.eyebrow`, and `.tab-badge` — the small
circular pink count overlay used on nav tabs (Pagamentos/Frete/Arquivo/Itens/Formulários)
and reused verbatim inside `FormulariosTab`'s "Respostas" button for the per-form pending
count.

## Form inputs

Global rule (applies to every bare `<input>` except checkbox/radio/file, every `<select>`,
every `<textarea>`): 13.5px, `border: 1px solid var(--border)`, `border-radius: 11px`,
padding `9px 12px`, white background. Focus state everywhere: `2px solid var(--pink)`
outline, `1px` offset.

**Labels**: the bare `label` tag (no class needed) is 11px, weight 700, `--ink-soft`,
uppercase, `letter-spacing: 0.03em`, block, `margin-bottom: 4px` — this is global and
applies to every `<label>` in the app, including ones wrapping a checkbox/radio.

**Checkbox/radio text**: because the global `label` rule would make plain sentence-case
option text render small/uppercase/gray, the established pattern is to put the visible
text in a sibling `<span>` (not the label's own text node) with an explicit override:
`textTransform: 'none', fontWeight: 500, fontSize: 13.5, color: 'var(--ink)'`. This exact
inline style object is the correct, intentional way to render a checkbox/radio label in
this app — see Cleanup for how often it's duplicated instead of being a class.

`StyledSelect` and `AutocompleteInput` are custom dropdown components that mimic this
same input look (13.5px, same border/radius) rather than using native `<select>` styling.

## Icons / emoji usage

There is no icon library or SVG icon set anywhere in this app — every icon is an emoji,
always placed as the literal leading character(s) of a button/label/heading's text, never
in its own wrapping element. This is a deliberate, consistent pattern, not a placeholder.

Representative examples: 🏠 Menu · 👤 Painel Joiner · 🟢 Disponível/Aberto · 💳 Pagamentos ·
🚚 Frete · 📦 Itens/caixa · 🌍 Inter · 💌 Joiners · 🗂 Cadastro/Set · 📁 Arquivo ·
📝 Formulários · 🔒/🔓 locked/unlocked · 🔔 pending alert · 📩 request · ✔/✕ approve/deny ·
✎ edit · 🗑 delete · 🔗 link/copy · 📎 attachment/receipt · 🖼️ photo placeholder ·
📷 photo-pending · ⏰ deadline · 🏷️ categories · 💸 batch payment · 🧑‍🤝‍🧑 members.

---

## Cleanup needed (Formulários feature only — not fixed, just flagged)

Audited `src/components/public/*`, `src/components/forms/*`, and
`src/components/registry/ImportJoinersFromItemsModal.jsx`. These are real, working uses
of the patterns above in most places (`.pay-row`/`.pay-row-label` reused correctly for
public item options, `.badge`/`.gom-claims-box`/`.claim-row` reused correctly for the
Pagamentos submissions section, `.photo-preview`/`.photo-upload-row` reused correctly for
every photo upload UI). The following are one-off inline styles that duplicate an
existing pattern above and could become a class instead:

1. **Checkbox/radio label override, duplicated ~8 times verbatim.** The exact object
   `{ textTransform: 'none', fontWeight: 500, fontSize: 13.5, color: 'var(--ink)' }` (or
   the same values spread across the `<label>` itself instead of a child `<span>`)
   appears independently in: `IntroSection.jsx` ("Li e concordo"), `ConfirmationSection.jsx`
   ("Entrei no grupo"), `PaymentSection.jsx` (Pix / Cartão radio labels, ×2),
   `FormWizardModal.jsx` (card-payment toggle label, member checkbox label). Candidate
   for a `.checkbox-label` (or similar) class.

2. **"Small uppercase group-name header," duplicated 3 times.** The object
   `{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase',
   letterSpacing: '0.03em' }` appears in `MembersModal.jsx` (group header) and twice in
   `FormWizardModal.jsx` (group header in the option-picker, plus the near-identical
   13px variant on individual member checkboxes). This is functionally re-deriving
   `.stat-label`/`.psum-label`'s existing "small uppercase label" look instead of reusing
   it or extracting a shared class.

3. **`SubmissionsView.jsx`'s small muted meta text** (`fontSize: 11.5, color:
   'var(--ink-soft)'` for the joiner's phone/@ line and the "Enviado em" date column)
   duplicates the same visual role `.item-id`/`.late-fee-note`/`.claim-info` already
   serve elsewhere, but isn't wired to any of them.

4. **`PublicFormPage.jsx`'s success screen** (72px icon, 28px heading, 15.5px body,
   all inline) is a one-off "hero" treatment with no class and no shared sizing token —
   it doesn't reuse `.hero h1`'s scale or introduce its own named variant, so a future
   full-page confirmation state elsewhere would have nothing to reuse.

5. **`PaymentSection.jsx`'s Pix-key and Total boxes** both hardcode `fontSize: 16` inline
   on a `<b>` inside a `.lock-note` rather than having a "prominent value inside a
   lock-note" convention to reuse (there's no existing precedent for this combination
   elsewhere, so it was built ad hoc both times, once per box, right next to each other).

6. **`FormWizardModal.jsx`'s "Selecionar todos" button** uses an ad hoc
   `padding: '3px 8px', fontSize: 10.5` on `.btn-ghost` — a one-off micro-button size
   not shared with any other small-button spot in the app (which otherwise standardize
   on the `11.5px` / `7px 8px` sizing from `.card-actions`/`.reg-actions`).

7. **`ImportJoinersFromItemsModal.jsx`'s failed/already-existed list styling**
   (`fontSize: 11.5, color: 'var(--pink-deep)'` wrapping a `<ul>`) is a one-off rather
   than reusing `.claim-info`/`.late-fee-note`'s established small-text-in-a-list look.

8. **Icon-only buttons throughout `FormWizardModal.jsx`** (↑ ↓ 🗑 reorder/remove-item
   controls, `padding: '4px 8px'`) use a slightly different padding than the
   `.card-actions`/`.reg-actions` icon-button convention (`7px 8px`) established
   elsewhere — three different icon-button paddings now exist across the app.
