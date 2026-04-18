# 🚥 TypeScript State Machine

[![CI](https://github.com/d4b-sw/finite-state-machine/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/d4b-sw/finite-state-machine/actions/workflows/test.yml)

Generic finite state machine implementation with:

- strongly typed states
- typed context object
- transition guards
- entry, exit, and transition hooks
- test coverage with `vitest`
- runnable examples with `tsx`

An article that drove writing this code can be found on [d4b, why state machines?](https://www.d4b.dev/blog/2026-01-04-state-machines-advantages-disadvantages/)

## Install

```bash
npm install
```

## Run tests

```bash
npm test
```

## Run linting

```bash
npm run lint
```

## Run examples

```bash
npm run example:order
npm run example:traffic
```

## Usage

```ts
import { StateMachine } from "./lib/index.js";

type State = "idle" | "running" | "done";

interface Context {
  canStart: boolean;
}

const machine = new StateMachine<State, Context>({
  initialState: "idle",
  context: { canStart: true },
  states: {
    idle: {
      transitions: {
        running: {
          guard: (context) => context.canStart,
        },
      },
    },
    running: {
      transitions: {
        done: {},
      },
    },
    done: {},
  },
});

machine.transitionTo("running");
machine.transitionTo("done");
```

## Hooks

The machine supports three lifecycle hooks:

- `onEnter`: runs when a state becomes active
- `onExit`: runs right before leaving a state
- `onTransition`: runs for one specific transition after `onExit` and before `onEnter`

For a successful transition, hook order is always:

1. current state's `onExit`
2. transition's `onTransition`
3. next state's `onEnter`

If a transition is missing, or if its guard returns `false`, none of these hooks run.

### `onEnter`

Use `onEnter` for work that should happen whenever a state is reached, including the initial
state when the machine is created.

```ts
const machine = new StateMachine<"idle" | "running", { startedAt?: number }>({
  initialState: "idle",
  context: {},
  states: {
    idle: {
      transitions: {
        running: {},
      },
    },
    running: {
      onEnter: ({ context }) => {
        context.startedAt = Date.now();
      },
    },
  },
});
```

### `onExit`

Use `onExit` for cleanup or for finalizing data before the machine leaves the current state.

```ts
const machine = new StateMachine<"editing" | "saved", { draft: string }>({
  initialState: "editing",
  context: { draft: "Hello" },
  states: {
    editing: {
      onExit: ({ context }) => {
        console.log("Saving draft:", context.draft);
      },
      transitions: {
        saved: {},
      },
    },
    saved: {},
  },
});
```

### `onTransition`

Use `onTransition` when behavior belongs to one exact edge in the graph rather than to a whole
state.

```ts
const machine = new StateMachine<
  "cart" | "checkout" | "paid",
  { total: number; paymentConfirmed: boolean }
>({
  initialState: "checkout",
  context: {
    total: 125,
    paymentConfirmed: true,
  },
  states: {
    cart: {},
    checkout: {
      transitions: {
        paid: {
          guard: (context) => context.paymentConfirmed,
          onTransition: ({ from, to, context }) => {
            console.log(`Moving ${from} -> ${to} for $${context.total}`);
          },
        },
      },
    },
    paid: {},
  },
});
```

## Working With Context

`context` is the machine's current data. Guards and hooks receive that same value.

There are two valid ways to change it.

### 1. Replace context with `updateContext(...)`

This is the clearest approach when you want explicit state updates.

```ts
machine.updateContext((current) => ({
  ...current,
  paymentConfirmed: true,
}));
```

You can also replace the whole context directly:

```ts
machine.updateContext({
  paymentConfirmed: true,
  total: 125,
});
```

### 2. Mutate the existing context object inside a hook

If `TContext` is an object, hooks receive the same object reference stored by the machine. That
means in-place mutation is visible to later hooks and future guards.

```ts
const machine = new StateMachine<"yellow" | "red", { cycles: number }>({
  initialState: "yellow",
  context: { cycles: 0 },
  states: {
    yellow: {
      onExit: ({ context }) => {
        context.cycles += 1;
      },
      transitions: {
        red: {},
      },
    },
    red: {},
  },
});
```

This works, but `updateContext(...)` is usually easier to reason about because the context change
is explicit and centralized.

## Practical Guidance

- Use `onEnter` for state setup.
- Use `onExit` for cleanup or final bookkeeping.
- Use `onTransition` for behavior that belongs to one specific edge.
- Use `updateContext(...)` when you want predictable, explicit context changes.
- Mutate `context` inside hooks only when shared object mutation is intentional.

