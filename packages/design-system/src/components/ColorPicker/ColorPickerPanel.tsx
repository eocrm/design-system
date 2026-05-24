import {
  forwardRef,
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type HTMLAttributes,
  type KeyboardEvent,
} from 'react';
import clsx from 'clsx';
import { Slider } from '../Slider';
import { Input } from '../Input';
import { SVSquare } from './SVSquare';
import { hexToHsv, hsvToHex, normalizeHex, type HSV } from './colorMath';
import styles from './ColorPicker.module.scss';

export interface ColorPickerPanelProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Current color as `#RRGGBB`. Controlled — required. */
  value: string;
  /** Fires per drag tick + on input change + on preset click. High frequency during drags. */
  onChange: (hex: string) => void;
  /**
   * Fires on the trailing edge of an interaction — pointer release on the
   * SV pad / hue slider, blur on the HEX input, preset click. Use for
   * commit-style logic (network calls, history snapshots).
   */
  onChangeEnd?: (hex: string) => void;
  /**
   * Optional preset color swatches. If provided, rendered as a grid below
   * the hue slider. Clicking a swatch commits the color (fires both
   * onChange and onChangeEnd). Invalid entries are silently dropped.
   */
  presets?: string[];
  /** Disable interaction. */
  disabled?: boolean;
}

const FALLBACK_HSV: HSV = { h: 0, s: 0, v: 0 };
const FALLBACK_HEX = '#000000';

/**
 * The picker UI without the popover wrapping. Use directly as
 * `<ColorPicker.Panel>` for inline / always-visible color picking (theme
 * builders, settings pages, color cells in a grid). The popover-wrapped
 * `<ColorPicker>` composes this internally.
 *
 * Owns the local-HSV state-of-truth: the UI thinks in HSV (the SV pad
 * needs S+V, the hue strip needs H) but the consumer's contract is HEX.
 * Naive HEX→HSV-per-render is lossy at saturation=0 (gray) — dragging hue
 * at black would not update because HEX stays `#000000`. We track HSV
 * locally and only sync from the `value` prop when an external write
 * (consumer-driven, not our own) changes it.
 *
 * @example
 * const [hex, setHex] = useState('#4F46E5');
 * <ColorPicker.Panel value={hex} onChange={setHex} />
 *
 * @example
 * // With consumer-supplied preset swatches:
 * <ColorPicker.Panel
 *   value={hex}
 *   onChange={setHex}
 *   presets={['#4F46E5', '#10B981', '#F59E0B', '#EF4444']}
 * />
 *
 * @remarks When NOT to use
 * - When you need a compact trigger button. Use `<ColorPicker>` (popover
 *   variant) instead.
 * - For an uncontrolled picker. The component is controlled-only by design.
 */
