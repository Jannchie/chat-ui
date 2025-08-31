# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Development

- `pnpm dev` - Start development server
- `pnpm build` - Build for production (includes TypeScript compilation)
- `pnpm preview` - Preview production build locally

### Code Quality

- `pnpm lint` - Run ESLint with auto-fix
- `pnpm test` - Run tests with Vitest

### Package Management

- Use `pnpm` for package management (not npm or yarn)

## Architecture Overview

### Tech Stack

- **Framework**: Vue 3 with Composition API and TypeScript
- **Styling**: UnoCSS with Tailwind-like utilities + Roku UI component library
- **Build Tool**: Vite
- **Router**: Vue Router 4
- **State Management**: Vue Composition API with IndexedDB persistence
- **HTTP Client**: OpenAI SDK for LLM API calls
- **Code Quality**: ESLint with custom @jannchie/eslint-config

### Key Features

- Chat UI for multiple LLM providers (OpenAI, Anthropic, OpenRouter, DeepSeek, etc.)
- Real-time streaming responses with typewriter effect
- Chat history persistence using IndexedDB
- Markdown rendering with syntax highlighting (Shiki)
- Mathematical formula rendering (KaTeX)
- PWA support with service worker

### Project Structure

```txt
src/
├── components/        # Vue components (auto-imported)
│   ├── ChatLayout.vue # Main chat interface
│   ├── ChatMessage.vue # Individual message display
│   └── ...
├── composables/       # Reusable composition functions
├── shared/           # Global state and configurations
│   └── index.ts      # API client, chat history, platform settings
├── utils/            # Utility functions
│   └── index.ts      # Markdown processing, chat management
├── views/            # Page components
└── router/           # Vue Router configuration
```

### State Management

- **Chat History**: Persisted in IndexedDB using `@vueuse/integrations/useIDBKeyval`
- **Settings**: Stored in localStorage (API keys, models, platform selection)
- **Current Chat**: Computed from route params and chat history

### API Integration

- Uses OpenAI SDK as universal client for all LLM providers
- Platform-specific configurations in `src/shared/index.ts`
- Dynamic base URL switching based on selected platform
- Streaming responses supported for real-time chat experience

### Auto-Import Configuration

- Vue composition functions auto-imported
- Components from `src/components/` and `src/views/` auto-imported
- Composables from `src/composables/` auto-imported
- VueUse utilities auto-imported

### Styling System

- UnoCSS with custom Roku UI preset
- Dark theme with custom CSS variables
- Responsive design with mobile-first approach
- Gradient animations and fade effects for enhanced UX

### Key Files to Understand

- `src/shared/index.ts` - Global state, API client configuration
- `src/components/ChatLayout.vue` - Main chat interface logic
- `src/utils/index.ts` - Markdown processing and chat utilities
- `src/composables/chat-types.ts` - Type definitions for chat messages
- `vite.config.ts` - Build configuration with PWA setup