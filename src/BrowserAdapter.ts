import { Adapter, StatelyInspectionEvent } from './types';
import { BrowserInspectorOptions, isEventObject } from './browser';
import safeStringify from 'fast-safe-stringify';

export class BrowserAdapter implements Adapter {
  private status = 'disconnected' as 'disconnected' | 'connected';
  private deferredEvents: StatelyInspectionEvent[] = [];
  public targetWindow: Window | null = null;
  private options: Required<BrowserInspectorOptions>;

  constructor(options: BrowserInspectorOptions = {}) {
    const resolvedOptions: Required<BrowserInspectorOptions> = {
      url: 'https://stately.ai/registry/inspect',
      filter: () => true,
      serialize: (event) => JSON.parse(safeStringify(event)),
      iframe: null,
      ...options,
      window: options.window ?? window,
    };
    this.options = resolvedOptions;
  }
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

    if (this.status === 'connected') {
      const serializedEvent = this.options.serialize(event);
      this.targetWindow?.postMessage(serializedEvent, '*');
    }
    this.deferredEvents.push(event);
  }
}
