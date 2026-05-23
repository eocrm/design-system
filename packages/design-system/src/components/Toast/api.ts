import type { ReactNode } from 'react';
import { store, generateId, type ToastTone, type ToastPosition, type ToastInput } from './store';

export interface ToastOptions {
  /** Optional second-line content. ReactNode so consumers can embed links/icons. */
  description?: ReactNode;
  /** Auto-dismiss timeout (ms) or `'persistent'` for no auto-dismiss. Default: 4000. */
  duration?: number | 'persistent';
  /** Per-call override of the viewport's default position. */
  position?: ToastPosition;
  /** Stable id (else auto-generated). Reusing an existing id triggers an update. */
  id?: string;
  /** Single primary action button rendered inside the toast. */
  action?: { label: string; onClick: () => void };
  /** Show the close (×) button. Default: true. Forced true when `duration: 'persistent'`. */
  dismissible?: boolean;
  /** Override the tone's default icon. Pass `null` to hide. */
  icon?: ReactNode | null;
}

/**
 * Partial shape accepted by `toast.update`. Any writable field of a live toast
 * may be changed. The `id`, `createdAt`, and `status` fields are managed
 * internally and cannot be patched directly through this type.
 */
export type ToastUpdateOptions = Partial<
  Omit<ToastOptions, 'id'> & { message: ReactNode; tone: ToastTone }
>;

interface ViewportConfig {
  position: ToastPosition;
  duration: number;
}

/** Mutable defaults written by ToastViewport on mount. Module-level so the API
 *  layer can read them without depending on React. If no viewport mounts, the
 *  constants below stand in — toasts fired into the void are stored but never
 *  rendered, which is the correct behavior. */
let viewportConfig: ViewportConfig = { position: 'bottom-right', duration: 4000 };

/** Called by ToastViewport. NOT exported from the package barrel. */
export function _setViewportConfig(cfg: ViewportConfig): void {
  viewportConfig = cfg;
}

function buildInput(tone: ToastTone, message: ReactNode, options: ToastOptions = {}): ToastInput {
  const isLoading = tone === 'loading';
  const duration = options.duration ?? (isLoading ? 'persistent' : viewportConfig.duration);
  const isPersistent = duration === 'persistent';
  return {
    id: options.id ?? generateId(),
    tone,
    message,
    description: options.description,
    duration,
    position: options.position ?? viewportConfig.position,
    action: options.action,
    // Persistent toasts force dismissible: true so the user has a way out.
    dismissible: isPersistent ? true : (options.dismissible ?? true),
    icon: options.icon,
  };
}

function fire(tone: ToastTone, message: ReactNode, options?: ToastOptions): string {
  return store.add(buildInput(tone, message, options));
}

type PromiseMessages<T> = {
  loading: string;
  success: string | ((value: T) => string);
  error: string | ((err: unknown) => string);
  options?: Omit<ToastOptions, 'duration'>;
};

/**
 * Fire an informational toast (the default tone). Equivalent to `toast.info(message, options)`.
 *
 * All `toast.*` methods return the toast id (string) so it can be passed to
 * `toast.update` or `toast.dismiss` later.
 *
 * @example
 * // Quick one-liner
 * toast('Profile saved');
 *
 * @example
 * // With a description and action
 * toast('File deleted', {
 *   description: 'This action cannot be undone.',
 *   action: { label: 'Undo', onClick: handleUndo },
 * });
 */
export const toast = Object.assign(
  (message: ReactNode, options?: ToastOptions): string => fire('info', message, options),
  {
    /**
     * Fire an informational toast. Returns the toast id.
     */
    info: (m: ReactNode, o?: ToastOptions): string => fire('info', m, o),
    /**
     * Fire a success toast. Returns the toast id.
     */
    success: (m: ReactNode, o?: ToastOptions): string => fire('success', m, o),
    /**
     * Fire a warning toast. Returns the toast id.
     */
    warning: (m: ReactNode, o?: ToastOptions): string => fire('warning', m, o),
    /**
     * Fire an error toast. Returns the toast id. Error toasts use `role="alert"`
     * and `aria-live="assertive"` for immediate screen-reader announcement.
     */
    error: (m: ReactNode, o?: ToastOptions): string => fire('error', m, o),
    /**
     * Fire a loading toast. Returns the toast id. Defaults to
     * `duration: 'persistent'` — the toast stays until explicitly updated or
     * dismissed (e.g. via `toast.update` once the async work completes).
     */
    loading: (m: ReactNode, o?: ToastOptions): string => fire('loading', m, o),
    /**
     * Mutate a live toast by id. Any field in `ToastUpdateOptions` may be
     * patched. Commonly used to transition a loading toast to success/error
     * once an async operation settles.
     *
     * If the id does not correspond to a currently-stored toast the call is a
     * no-op — there is no resurrection of dismissed toasts.
     */
    update: (id: string, partial: ToastUpdateOptions): void => {
      store.update(id, partial);
    },
    /**
     * Dismiss a toast by id. If `id` is omitted, all currently visible toasts
     * are dismissed at once. The toast plays its exit animation before being
     * removed from the store.
     */
    dismiss: (id?: string): void => store.dismiss(id),
    /**
     * Track a promise with automatic loading → success/error transitions.
     * Returns the original promise so the call is awaitable and chainable.
     * Rejections are re-thrown after updating the toast to the error state —
     * callers should handle them with `.catch()` if they don't want an
     * unhandled-rejection warning.
     *
     * @example
     * await toast.promise(uploadFile(file), {
     *   loading: 'Uploading…',
     *   success: (res) => `Uploaded ${res.filename}`,
     *   error: (err) => `Upload failed: ${err.message}`,
     * });
     */
    promise<T>(p: Promise<T>, msgs: PromiseMessages<T>): Promise<T> {
      const id = fire('loading', msgs.loading, msgs.options);
      return p.then(
        (value) => {
          const successMsg =
            typeof msgs.success === 'function' ? msgs.success(value) : msgs.success;
          store.update(id, {
            tone: 'success',
            message: successMsg,
            duration: viewportConfig.duration,
            status: 'visible',
          });
          return value;
        },
        (err) => {
          const errorMsg = typeof msgs.error === 'function' ? msgs.error(err) : msgs.error;
          store.update(id, {
            tone: 'error',
            message: errorMsg,
            duration: viewportConfig.duration,
            status: 'visible',
          });
          throw err;
        },
      );
    },
  },
);
