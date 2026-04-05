# streaming-markdown-vue

Vue bindings and runtime helpers for streaming Markdown rendering.

## Public API

- `addFadeInToVNodes(children, loading, fadeInClass?)`
- `md`
- `isKatexLoaded`
- `isShikiLoaded`
- `loadKatex()`
- `loadShiki()`
- `createStreamingMarkdownVNodes(content, loading)`
- `createReasoningMarkdownVNodes(reasoning, options?)`
- `createVNodeRendererComponent(vnodes)`
- `bindStreamingMarkdownTrigger(vnodes, source, debounce?)`

## Notes

- The package currently preserves the app's existing runtime behavior.
- `fadeIn.ts` adapts the framework-agnostic tree animation helper for Vue VNodes.
- `runtime.ts` owns the Markdown renderer instance and lazy capability loading.
- `useStreamingMarkdown.ts` contains the repeated Vue wiring that was previously duplicated inside app components.
