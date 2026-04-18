# TypeScript State Machine

Generic finite state machine implementation with:

- strongly typed states
- typed context object
- transition guards
- entry, exit, and transition hooks
- test coverage with `vitest`
- runnable examples with `tsx`

## Install

```bash
npm install
```

## Run tests

```bash
npm test
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
