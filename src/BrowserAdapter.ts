import { Adapter, StatelyInspectionEvent } from './types';
import { BrowserInspectorOptions, isEventObject } from './browser';

export class BrowserAdapter implements Adapter {
  private status = 'closed' as 'closed' | 'open';
  private deferredEvents: StatelyInspectionEvent[] = [];
  private targetWindow: Window | null;
  private options: Required<BrowserInspectorOptions>;

  constructor(options: BrowserInspectorOptions = {}) {
    const resolvedOptions: Required<BrowserInspectorOptions> = {
      url: 'https://stately.ai/registry/inspect',
      filter: () => true,
      ...options,
    };
    this.options = resolvedOptions;

    this.targetWindow = window.open(
      String(resolvedOptions.url),
      'xstateinspector'
    );
  }
  public start() {
    window.addEventListener('message', (event) => {
      if (
        isEventObject(event.data) &&
        event.data.type === '@statelyai.connected'
      ) {
        this.status = 'open';
        this.deferredEvents
          .filter((event) => {
            return event.type === '@xstate.actor';
          })
          .forEach((event) => {
            this.targetWindow?.postMessage(event, '*');
          });
      }
    });
  }
  public stop() {
    this.status = 'closed';
  }
  public send(event: StatelyInspectionEvent) {
    const shouldSendEvent = this.options.filter(event);
    if (!shouldSendEvent) {
      return;
    }

    if (this.status === 'open') {
      this.targetWindow?.postMessage(event, '*');
    }
    this.deferredEvents.push(event);
  }
}
