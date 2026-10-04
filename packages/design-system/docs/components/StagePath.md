# `<StagePath>` — chevron row of record stages

A record's ordered stages as interlocking chevrons: done (tinted), current (solid), upcoming (neutral). Read-only by default; pass `onValueChange` to make every non-current stage a button. `tone` recolours done + current once the record reaches an outcome.

```tsx
import { Button, Cluster, StagePath } from '@eocrm/design-system';

<Cluster wrap={false}>
  <StagePath
    aria-label="Deal stage"
    stages={[
      { id: 'lead', label: 'Lead' },
      { id: 'qualified', label: 'Qualified' },
      { id: 'proposal', label: 'Proposal' },
      { id: 'negotiation', label: 'Negotiation' },
    ]}
    value={deal.stage}
    tone={deal.outcome === 'won' ? 'success' : deal.outcome === 'lost' ? 'danger' : 'default'}
    onValueChange={(id) => moveDeal(deal.id, id)}
  />
  <Button variant="success">Won</Button>
  <Button variant="danger-outline">Lost</Button>
</Cluster>;

// Read-only (list rows, previews, no permission)
<StagePath aria-label="Project stage" stages={projectStages} value={project.stage} />;
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `stages` | `StagePathStage[]` | yes | Ordered stages, first to last. |
| `value` | `string` | yes | Id of the current stage. Stages before it render as done, after it as upcoming. An id not in `stages` renders every stage as upcoming (and warns in development) rather than throwing. |
| `tone` | `'default' \| 'success' \| 'danger'` | no | Outcome colour for done + current stages. See `StagePathTone`. Default: `'default'`. |
| `onValueChange` | `((id: string) => void)` | no | Makes the path interactive: every non-current stage renders as a button that calls this with its id. The current stage is never a button. Omit for a read-only path. Whether a move is allowed (e.g. backwards) is the consumer's rule — confirm or ignore inside the handler. |
| …native | | | plus native `<ol>` attributes |

<!-- props:end -->

- **Always controlled.** `value` is required; there is no internal state. `onValueChange` is a request — update `value` when the move succeeds (after a confirmation or server call if needed).
- **Stage semantics.** `<ol>` with `aria-current="step"` on the current stage's chevron (the element focus returns to after a keyboard move); done/upcoming stages carry visually hidden, localised "completed" / "upcoming" text, so state is never colour alone.
- **Fills its container.** `width: 100%`, equal-width stages, labels ellipsize with a tooltip only when clipped. Beside other controls, use `<Cluster wrap={false}>` so the path takes the remaining width instead of wrapping onto its own line.
- **Every non-current stage is clickable** when `onValueChange` is passed, including going backwards. Enforce business rules in the handler.
- **Stage ids must be unique** (they are React keys). An empty `stages` array renders an empty list (and warns, since no stage matches `value`).
- One size (32px, matches `Button` `md`).
- **No pending state.** Nothing changes while `onValueChange`'s work resolves, and a double click calls it twice. Guard in the handler, or render the path read-only (omit `onValueChange`) while saving.
- **Geometry tokens are tuned together.** The chevron-shaped focus ring is computed for the default `--stage-path-arrow` / `--stage-path-height`; overriding either skews the ring's slanted edges.

#### When NOT to use

- ❌ Navigation between pages → `<Breadcrumb>` / `<Tabs>`.
- ❌ A multi-step form wizard. StagePath reflects a record's state; it doesn't drive a form flow.
- ❌ A history of what happened and when → `<Timeline>`.
- ❌ Percentage progress → `<Progress>`.

#### Anti-patterns

- ❌ Encoding the outcome as an extra stage ("Closed Lost") instead of `tone="danger"`.
- ❌ `tone="success"` to celebrate reaching the last stage. Tone is for an outcome (won/lost), not for being on the final step.
- ❌ More than ~7 stages: labels truncate to uselessness. Group stages or show a summary.
- ❌ Wrapping StagePath in a wrapping `Cluster`: at `width: 100%` it drops onto its own line.
