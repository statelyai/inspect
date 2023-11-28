import { Adapter, StatelyInspectionEvent } from './types';
import { BrowserInspectorOptions, isEventObject } from './browser';

export class BrowserAdapter implements Adapter {
  private status = 'disconnected' as 'disconnected' | 'connected';
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
      if (this.status === 'connected') {
        return;
      }
      if (
        isEventObject(event.data) &&
        event.data.type === '@statelyai.connected'
      ) {
        this.status = 'connected';
        this.deferredEvents.forEach((event) => {
          this.targetWindow?.postMessage(event, '*');
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
      this.targetWindow?.postMessage(event, '*');
    }
    this.deferredEvents.push(event);
  }
}
