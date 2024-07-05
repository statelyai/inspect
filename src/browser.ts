import safeStringify from 'fast-safe-stringify';
import { AnyEventObject, Observer, Subscribable, toObserver } from 'xstate';
import {
  InspectorOptions,
  createInspector,
  defaultInspectorOptions,
} from './createInspector';
import { Adapter, Inspector, StatelyInspectionEvent } from './types';
import { UselessAdapter } from './useless';

interface BrowserReceiver extends Subscribable<StatelyInspectionEvent> {}

export const CONNECTION_EVENT = '@statelyai.connected';

export function isEventObject(event: unknown): event is AnyEventObject {
  return (
    typeof event === 'object' &&
    event !== null &&
    typeof (event as any).type === 'string'
  );
}

export function isStatelyInspectionEvent(
  event: unknown
): event is StatelyInspectionEvent {
  return (
    typeof event === 'object' &&
    event !== null &&
    typeof (event as any).type === 'string' &&
    typeof (event as any)._version === 'string'
  );
}

export interface BrowserInspectorOptions extends InspectorOptions {
  url?: string;
  window?: Window;
  iframe?: HTMLIFrameElement | null;
}

interface OptionalBrowserInspectorOptions {
  send?: Adapter['send'];
}

/**
 * Creates a browser-based inspector that sends events to a remote inspector window.
 * The remote inspector opens an inspector window at the specified URL by default.
 */
export function createBrowserInspector(
  options?: BrowserInspectorOptions & OptionalBrowserInspectorOptions
): Inspector<BrowserAdapter> {
  const resolvedWindow =
    options?.window ?? (typeof window === 'undefined' ? undefined : window);

  if (!resolvedWindow) {
    console.error('Window does not exist; inspector cannot be started.');

    return new UselessAdapter() as any;
  }

  const resolvedOptions = {
    ...defaultInspectorOptions,
    url: 'https://stately.ai/inspect',
    filter: () => true,
    serialize: (inspectionEvent) => JSON.parse(safeStringify(inspectionEvent)),
    autoStart: true,
    iframe: null,
    ...options,
    window: resolvedWindow,
  } satisfies Required<BrowserInspectorOptions> &
    OptionalBrowserInspectorOptions;
  const adapter = new BrowserAdapter(resolvedOptions);
  const inspector = createInspector(adapter, resolvedOptions);

  // Start immediately
  if (resolvedOptions.autoStart) {
    inspector.start();
  }

  return inspector;
}

interface BrowserReceiverOptions {
  window?: Window;
  /**
   * The number of events from the current event to replay
   */
  replayCount?: number;
}

const defaultBrowserReceiverOptions: Required<BrowserReceiverOptions> = {
  replayCount: 0,
  window: typeof window !== 'undefined' ? window : (undefined as any),
};

export function createBrowserReceiver(
  options?: BrowserReceiverOptions
): BrowserReceiver {
  const resolvedOptions = {
    ...defaultBrowserReceiverOptions,
    ...options,
  };

  const browserWindow = resolvedOptions.window;

  const targetWindow: Window | null =
    browserWindow.self === browserWindow.top
      ? browserWindow.opener
      : browserWindow.parent;

  const observers = new Set<Observer<StatelyInspectionEvent>>();

  browserWindow.addEventListener('message', (event) => {
    if (!isStatelyInspectionEvent(event.data)) {
      return;
    }

    observers.forEach((observer) => observer.next?.(event.data));
  });

  const receiver: BrowserReceiver = {
    subscribe(observerOrFn) {
      const observer = toObserver(observerOrFn);
      observers.add(observer);

      return {
        unsubscribe() {
          observers.delete(observer);
        },
      };
    },
  };

  if (targetWindow) {
    targetWindow.postMessage(
      {
        type: CONNECTION_EVENT,
      },
      '*'
    );
  }

  return receiver;
}

export class BrowserAdapter implements Adapter {
  private status = 'disconnected' as 'disconnected' | 'connected';
  private deferredEvents: StatelyInspectionEvent[] = [];
  public targetWindow: Window | null = null;

  constructor(
    public options: Required<BrowserInspectorOptions> &
      OptionalBrowserInspectorOptions
  ) {}
  public start() {
    this.targetWindow = this.options.iframe
      ? null
      : this.options.window.open(String(this.options.url), 'xstateinspector');

    if (this.options.iframe) {
      this.options.iframe.addEventListener('load', () => {
        this.targetWindow = this.options.iframe?.contentWindow ?? null;
      });
      this.options.iframe?.setAttribute('src', String(this.options.url));
    }

    this.options.window.addEventListener('message', (event) => {
      if (
        isEventObject(event.data) &&
        event.data.type === '@statelyai.connected'
      ) {
        this.status = 'connected';
        this.deferredEvents.forEach((event) => {
          const serializedEvent = this.options.serialize(event);
          this.targetWindow?.postMessage(serializedEvent, '*');
        });
      }
    });
  }
  public stop() {
    this.targetWindow?.postMessage({ type: '@statelyai.disconnected' }, '*');
    this.status = 'disconnected';
  }
  public send(event: StatelyInspectionEvent) {
    const shouldSendEvent = this.options.filter(event);
    if (!shouldSendEvent) {
      return;
    }

    if (this.options.send) {
      this.options.send(event);
    } else if (this.status === 'connected') {
      const serializedEvent = this.options.serialize(event);
      this.targetWindow?.postMessage(serializedEvent, '*');
    }

    this.deferredEvents.push(event);

    // Remove the oldest event if we've reached the max deferred events
    if (this.deferredEvents.length > this.options.maxDeferredEvents) {
      this.deferredEvents.shift();
    }
  }
}
