import { describe, expect, it, vi } from "vitest";

import { StateMachine } from "../lib/index.js";

type DoorState = "closed" | "locked" | "open";

interface DoorContext {
  hasKey: boolean;
  openedCount: number;
}

describe("StateMachine", () => {
  it("starts in the configured initial state", () => {
    const machine = new StateMachine<DoorState, DoorContext>({
      initialState: "closed",
      context: {
        hasKey: false,
        openedCount: 0,
      },
      states: {
        closed: {
          transitions: {
            open: {},
            locked: {},
          },
        },
        locked: {
          transitions: {
            closed: {
              guard: (context) => context.hasKey,
            },
          },
        },
        open: {
          transitions: {
            closed: {},
          },
        },
      },
    });

    expect(machine.state).toBe("closed");
    expect(machine.context).toEqual({ hasKey: false, openedCount: 0 });
  });

  it("runs the initial entry hook", () => {
    const onEnter = vi.fn();

    new StateMachine<DoorState, DoorContext>({
      initialState: "closed",
      context: {
        hasKey: false,
        openedCount: 0,
      },
      states: {
        closed: {
          onEnter,
        },
        locked: {},
        open: {},
      },
    });

    expect(onEnter).toHaveBeenCalledWith({
      state: "closed",
      context: {
        hasKey: false,
        openedCount: 0,
      },
    });
  });

  it("transitions successfully when the transition exists", () => {
    const machine = new StateMachine<DoorState, DoorContext>({
      initialState: "closed",
      context: {
        hasKey: false,
        openedCount: 0,
      },
      states: {
        closed: {
          transitions: {
            open: {},
          },
        },
        locked: {},
        open: {},
      },
    });

    const result = machine.transitionTo("open");

    expect(result).toEqual({
      success: true,
      from: "closed",
      to: "open",
    });
    expect(machine.state).toBe("open");
  });

  it("rejects transitions that are not configured", () => {
    const machine = new StateMachine<DoorState, DoorContext>({
      initialState: "closed",
      context: {
        hasKey: false,
        openedCount: 0,
      },
      states: {
        closed: {
          transitions: {
            open: {},
          },
        },
        locked: {},
        open: {},
      },
    });

    const result = machine.transitionTo("locked");

    expect(result).toEqual({
      success: false,
      from: "closed",
      to: "locked",
      reason: "INVALID_TRANSITION",
    });
    expect(machine.state).toBe("closed");
  });

  it("blocks transitions when the guard returns false", () => {
    const machine = new StateMachine<DoorState, DoorContext>({
      initialState: "locked",
      context: {
        hasKey: false,
        openedCount: 0,
      },
      states: {
        closed: {},
        locked: {
          transitions: {
            closed: {
              guard: (context) => context.hasKey,
            },
          },
        },
        open: {},
      },
    });

    const result = machine.transitionTo("closed");

    expect(result).toEqual({
      success: false,
      from: "locked",
      to: "closed",
      reason: "GUARD_BLOCKED",
    });
    expect(machine.state).toBe("locked");
  });

  it("runs exit, transition, and enter hooks in order", () => {
    const callOrder: string[] = [];

    const machine = new StateMachine<DoorState, DoorContext>({
      initialState: "closed",
      context: {
        hasKey: true,
        openedCount: 0,
      },
      states: {
        closed: {
          onExit: () => {
            callOrder.push("exit closed");
          },
          transitions: {
            locked: {
              onTransition: () => {
                callOrder.push("transition closed->locked");
              },
            },
          },
        },
        locked: {
          onEnter: () => {
            callOrder.push("enter locked");
          },
        },
        open: {},
      },
    });

    const result = machine.transitionTo("locked");

    expect(result.success).toBe(true);
    expect(callOrder).toEqual([
      "exit closed",
      "transition closed->locked",
      "enter locked",
    ]);
  });

  it("can answer whether a transition is currently allowed", () => {
    const machine = new StateMachine<DoorState, DoorContext>({
      initialState: "locked",
      context: {
        hasKey: false,
        openedCount: 0,
      },
      states: {
        closed: {},
        locked: {
          transitions: {
            closed: {
              guard: (context) => context.hasKey,
            },
          },
        },
        open: {},
      },
    });

    expect(machine.canTransitionTo("closed")).toBe(false);

    machine.updateContext((current) => ({
      ...current,
      hasKey: true,
    }));

    expect(machine.canTransitionTo("closed")).toBe(true);
  });

  it("updates context through a value or updater function", () => {
    const machine = new StateMachine<DoorState, DoorContext>({
      initialState: "closed",
      context: {
        hasKey: false,
        openedCount: 0,
      },
      states: {
        closed: {},
        locked: {},
        open: {},
      },
    });

    machine.updateContext((current) => ({
      ...current,
      openedCount: current.openedCount + 1,
    }));

    expect(machine.context.openedCount).toBe(1);

    machine.updateContext({
      hasKey: true,
      openedCount: 3,
    });

    expect(machine.context).toEqual({
      hasKey: true,
      openedCount: 3,
    });
  });

  it("throws when the initial state does not exist", () => {
    expect(() => {
      new StateMachine<DoorState, DoorContext>({
        initialState: "open",
        context: {
          hasKey: false,
          openedCount: 0,
        },
        states: {
          closed: {},
          locked: {},
        } as never,
      });
    }).toThrow("Invalid initial state: open");
  });
});
