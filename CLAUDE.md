# Vif - Natural Language Todo List

## Project Overview

**Vif** is a modern, AI-powered todo list application that understands natural language input and voice commands. Built with Next.js 15, React 19, and TypeScript, it leverages AI models (primarily OpenAI GPT-4o-mini, with support for Claude, Groq, Qwen, and DeepSeek) to intelligently parse user intentions and manage tasks.

**Key Differentiator**: Unlike traditional todo apps, Vif allows users to interact with their tasks using natural language like "buy groceries tomorrow at 3pm" or "mark the meeting with John as complete" instead of clicking through multiple UI elements.

## Technology Stack

### Frontend
- **Framework**: Next.js (latest) with App Router
- **React**: v19.0.0
- **TypeScript**: v5
- **Styling**: TailwindCSS v4.1.11
- **UI Components**: Shadcn UI (Radix UI primitives)
- **Icons**: Phosphor Icons
- **Animations**: Framer Motion
- **Date Handling**: date-fns

### AI/ML Services
- **AI SDK**: Vercel AI SDK v4.3.16
- **Providers**:
  - `@ai-sdk/openai` - Primary (GPT-4o-mini, Whisper)
  - `@ai-sdk/anthropic` - Claude 4 Sonnet
  - `@ai-sdk/groq` - Groq LLama models
  - `@ai-sdk/xai` - xAI integration
  - `@ai-sdk/elevenlabs` - Speech-to-text
- **Validation**: Zod schemas for AI response validation

### State & Data
- **Local Storage**: Custom React hooks with serialization
- **Remote Storage**: RemoteStorage.js protocol support
  - Integrates with ai-wallet module
  - Supports Todonna format imports
  - Cloud sync capabilities (Google Drive, Dropbox)
- **PWA**: Installable as Progressive Web App

### Build & Deployment
- **Build Tool**: Next.js with Turbopack
- **Static Export**: Configured for static site generation
- **Analytics**: Vercel Analytics
- **Deployment**: Vercel (configured via .vercel/)

## Project Structure

```
vif/
├── app/                        # Next.js App Router
│   ├── actions.ts             # Server/client actions for AI processing
│   ├── layout.tsx             # Root layout with theme provider
│   ├── page.tsx               # Home page (renders Todo component)
│   └── globals.css            # Global styles
│
├── components/
│   ├── todo/                  # Todo-specific components
│   │   ├── index.tsx          # Main Todo component (core logic)
│   │   ├── TodoList.tsx       # List rendering with animations
│   │   ├── TodoSkeleton.tsx   # Loading skeleton UI
│   │   ├── EmptyState.tsx     # Empty state UI
│   │   ├── LoadingState.tsx   # Loading state UI
│   │   ├── CircularProgress.tsx # Progress ring indicator
│   │   ├── CircleCheckbox.tsx # Custom checkbox component
│   │   ├── MicButton.tsx      # Microphone/send button
│   │   ├── TimePicker.tsx     # Time selection UI
│   │   ├── FaqContent.tsx     # Help/FAQ content
│   │   └── InputLoadingIndicator.tsx # Input loading state
│   │
│   ├── ui/                    # Shadcn UI components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── calendar.tsx
│   │   ├── dialog.tsx
│   │   ├── drawer.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── popover.tsx
│   │   ├── emoji-picker.tsx
│   │   └── ... (other UI primitives)
│   │
│   ├── ai-config.tsx          # RemoteStorage AI wallet config UI
│   ├── theme-provider.tsx     # next-themes provider
│   ├── theme-toggle.tsx       # Dark/light mode toggle
│   └── install-prompt.tsx     # PWA install prompt
│
├── hooks/
│   ├── use-local-storage.ts   # Local storage state management
│   ├── use-remote-storage.ts  # RemoteStorage singleton hook
│   ├── use-speech-recognition.ts # Voice recording & transcription
│   ├── use-todonna.ts         # Todonna format integration
│   ├── use-microphone-permission.ts # Mic permission state
│   └── use-media-query.ts     # Responsive breakpoints
│
├── lib/
│   ├── utils.ts               # Utility functions (cn, timezone)
│   ├── utils/todo.ts          # Todo-specific utilities
│   └── models.ts              # AI model configurations
│
├── types/
│   ├── index.ts               # Core type definitions
│   ├── actions.ts             # Action types for AI responses
│   └── jsx.d.ts               # JSX type declarations
│
├── public/
│   ├── manifest.json          # PWA manifest
│   └── ... (static assets)
│
└── Configuration Files
    ├── next.config.ts         # Next.js config (static export)
    ├── tsconfig.json          # TypeScript config
    ├── tailwind.config.js     # Tailwind config
    ├── postcss.config.mjs     # PostCSS config
    └── components.json        # Shadcn UI config
```

