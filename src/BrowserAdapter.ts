import { Adapter, StatelyInspectionEvent } from './types';
import { BrowserInspectorOptions, isEventObject } from './browser';
import safeStringify from 'fast-safe-stringify';

export class BrowserAdapter implements Adapter {
  private status = 'disconnected' as 'disconnected' | 'connected';
  private deferredEvents: StatelyInspectionEvent[] = [];
  public targetWindow: Window | null;
  private options: Required<BrowserInspectorOptions>;

  constructor(options: BrowserInspectorOptions = {}) {
    const resolvedOptions: Required<BrowserInspectorOptions> = {
      url: 'https://stately.ai/registry/inspect',
      filter: () => true,
      serialize: (event) => JSON.parse(safeStringify(event)),
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
      if (this.status === 'connected') {
        return;
      }
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
    this.status = 'disconnected';
  }
  public send(event: StatelyInspectionEvent) {
    const shouldSendEvent = this.options.filter(event);
    if (!shouldSendEvent) {
      return;
    }

    if (this.status === 'connected') {
      const serializedEvent = this.options.serialize(event);
      this.targetWindow?.postMessage(serializedEvent, '*');
    }
    this.deferredEvents.push(event);
  }
}
