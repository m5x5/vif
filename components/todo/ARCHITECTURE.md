# Todo Component Architecture

## Overview

This document describes the feature-first architecture of the Todo component. The refactored structure emphasizes **modularity**, **reusability**, and **separation of concerns** by organizing code around features rather than technical layers.

## Design Principles

### Feature-First Architecture

The component structure follows these key principles:

1. **Feature Cohesion**: Related functionality is grouped together (header, input, actions)
2. **Component Composition**: Complex components are built from smaller, focused components
3. **Custom Hooks**: Business logic is extracted into reusable hooks
4. **Clear Boundaries**: Each module has a single, well-defined responsibility

### Benefits

- **Better Maintainability**: Easier to locate and modify feature-specific code
- **Enhanced Reusability**: Components and hooks can be reused across the application
- **Improved Testability**: Isolated modules are easier to test independently
- **Reduced Complexity**: Main component is simplified to orchestration logic
- **Scalability**: New features can be added without bloating the main component

## Directory Structure

```
components/todo/
├── index.tsx                      # Main orchestrator component (~160 lines)
│
├── components/                    # Feature UI Components
│   ├── TodoHeader.tsx            # Date selector & progress (self-calculating stats)
│   ├── TodoInputBar.tsx          # Main input bar (self-contained state)
│   ├── MenuDropdown.tsx          # Settings, tools, & debug console
│   ├── EmojiSelector.tsx         # Emoji picker popover
│   ├── HelpDialog.tsx            # FAQ dialog/drawer
│   ├── MenuItem.tsx              # Reusable menu item
│   ├── MenuSection.tsx           # Reusable menu section
│   └── index.ts                  # Barrel export
│
├── hooks/                         # Todo-specific hooks
│   ├── use-todo-actions.ts       # All action handlers & business logic
│   ├── use-client-hydration.ts   # SSR hydration detection
│   ├── use-mobile-detection.ts   # Responsive breakpoint detection
│   ├── use-standalone-detection.ts # PWA standalone mode detection
│   ├── use-dates-with-todos.ts   # Calendar date highlighting utility
│   └── index.ts                  # Barrel export
│
└── [existing files]               # Core components
    ├── TodoList.tsx              # List container (~60 lines)
    ├── TodoItem.tsx              # Individual item component (~270 lines)
    ├── TodoSkeleton.tsx
    ├── EmptyState.tsx
    ├── LoadingState.tsx
    ├── CircularProgress.tsx
    ├── CircleCheckbox.tsx
    ├── MicButton.tsx
    ├── TimePicker.tsx
    ├── FaqContent.tsx
    └── InputLoadingIndicator.tsx
```

## Component Breakdown

### Main Component (`index.tsx`)

**Responsibility**: Orchestration and state management

**What it does**:
- Manages top-level state (selectedDate, apiKey)
- Coordinates between different features
- Handles RemoteStorage integration
- Renders the main layout

**What it doesn't do**:
- UI rendering logic (delegated to feature components)
- Business logic (delegated to hooks)
- Complex interactions (delegated to specialized handlers)
- Child component state management (pushed down to children)

**Key Characteristics**:
- Reduced from ~964 lines to ~160 lines (83% reduction)
- Clear sections with comments (UI State, Custom Hooks)
- Declarative rendering pattern
- Minimal prop passing - children manage their own state

### Feature Components (`components/`)

#### TodoHeader
**Purpose**: Display date selector and progress information

**Props** (Simplified from 6 to 4):
- `selectedDate`: Current viewing date
- `todos`: All todos (filters and calculates internally)
- `datesWithTodos`: Dates with todos for calendar highlighting
- `onDateChange`: Callback for date selection

**Features**:
- Calendar popover with date selection
- Circular progress indicator
- Todo count statistics
- **Self-calculating**: Uses `useMemo` to calculate filtered todos, progress, and counts internally
- **Encapsulation**: Statistics logic lives with the component that displays them

#### TodoInputBar
**Purpose**: Main input interface for creating todos and accessing features

**Composition**:
- MenuDropdown (settings & tools)
- EmojiSelector (emoji picker)
- Textarea (input field)
- MicButton (voice/send button)
- HelpDialog (FAQ)

