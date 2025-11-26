---
"@statelyai/inspect": minor
---

Fixed DOM serialization issues that could cause the inspector to freeze when HTML elements or deeply nested structures were included in state context. Added `serializationDepthLimit` option (default: 10) to prevent infinite recursion during serialization. HTMLElement instances are now safely converted to their `outerHTML` string representation.
