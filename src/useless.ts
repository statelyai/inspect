import { InspectorOptions } from './createInspector';
import { Adapter, StatelyInspectionEvent } from './types';

export class UselessAdapter implements Adapter {
  constructor() {}
  public start() {
    // ...
  }
  public stop() {
    // ...
  }
  public send(_event: StatelyInspectionEvent) {
    // ...
  }
}