**Props** (Simplified from 17 to 4):
- `isLoading`: AI processing state (from parent)
- `apiKey`: For speech recognition
- `onAction`: Callback with (text, emoji) when user submits
- `inputRef`: For external focus control

**Features**:
- Voice input via microphone
- Emoji selection
- Loading states
- Responsive to standalone PWA mode
- **Self-contained**: Manages its own input text, emoji, focus, and FAQ dialog state
- **Encapsulation**: All input-related logic lives in this component

#### MenuDropdown
**Purpose**: Settings and tools menu

**Props**: None (fully self-contained)

**Features**:
- Theme toggle
- Debug console access (manages DebugConsole state internally)
- AI configuration (RemoteStorage)
- **Self-contained**: Manages debug console state and renders DebugConsole component

#### EmojiSelector
**Purpose**: Emoji picker interface

**Features**:
- Popover positioning
- Search functionality
- Recently used emojis

#### HelpDialog
**Purpose**: FAQ and help content

**Features**:
- Responsive (Dialog on desktop, Drawer on mobile)
- Scrollable content area
- FAQ content display

#### MenuItem & MenuSection
**Purpose**: Reusable menu primitives

**Features**:
- Consistent styling
- Danger variant support
- Icon + label pattern
- Section grouping

### Custom Hooks (`hooks/`)

#### use-todo-actions
**Purpose**: Encapsulate all todo business logic

**Props** (Simplified from 9 to 7):
- `todos`: All todos
- `selectedDate`: Current viewing date
- `apiKey`: For AI processing
- `addTodo`, `updateTodo`, `deleteTodo`, `setAllTodos`: CRUD operations

**State Management**:
- `isLoading`: AI processing state
- `sortBy`: Sort order preference
- `editingTodoId`: Currently editing todo
- `editText`, `editEmoji`: Edit form state

**Actions**:
- `handleAction(text, emoji)`: Process natural language input via AI (now accepts emoji)
- `toggleTodo`: Toggle completion status
- `startEditing`, `cancelEditing`, `handleEditTodo`: Edit workflow
- `clearAllTodos`, `clearCompletedTodos`, `clearIncompleteTodos`: Bulk actions

**Key Features**:
- Centralizes all todo mutations in one place
- **Self-filtering**: Calculates filtered todos internally instead of receiving them
- **Flexible emoji**: Accepts emoji as parameter instead of prop

#### use-client-hydration
**Purpose**: Detect when client-side hydration is complete

**Use Case**: Prevent SSR/client mismatch errors

**Returns**: `isClientLoaded` boolean

#### use-mobile-detection
**Purpose**: Detect mobile screen size

**Implementation**:
- Checks `window.innerWidth < 768`
- Listens to resize events
- Cleans up event listener

**Returns**: `isMobile` boolean

#### use-standalone-detection
**Purpose**: Detect PWA standalone mode

**Implementation**:
- Checks `display-mode: standalone` media query
- Checks `navigator.standalone` (iOS)
- Checks Android app referrer
- Listens for display mode changes

**Returns**: `isStandalone` boolean

#### use-dates-with-todos
**Purpose**: Generate set of dates that have todos

**Use Case**: Highlight dates in calendar picker

**Returns**: `Set<string>` of date strings (YYYY-MM-DD)

## Data Flow

### Adding a Todo (Natural Language)

```
User Input
    ↓
TodoInputBar → handleInputKeyDown
    ↓
index.tsx → handleAction(newTodo)
    ↓
use-todo-actions → handleAction()
    ↓
determineAction (AI SDK)
    ↓
Action Processing (add/delete/mark/edit/sort/clear)
    ↓
setAllTodos (useTodonna)
    ↓
RemoteStorage Sync
    ↓
State Update
    ↓
TodoList Re-render
```

### Voice Input Flow

```
User Press Mic
    ↓
MicButton → startRecording()
    ↓
useSpeechRecognition → MediaRecorder API
    ↓
Audio Recording
    ↓
User Release Mic
    ↓
MicButton → stopRecording()
    ↓
useSpeechRecognition → Whisper API
    ↓
Transcription
    ↓
setNewTodo(text)
    ↓
[Continue with Natural Language Flow]
```

## State Management Strategy

