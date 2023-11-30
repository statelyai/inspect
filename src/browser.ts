import { AnyEventObject, Observer, Subscribable, toObserver } from 'xstate';
import { Inspector, StatelyInspectionEvent } from './types';
import { InspectorOptions, createInspector } from './createInspector';
import { BrowserAdapter } from './BrowserAdapter';

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
}

/**
 * Creates a browser-based inspector that sends events to a remote inspector window.
 * The remote inspector opens an inspector window at the specified URL by default.
 */
export function createBrowserInspector(
  options?: BrowserInspectorOptions
): Inspector<BrowserAdapter> {
  const adapter = new BrowserAdapter(options);

  adapter.start();

  const inspector = createInspector(adapter);

  return inspector;
}

interface BrowserReceiverOptions {
  /**
   * The number of events from the current event to replay
   */
  replayCount?: number;
}

const defaultBrowserReceiverOptions: Required<BrowserReceiverOptions> = {
  replayCount: 0,
};

export function createBrowserReceiver(
  options?: BrowserReceiverOptions
): BrowserReceiver {
  const resolvedOptions = {
    ...defaultBrowserReceiverOptions,
    ...options,
  };

  const targetWindow: Window | null =
    window.self === window.top ? window.opener : window.parent;

  const observers = new Set<Observer<StatelyInspectionEvent>>();

  window.addEventListener('message', (event) => {
    if (!isStatelyInspectionEvent(event.data)) {
      return;
    }

    observers.forEach((observer) => observer.next?.(event.data));
  });

  const receiver: BrowserReceiver = {
    subscribe(observerOrFn) {
      const observer = toObserver(observerOrFn);
      observers.add(observer);
      // const listener = (event: MessageEvent) => {
      //   observer.next?.(event.data);
      // };

      // window.addEventListener('message', listener);

      return {
        unsubscribe() {
          // window.removeEventListener('message', listener);
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
