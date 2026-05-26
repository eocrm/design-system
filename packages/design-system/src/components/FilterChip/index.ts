export { FilterChip } from './FilterChip';
export type {
  FilterChipProps,
  FilterChipLabelProps,
  FilterChipValueProps,
} from './FilterChip';
// Re-export the tone type so consumers using FilterChip.Value tone={...}
// can import the union from the same module rather than reaching into Badge.
export type { BadgeTone } from '../Badge';
