# Streaming Text Component Guide

This guide shows how to extract and use the streaming text functionality in other projects.

## Overview

The streaming text feature provides a typewriter-like effect where text appears gradually with smooth fade-in animations. It intelligently splits content at sentence boundaries to avoid displaying incomplete thoughts.

## Core Features

- **Smart Content Splitting**: Avoids displaying incomplete sentences
- **Fade-in Animation**: Smooth opacity transitions for new text
- **Debounced Loading State**: Prevents flickering during rapid updates
- **Configurable Delays**: Customizable animation and debounce timing
- **Multi-language Support**: Handles both English and Chinese punctuation

## Files to Copy

### 1. StreamingText Component (`src/components/StreamingText.vue`)
A ready-to-use Vue component with all the streaming functionality.

### 2. useStreamingText Composable (`src/composables/useStreamingText.ts`)
A composable that provides utilities for building custom streaming implementations.

### 3. CSS Animations
Add these styles to your global CSS:

```css
.fade-in {
  opacity: 0;
  animation: fadeIn 1s forwards;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

## Installation & Setup

### Step 1: Copy Files
Copy the following files to your project:
- `StreamingText.vue` → your components directory
- `useStreamingText.ts` → your composables directory

### Step 2: Install Dependencies
Ensure you have these Vue/VueUse dependencies:
```bash
npm install @vueuse/core
```

### Step 3: Add CSS
Add the fade-in animation CSS to your global styles.

## Usage Examples

### Method 1: Using the StreamingText Component

```vue
<script setup>
import StreamingText from './components/StreamingText.vue'

const messageContent = ref('')
const isStreaming = ref(false)

// Simulate streaming
function simulateStreaming() {
  isStreaming.value = true
  const text = 'This is streaming text...'
  let index = 0

  const interval = setInterval(() => {
    if (index < text.length) {
      messageContent.value += text[index]
      index++
    }
    else {
      isStreaming.value = false
      clearInterval(interval)
    }
  }, 50)
}
</script>

<template>
  <StreamingText
    :content="messageContent"
    :loading="isStreaming"
    :debounce-delay="1000"
    :split-delay="300"
  />
</template>
```

### Method 2: Using the Composable

```vue
<script setup>
import { useStreamingText } from './composables/useStreamingText'

const { createStreamingState } = useStreamingText({
  debounceDelay: 1000,
  fadeInClass: 'custom-fade-in',
})

const streamingState = createStreamingState()

// Update content
streamingState.updateContent('New streaming text')
streamingState.setLoading(true)
</script>

<template>
  <div
    :class="streamingState.debouncedLoading.value ? 'fade-in' : ''"
    v-text="streamingState.contentFinal.value"
  />
</template>
```

### Method 3: For Markdown Content with VNode Manipulation

If you need to add streaming animations to rendered markdown or other VNode structures:

```vue
<script setup>
import { useStreamingText } from './composables/useStreamingText'

const { editResult } = useStreamingText()

// In your markdown rendering logic
const processedVNodes = computed(() => {
  const vnodes = markdownRenderer.render(content.value)
  return editResult(vnodes, isLoading.value)
})
</script>
```

## Configuration Options

### StreamingText Props
- `content: string` - The text content to display
- `loading: boolean` - Whether streaming is active
- `debounceDelay?: number` - Delay before hiding loading state (default: 1000ms)
- `splitDelay?: number` - Debounce delay for content updates (default: 300ms)
- `fadeInClass?: string` - CSS class for fade animation (default: 'fade-in')

### useStreamingText Options
- `debounceDelay?: number` - Loading state debounce delay
- `splitDelay?: number` - Content update debounce delay
- `fadeInClass?: string` - CSS class for animations

## Advanced Usage

### Custom Animation Classes
```vue
<StreamingText
  :content="content"
  :loading="loading"
  fade-in-class="my-custom-animation"
/>
```

```css
.my-custom-animation {
  opacity: 0;
  transform: translateY(10px);
  animation: slideInFade 0.8s ease-out forwards;
}

@keyframes slideInFade {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Integration with LLM Streaming APIs

```javascript
async function streamFromLLM(prompt) {
  streamingState.setLoading(true)
  streamingState.updateContent('')

  const stream = await openai.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    stream: true,
  })

  let accumulatedContent = ''
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || ''
    accumulatedContent += content
    streamingState.updateContent(accumulatedContent)
  }

  streamingState.setLoading(false)
}
```

## Browser Compatibility

- Modern browsers supporting CSS animations
- Vue 3 with Composition API
- ES2020+ for optional chaining and nullish coalescing

## Performance Notes

- The component uses debouncing to prevent excessive DOM updates
- VNode manipulation is optimized for large content trees
- Memory usage is minimal as it doesn't store intermediate states

## Troubleshooting

### Animation Not Working
- Ensure the CSS animation is included in your global styles
- Check that the fade-in class name matches your CSS

### Content Cutting Off
- The smart splitting algorithm may be too aggressive for your content
- Consider adjusting the regex patterns in `splitContent()`

### Performance Issues
- Increase debounce delays for very fast streaming
- Consider using `splitDelay` for content that updates frequently

## Migration from Existing Implementation

If you already have streaming text in your project:

1. Replace direct VNode manipulation with the `editResult` function
2. Use `splitContent` for smarter text splitting
3. Replace manual debouncing with the composable's built-in debouncing
4. Update CSS classes to use the new animation system