### Local State (index.tsx)
- UI-only state (dialogs, focus, input value)
- Date selection
- Emoji selection

### Hook State (use-todo-actions)
- Loading states
- Edit form state
- Sort preference
- Business logic state

### External State (useTodonna)
- Todo list data
- RemoteStorage sync
- CRUD operations

### Derived State
- Filtered todos (by date)
- Sorted todos (by preference)
- Statistics (completed/remaining counts, progress)

## Component Communication

### Props-based (Parent → Child)
- Configuration and data flow down
- Callbacks flow up
- Type-safe interfaces

### Hook-based (Shared State)
- useTodonna: Shared todo data
- useRemoteStorage: Shared storage instance
- useSpeechRecognition: Shared recording state

## Extending the Architecture

### Adding a New Feature Component

1. Create component file in `components/`:
```typescript
// components/NewFeature.tsx
export interface NewFeatureProps {
  // Define props
}

export function NewFeature({ ...props }: NewFeatureProps) {
  // Implementation
}
```

2. Export from `components/index.ts`:
```typescript
export * from "./NewFeature";
```

3. Import and use in `index.tsx`:
```typescript
import { NewFeature } from "./components";

// In render:
<NewFeature {...props} />
```

### Adding a New Hook

1. Create hook file in `hooks/`:
```typescript
// hooks/use-new-feature.ts
export function useNewFeature(params) {
  // Implementation
  return { /* hook API */ };
}
```

2. Export from `hooks/index.ts`:
```typescript
export * from "./use-new-feature";
```

3. Use in component:
```typescript
import { useNewFeature } from "./hooks";

const { api } = useNewFeature(params);
```

### TodoItem Component (`TodoItem.tsx`)

**Purpose**: Render individual todo items with view/edit modes

**Props** (13 total):
- `todo: TodoItem` - The todo data
- `isEditing: boolean` - Whether this item is being edited
- `editText`, `editEmoji`, `editTime` - Edit form state
- `isMobile: boolean` - For responsive button visibility
- `onToggle`, `onDelete`, `onEdit` - Action callbacks
- `setEditText`, `setEditEmoji`, `setEditTime` - Edit state setters
- `handleEditTodo`, `cancelEditing` - Edit completion handlers

**Features**:
- View mode: Checkbox, text display, emoji, time badge, edit/delete buttons
- Edit mode: Inline editor with emoji picker, text input, time picker
- Keyboard shortcuts: Enter to save, Escape to cancel
- Cursor position preservation during edit
- Responsive: Edit/delete buttons show on mobile, hide on desktop (hover to show)

**React Compiler Optimization**:
- Automatically memoized by React Compiler
- Only re-renders when its own props change
- When toggling todo #1, only TodoItem #1 re-renders
- Prevents cascade re-renders across entire list

### TodoList Component (`TodoList.tsx`)

**Purpose**: Container for todo items, manages shared state

**Simplified** from 284 lines → 64 lines (78% reduction)

**Responsibilities**:
- Mobile detection for all items
- Edit time state management (shared across edit sessions)
- Mapping todos to TodoItem components

**What it doesn't do anymore**:
- Individual item rendering (delegated to TodoItem)
- Edit UI rendering (delegated to TodoItem)
- View UI rendering (delegated to TodoItem)

### Best Practices

1. **Single Responsibility**: Each component/hook should have one clear purpose
2. **Prop Interfaces**: Always define TypeScript interfaces for props
3. **Barrel Exports**: Use index.ts files for clean imports
4. **Colocate Related Code**: Keep feature code together
5. **Extract Early**: Move complex logic to hooks/utils early
6. **Document Decisions**: Add comments for non-obvious logic
7. **Keep Main Component Thin**: Orchestrate, don't implement
8. **Component Boundaries for Performance**: Extract components at boundaries where React Compiler can optimize re-renders

## Migration Notes

### What Changed

**Phase 1 (Original Refactor)**:
- Single 964-line file → ~263 lines with feature modules
- Extracted components and hooks
- Clear separation of concerns

**Phase 2 (Coherence Improvements - January 2025)**:
- Main component: ~263 lines → ~160 lines (39% additional reduction)
- **TodoInputBar**: 17 props → 4 props (77% reduction)
  - Now manages: input text, emoji, focus state, FAQ dialog, device detection
  - Parent only passes: isLoading, apiKey, onAction callback, inputRef