## Core Architecture

### 1. Main Todo Component (`components/todo/index.tsx`)

The heart of the application. Manages all state and orchestrates the todo lifecycle.

**Key State:**
- `todos`: Array of TodoItem objects (stored in localStorage)
- `selectedDate`: Current date view
- `selectedEmoji`: Emoji for new todos
- `sortBy`: Sort order (newest/oldest/alphabetical/completed)
- `isLoading`: AI processing state
- `isRecording`: Voice recording state
- `editingTodoId`: ID of todo being edited

**Key Features:**
- Natural language input processing via `handleAction()`
- Voice command support via speech recognition
- Date-based todo organization with calendar
- Real-time progress tracking
- RemoteStorage sync for cross-device access
- Responsive design (mobile/desktop)
- PWA standalone mode detection

**Flow:**
1. User enters text/voice command
2. `determineAction()` sends to AI with context (todos, timezone, date)
3. AI returns structured actions (add/delete/mark/edit/sort/clear)
4. Actions executed on local state
5. Changes persisted to localStorage
6. UI updates reactively

### 2. AI Action Processing (`app/actions.ts`)

**Function**: `determineAction(text, emoji, todos, model, timezone, apiKey)`

Uses Vercel AI SDK's `generateObject()` to parse natural language into structured actions.

**Input Processing:**
- Converts user text into actionable commands
- Considers current todo list for context
- Handles timezone-aware date parsing
- Supports multiple simultaneous actions

**Prompt Engineering:**
- Detailed instructions for date parsing ("tomorrow", "next monday", "in 3 days")
- Time extraction in 24-hour format (3pm -> 15:00)
- Past/future tense detection (add vs complete)
- Emoji suggestion based on task content
- ID-based todo matching (never text-based)

**Output Schema (Zod):**
```typescript
actions: Array<{
  action: "add" | "delete" | "mark" | "sort" | "edit" | "clear"
  text?: string              // Task text
  todoId?: string            // Target todo ID
  emoji?: string             // Task emoji
  targetDate?: string        // YYYY-MM-DD
  time?: string              // HH:mm (24-hour)
  sortBy?: "newest" | "oldest" | "alphabetical" | "completed"
  status?: "complete" | "incomplete"
  listToClear?: "all" | "completed" | "incomplete"
}>
```

**Model Support:**
- `vif-default`: grok-3-mini-fast (default)
- `vif-openai`: gpt-4o-mini
- `vif-claude`: claude-4-sonnet-20250514
- `vif-qwen`: qwen-qwq-32b
- `vif-r1`: deepseek-r1-0528

### 3. Type System (`types/`)

**TodoItem Interface:**
```typescript
interface TodoItem {
  id: string              // Unique identifier
  text: string            // Task description
  completed: boolean      // Completion status
  emoji?: string          // Visual indicator
  date: Date              // Target date
  time?: string           // Optional time (HH:mm)
  removed?: boolean       // Soft delete flag
}
```

**DetermineActionResponse:**
Defines the structure of AI responses with all possible action combinations.

### 4. Hooks System

**`use-local-storage.ts`:**
- React hook for persisted state
- Automatic JSON serialization
- SSR-safe hydration

**`use-speech-recognition.ts`:**
- MediaRecorder API integration
- Audio blob capture and processing
- Whisper API transcription via OpenAI
- Permission handling
- Multiple audio format support (webm, mp4, ogg)

**`use-remote-storage.ts`:**
- Singleton RemoteStorage instance
- Module loading (AI wallet, Todonna)
- Access claim management
- API key configuration
- Caching enablement

**`use-todonna.ts`:**
- Fetches todos from RemoteStorage Todonna format
- Sync event listeners
- Automatic import to today's date
- Deduplication logic

**`use-microphone-permission.ts`:**
- Tracks microphone permission state
- Handles permission prompts
- States: checking, granted, denied, prompt

### 5. Utilities (`lib/`)

**`utils/todo.ts`:**
- `serializeTodo()`: Ensures Date objects in todos
- `formatDate()`: Human-readable dates ("Today", "Tomorrow, Mon 21 Oct")
- `filterTodosByDate()`: Filters by selected date
- `sortTodos()`: Sorts by criteria
- `calculateProgress()`: Completion percentage

**`utils.ts`:**
- `cn()`: Class name merging with tailwind-merge
- `getDateInTimezone()`: Timezone-aware date calculation

### 6. UI Components

**TodoList Component:**
- Framer Motion animations for add/remove
- Inline editing with emoji picker
- Swipe gestures (mobile)
- Checkbox interactions
- Time display badges

