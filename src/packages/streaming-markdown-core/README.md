# streaming-markdown-core

Framework-agnostic utilities for streaming Markdown UIs.

## Public API

- `splitContent(message)`
- `addFadeInClassToTreeNodes(children, loading, fadeInClass?)`
- `streamingTextStyles`
- `StreamingTextNode`

## Notes

- The current implementation keeps the existing behavior from the app.
- The core package no longer depends on Vue types.
- Vue-specific node adaptation lives in `streaming-markdown-vue`.
