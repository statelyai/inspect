---
"@statelyai/inspect": minor
---

Added new options `sanitizeContext` and `sanitizeEvent` to the inspector configuration. These options allow users to sanitize sensitive data from the context and events before they are sent to the inspector, and also to remove non-serializable data. 

Example usage:

```typescript
const inspector = createInspector({
  sanitizeContext: (context) => {
    // Remove sensitive data from context
    const { password, ...safeContext } = context;
    return safeContext;
  },
  sanitizeEvent: (event) => {
    // Remove sensitive data from event
    if (event.type === 'SUBMIT_FORM') {
      const { creditCardNumber, ...safeEvent } = event;
      return safeEvent;
    }
    return event;
  }
});
