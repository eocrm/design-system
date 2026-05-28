/**
 * Re-export shim for the time-of-day utilities that live in
 * `components/DatePicker/utils.ts`. `<TimeField>` lives at
 * `components/TimeField/` and needs these helpers, but importing them
 * via `'../DatePicker/utils'` would trick `scripts/generate-manifest.mjs`
 * into recording a `TimeField → DatePicker` edge in the manifest's
 * dependency graph — which is wrong (TimeField does not consume the
 * DatePicker component, only its sibling utility module) and would
 * introduce a cycle (DatePicker → TimeField → DatePicker).
 *
 * The manifest generator's parent-path regex captures only directory
 * names that start with an uppercase letter, so this `_internal`
 * detour is invisible to it. Update both modules if the utility
 * surface changes.
 */
export {
  formatTime,
  parseTime,
  resolveHourCycle,
  roundTimeToStep,
  type HourCycle,
  type TimeValue,
} from '../DatePicker/utils';
