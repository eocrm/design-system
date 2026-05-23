import type { ReactNode } from 'react';
import {
  store,
  generateId,
  type ToastTone,
  type ToastPosition,
  type ToastInput,
} from './store';

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

/** Partial shape accepted by `toast.update`. id/createdAt/status are internal-only. */
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

function buildInput(
  tone: ToastTone,
  message: ReactNode,
  options: ToastOptions = {}
): ToastInput {
  const isLoading = tone === 'loading';
  const duration =
    options.duration ?? (isLoading ? 'persistent' : viewportConfig.duration);
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

function fire(
  tone: ToastTone,
  message: ReactNode,
  options?: ToastOptions
): string {
  return store.add(buildInput(tone, message, options));
}

type PromiseMessages<T> = {
  loading: string;
  success: string | ((value: T) => string);
  error: string | ((err: unknown) => string);
  options?: Omit<ToastOptions, 'duration'>;
};

export const toast = Object.assign(
  (message: ReactNode, options?: ToastOptions) => fire('info', message, options),
  {
    info: (m: ReactNode, o?: ToastOptions) => fire('info', m, o),
    success: (m: ReactNode, o?: ToastOptions) => fire('success', m, o),
    warning: (m: ReactNode, o?: ToastOptions) => fire('warning', m, o),
    error: (m: ReactNode, o?: ToastOptions) => fire('error', m, o),
    loading: (m: ReactNode, o?: ToastOptions) => fire('loading', m, o),
    update: (id: string, partial: ToastUpdateOptions): void => {
      store.update(id, partial);
    },
    dismiss: (id?: string): void => store.dismiss(id),
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
          const errorMsg =
            typeof msgs.error === 'function' ? msgs.error(err) : msgs.error;
          store.update(id, {
            tone: 'error',
            message: errorMsg,
            duration: viewportConfig.duration,
            status: 'visible',
          });
          throw err;
        }
      );
    },
  }
);