export const ColorPickerPanel = forwardRef<HTMLDivElement, ColorPickerPanelProps>(
  function ColorPickerPanel(
    { value, onChange, onChangeEnd, presets, disabled = false, className, ...rest },
    ref,
  ) {
    // Local HSV state-of-truth. See class JSDoc above for the rationale.
    const [localHsv, setLocalHsv] = useState<HSV>(() => hexToHsv(value) ?? FALLBACK_HSV);

    // HEX input draft buffer — separate from the committed `value` so we can
    // hold transient invalid input ("#1" while the user types "#123456")
    // without disturbing the rest of the UI.
    const [draft, setDraft] = useState<string>(() => normalizeHex(value) ?? FALLBACK_HEX);

    // One-time dev warning for invalid initial value.
    const [warned, setWarned] = useState(false);
    useEffect(() => {
      if (!warned && hexToHsv(value) === null && process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn(
          `<ColorPicker> received invalid value=${JSON.stringify(value)}; falling back to ${FALLBACK_HEX}.`,
        );
        setWarned(true);
      }
    }, [value, warned]);

    // Sync local HSV when the consumer sets a NEW value externally.
    // We detect "external write" by comparing the normalized prop HEX to our
    // round-trip HEX of localHsv — if they differ, the consumer set it,
    // otherwise we set it and don't need to re-sync.
    useEffect(() => {
      const ourHex = hsvToHex(localHsv);
      const propHex = normalizeHex(value);
      if (propHex && propHex !== ourHex) {
        const incoming = hexToHsv(propHex);
        if (incoming) setLocalHsv(incoming);
      }
      // Intentionally not depending on localHsv — we are the writer, not the reader.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    // Sync draft input when value changes externally.
    useEffect(() => {
      const normalized = normalizeHex(value);
      if (normalized && normalized !== normalizeHex(draft)) {
        setDraft(normalized);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const updateHsv = useCallback(
      (next: HSV) => {
        setLocalHsv(next);
        onChange(hsvToHex(next));
      },
      [onChange],
    );

    // SV pad handlers.
    const handleSVChange = useCallback(
      (s: number, v: number) => {
        updateHsv({ ...localHsv, s, v });
      },
      [localHsv, updateHsv],
    );

    const handleSVChangeEnd = useCallback(() => {
      onChangeEnd?.(hsvToHex(localHsv));
    }, [localHsv, onChangeEnd]);

    // Hue slider handlers. Slider passes number | [number, number]; this
    // picker uses single-thumb mode so we narrow to number.
    const handleHueChange = useCallback(
      (next: number | [number, number]) => {
        const h = typeof next === 'number' ? next : next[0];
        updateHsv({ ...localHsv, h });
      },
      [localHsv, updateHsv],
    );

    const handleHueChangeEnd = useCallback(() => {
      onChangeEnd?.(hsvToHex(localHsv));
    }, [localHsv, onChangeEnd]);

    // HEX input handlers.
    const handleHexChange = useCallback(
      (e: ChangeEvent<HTMLInputElement>) => {
        const next = e.target.value;
        setDraft(next);
        const normalized = normalizeHex(next);
        if (normalized) {
          const incoming = hexToHsv(normalized);
          if (incoming) {
            setLocalHsv(incoming);
            onChange(normalized);
          }
        }
      },
      [onChange],
    );

    const handleHexBlur = useCallback(() => {
      const normalized = normalizeHex(draft);
      if (normalized) {
        // Re-snap to canonical form (uppercase, with `#`, 6-char).
        setDraft(normalized);
        onChangeEnd?.(normalized);
      } else {
        // Invalid on blur — revert to the canonical HEX of the current value.
        setDraft(normalizeHex(value) ?? FALLBACK_HEX);
      }
    }, [draft, value, onChangeEnd]);

    const handleHexKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        // Trigger blur to commit / revert.
        e.currentTarget.blur();
      }
    }, []);

    // Preset click handler.
    const handlePresetClick = useCallback(
      (preset: string) => {
        const normalized = normalizeHex(preset);
        if (!normalized) return;
        const incoming = hexToHsv(normalized);
        if (!incoming) return;
        setLocalHsv(incoming);
        setDraft(normalized);
        onChange(normalized);
        onChangeEnd?.(normalized);
      },
      [onChange, onChangeEnd],
    );

    const draftIsValid = normalizeHex(draft) !== null;
    const currentNormalized = normalizeHex(value) ?? FALLBACK_HEX;

    return (
      <div
        ref={ref}
        className={clsx(styles.panel, disabled && styles.panelDisabled, className)}
        {...rest}
      >
        <SVSquare
          hue={localHsv.h}
          s={localHsv.s}
          v={localHsv.v}
          onChange={handleSVChange}
          onChangeEnd={handleSVChangeEnd}
          disabled={disabled}
        />
        <div className={styles.hueSlider}>
          <Slider
            value={localHsv.h}
            onChange={handleHueChange}
            onChangeEnd={handleHueChangeEnd}
            min={0}
            max={360}
            step={1}
            disabled={disabled}
            aria-label="Hue"
          />
        </div>
        <Input
          size="sm"
          value={draft}
          onChange={handleHexChange}
          onBlur={handleHexBlur}
          onKeyDown={handleHexKeyDown}
          invalid={!draftIsValid && draft !== ''}
          disabled={disabled}
          aria-label="Hex color value"
          className={styles.hexInput}
          spellCheck={false}
          autoCapitalize="none"
          autoComplete="off"
        />
        {presets && presets.length > 0 && (
          <div className={styles.presets} role="group" aria-label="Preset colors">
            {presets.map((preset, idx) => {
              const normalized = normalizeHex(preset);
              if (!normalized) return null;
              const selected = normalized === currentNormalized;
              return (
                <button
                  key={`${normalized}-${idx}`}
                  type="button"
                  className={clsx(styles.presetSwatch, selected && styles.presetSwatchSelected)}
                  style={{ backgroundColor: normalized }}
                  aria-label={normalized}
                  aria-pressed={selected}
                  disabled={disabled}
                  onClick={() => handlePresetClick(normalized)}
                />
              );
            })}
          </div>
        )}
      </div>
    );
  },
);