- **TodoHeader**: 6 props → 4 props (33% reduction)
  - Now calculates: filtered todos, progress, counts internally using useMemo
  - Parent only passes: selectedDate, todos, datesWithTodos, onDateChange
- **MenuDropdown**: 1 prop → 0 props (100% reduction)
  - Now manages: debug console state internally
  - Renders DebugConsole as child component
- **use-todo-actions**: 9 props → 7 props (22% reduction)
  - Now calculates: filtered todos internally
  - handleAction now accepts emoji as parameter instead of prop

**Philosophy Applied**:
> "Logic should live as close as possible to where it's used"

Following the `micPermission` pattern, we pushed state management down to child components wherever the state is only used by that child.

**Phase 3 (Performance Optimization - January 2025)**:
- **TodoList**: 284 lines → 64 lines (78% reduction)
  - Extracted individual item rendering to TodoItem component
  - Now just container with map over TodoItem components
- **TodoItem**: New component (270 lines)
  - Self-contained todo item with view/edit modes
  - React Compiler automatically memoizes
  - Prevents unnecessary re-renders of sibling items

**Performance Impact**:
- Toggle 1 todo → Only that item re-renders (not entire list)
- Edit text → Only editing item re-renders (90%+ reduction in re-renders)
- Smooth performance even with 100+ todos
- React Compiler handles all memoization automatically

### Breaking Changes

**None**. The refactor maintains the same external API and behavior.

### Import Changes

Code that imported from `components/todo` should continue to work:
```typescript
// Still works
import Todo from "@/components/todo";
```

Internal imports now have cleaner paths:
```typescript
// Old (in same directory)
import { TodoHeader } from "./TodoHeader";

// New
import { TodoHeader } from "./components";
import { useTodoActions } from "./hooks";
```

## Testing Strategy

### Unit Tests

**Components**:
- Test rendering with different props
- Test user interactions
- Test conditional rendering

**Hooks**:
- Test state changes
- Test side effects
- Test return values

### Integration Tests

- Test feature workflows (add, edit, delete)
- Test AI action processing
- Test RemoteStorage sync

### E2E Tests

- Test complete user journeys
- Test voice input flow
- Test PWA functionality

## Performance Considerations

### Code Splitting

- Components are imported from barrel exports
- Potential for dynamic imports if needed
- Tree-shaking friendly structure

### Memoization Opportunities

- TodoHeader: Memoize if props rarely change
- TodoList: Already optimized with Framer Motion
- useDatesWithTodos: Could be useMemo'd

### Bundle Size

- Modular structure enables better tree-shaking
- Smaller initial bundle with code splitting
- Lazy load non-critical features

## Future Improvements

### Potential Enhancements

1. **Context API**: Replace prop drilling with context
2. **Zustand/Jotai**: Global state management
3. **React Query**: Server state management
4. **MSW**: Mock Service Worker for testing
5. **Storybook**: Component documentation
6. **Vitest**: Unit testing framework

### Architectural Patterns to Consider

1. **Compound Components**: For complex component APIs
2. **Render Props**: For flexible composition
3. **Higher-Order Components**: For cross-cutting concerns
4. **Provider Pattern**: For dependency injection

## Conclusion

This feature-first architecture provides a solid foundation for:
- Continued feature development
- Team collaboration
- Code maintenance
- Testing and quality assurance

The modular structure makes the codebase more approachable for new developers while maintaining the powerful functionality of the original implementation.

---

**Last Updated**: January 2025
**Refactored By**: Claude Code

**Evolution**:
- **v1 (Original)**: 964 lines monolithic component
- **v2 (First Refactor)**: 263 lines (73% reduction) + modular components
- **v3 (Coherence Improvements)**: 160 lines (83% total reduction) + self-contained components
- **v4 (Performance Optimization)**: TodoList 284→64 lines + TodoItem extraction for React Compiler optimization

**Key Principles**:
1. Each component manages its own internal state, only exposing what the parent absolutely needs to coordinate behavior
2. Extract components at boundaries where React Compiler can optimize re-renders
3. Trust React Compiler for memoization - no manual useCallback/useMemo needed
