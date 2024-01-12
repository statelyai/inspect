import { InspectorOptions } from './createInspector';
import { Adapter, StatelyInspectionEvent } from './types';

export class ConsoleAdapter implements Adapter {
  private status = 'disconnected' as 'disconnected' | 'connected';
  private deferredEvents: StatelyInspectionEvent[] = [];
  public targetWindow: Window | null = null;

  constructor(public options: Required<InspectorOptions>) {}
  public start() {
    this.status == 'connected';
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
      console.log(serializedEvent);
    } else {
      this.deferredEvents.push(event);
    }
  }
}
