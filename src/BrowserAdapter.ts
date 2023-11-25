import { Adapter, StatelyInspectionEvent } from './types';
import { BrowserInspectorOptions, isEventObject } from './browser';

export class BrowserAdapter implements Adapter {
  private status = 'closed' as 'closed' | 'open';
  private deferredEvents: StatelyInspectionEvent[] = [];
  private targetWindow: Window | null;

  constructor(public options: BrowserInspectorOptions = {}) {
    const resolvedOptions: Required<BrowserInspectorOptions> = {
      url: 'https://stately.ai/registry/inspect',
      ...options,
    };
    this.targetWindow = window.open(
      String(resolvedOptions.url),
      'xstateinspector'
    );
  }
  public start() {
    this.status = 'open';
    this.deferredEvents.forEach((event) => {
      this.targetWindow?.postMessage(event, '*');
    });

    window.addEventListener('message', (event) => {
      if (
        isEventObject(event.data) &&
        event.data.type === '@statelyai.connected'
      ) {
        this.deferredEvents.forEach((event) => {
          this.targetWindow?.postMessage(event, '*');
        });
      }
    });
  }
  public stop() {
    this.status = 'closed';
  }
  public send(event: StatelyInspectionEvent) {
    if (this.status === 'open') {
      this.targetWindow?.postMessage(event, '*');
    }
    this.deferredEvents.push(event);
  }
}