**Calendar Integration:**
- react-day-picker for date selection
- Date highlighting for todos
- Today/tomorrow shortcuts

**Input System:**
- Emoji picker popover
- Voice/text input toggle
- Loading indicators
- Send button state management

**Theme System:**
- next-themes for dark/light mode
- System preference detection
- Persistent theme selection

## Data Flow

### Adding a Todo
```
User Input -> handleAction() -> determineAction() (AI) -> Action Response ->
State Update -> serializeTodo() -> setTodos() -> localStorage -> UI Render
```

### Voice Command
```
Mic Button -> startRecording() -> MediaRecorder -> audioChunks ->
stopRecording() -> Whisper API -> Text -> setNewTodo() -> handleAction()
```

### RemoteStorage Sync
```
Connection -> useTodonna() -> getListing() -> getObject() ->
Extract Items -> Map to TodoItem[] -> Deduplicate -> setTodos()
```

## Key Features in Detail

### Natural Language Processing
- **Date Intelligence**: "tomorrow", "next monday", "in 3 days", "friday"
- **Time Parsing**: "3pm", "14:30", "9am"
- **Contextual Actions**: "bought groceries" (marks complete) vs "buy groceries" (adds)
- **Multi-action Support**: Can execute multiple actions from one input
- **Smart Editing**: Partial match support ("meet" -> "meeting")

### Voice Commands
- Browser MediaRecorder API
- OpenAI Whisper for transcription
- Audio format negotiation (webm/mp4/ogg)
- Permission state management
- Error handling with user feedback

### Date Organization
- Calendar view for date selection
- Filter todos by selected date
- Visual progress indicator
- Today/tomorrow quick access
- Timezone-aware date handling

### RemoteStorage Integration
- Cross-device sync
- AI wallet for API key storage
- Todonna format import
- Google Drive / Dropbox backends
- Widget UI for connection management

### Progressive Web App
- Installable on mobile/desktop
- Offline capability (static export)
- Standalone mode detection
- Responsive design
- Manifest configuration

## State Management Strategy

1. **Local First**: All todos stored in localStorage
2. **Optimistic Updates**: UI updates immediately
3. **Soft Deletes**: Todos marked as `removed` instead of deleted
4. **Date Serialization**: Dates stored as ISO strings, parsed on load
5. **Client-Side Hydration**: Deferred rendering until client ready

## Build & Development

### Development
```bash
npm run dev --turbopack  # Start dev server with Turbopack
```

### Production
```bash
npm run build           # Static export to /out
npm run start          # Serve production build
```

### Environment Variables
Required in `.env.local`:
```
GROQ_API_KEY=your_groq_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

Note: Users can also provide API keys via RemoteStorage AI wallet.

## Performance Optimizations

1. **Turbopack**: Fast builds and HMR
2. **Static Export**: Pre-rendered HTML
3. **Code Splitting**: Dynamic imports for widgets
4. **Icon Optimization**: Package imports optimized
5. **Memoization**: React hooks prevent re-renders
6. **Suspense Boundaries**: Loading states
7. **Client-Side Rendering**: Deferred hydration

## Accessibility

- Semantic HTML structure
- Radix UI accessible primitives
- Keyboard navigation support
- ARIA labels on interactive elements
- Focus management
- Screen reader friendly

## Security Considerations

1. **API Keys**: Stored in RemoteStorage, not exposed
2. **Client-Side Processing**: AI calls use user's API key
3. **No Server**: Static export, no backend vulnerabilities
4. **CSP Ready**: Content Security Policy compatible
5. **Microphone Permissions**: Explicit user consent required

## Future Enhancement Areas

Based on codebase analysis:

1. **Undo/Redo**: No history tracking currently
2. **Todo Priority**: No priority/importance levels
3. **Tags/Categories**: Only emoji for categorization
4. **Recurring Tasks**: No repeat functionality
5. **Notifications**: No reminder system
6. **Collaboration**: Single-user focused
7. **Search**: No todo search feature
8. **Archive**: Removed todos not retrievable
9. **Export**: No data export (besides RemoteStorage)
10. **Drag & Drop**: No manual reordering

## Testing Strategy

Currently no test files present. Recommended additions:
- Unit tests for utility functions
- Integration tests for AI action parsing
- E2E tests for voice commands
- Component tests with React Testing Library

## License

MIT License - Copyright (c) 2025 Zaid Mukaddam

## Links

- **Live Site**: https://vif.mpeters.dev
- **Author**: https://zaidmukaddam.com
- **Repository**: (Not specified in code)

---

**Last Updated**: October 2025
**Codebase Analysis Date**: October 21, 2025
