/**
 * Runs when a state is entered or exited.
 *
 * `context` is the machine's current context object at the moment the hook runs.
 */
export type MachineHook<TState extends string, TContext> = (payload: {
  state: TState;
  context: TContext;
}) => void;

/**
 * Runs after the current state's `onExit` hook and before the next state's `onEnter` hook.
 *
 * Use this for transition-specific side effects such as logging or updating shared context.
 */
export type TransitionHook<TState extends string, TContext> = (payload: {
  from: TState;
  to: TState;
  context: TContext;
}) => void;

export interface TransitionConfig<TState extends string, TContext> {
  /**
   * Blocks the transition when it returns `false`.
   */
  guard?: (context: TContext) => boolean;
  /**
   * Runs only for this specific transition after `onExit` and before `onEnter`.
   */
  onTransition?: TransitionHook<TState, TContext>;
}

export interface StateConfig<TState extends string, TContext> {
  /**
   * Runs every time this state becomes active, including once during machine construction
   * when this is the initial state.
   */
  onEnter?: MachineHook<TState, TContext>;
  /**
   * Runs immediately before leaving this state.
   */
  onExit?: MachineHook<TState, TContext>;
  transitions?: Partial<Record<TState, TransitionConfig<TState, TContext>>>;
}

export interface MachineConfig<TState extends string, TContext> {
  initialState: TState;
  context: TContext;
  states: Record<TState, StateConfig<TState, TContext>>;
}

export type TransitionFailureReason = "INVALID_TRANSITION" | "GUARD_BLOCKED";

export type TransitionResult<TState extends string> =
  | {
      success: true;
      from: TState;
      to: TState;
    }
  | {
      success: false;
      from: TState;
      to: TState;
      reason: TransitionFailureReason;
    };

export class StateMachine<TState extends string, TContext> {
  private currentState: TState;
  private contextValue: TContext;
  private readonly states: Record<TState, StateConfig<TState, TContext>>;

  constructor(config: MachineConfig<TState, TContext>) {
    const { initialState, context, states } = config;

    if (!(initialState in states)) {
      throw new Error(`Invalid initial state: ${initialState}`);
    }

    this.currentState = initialState;
    this.contextValue = context;
    this.states = states;

    this.states[this.currentState].onEnter?.({
      state: this.currentState,
      context: this.contextValue,
    });
  }

  get state(): TState {
    return this.currentState;
  }

  /**
   * Returns the current context object.
   *
   * If `TContext` is an object, hooks receive the same reference, so in-place mutation is
   * visible to later guards and hooks. Prefer `updateContext(...)` when you want explicit,
   * predictable context updates.
   */
  get context(): TContext {
    return this.contextValue;
  }

  /**
   * Replaces the current context object.
   *
   * Pass a full value to replace the context directly, or pass an updater function when the
   * next value should be derived from the current one.
   */
  updateContext(updater: TContext | ((current: TContext) => TContext)): TContext {
    this.contextValue =
      typeof updater === "function"
        ? (updater as (current: TContext) => TContext)(this.contextValue)
        : updater;

    return this.contextValue;
  }

  /**
   * Returns `true` when the current state defines a transition to `nextState` and its guard,
   * if present, passes for the current context.
   */
  canTransitionTo(nextState: TState): boolean {
    const transition = this.states[this.currentState].transitions?.[nextState];

    if (!transition) {
      return false;
    }

    return transition.guard ? transition.guard(this.contextValue) : true;
  }

  /**
   * Attempts to move the machine to `nextState`.
   *
   * Hook order for a successful transition:
   * 1. current state's `onExit`
   * 2. transition's `onTransition`
   * 3. next state's `onEnter`
   */
  transitionTo(nextState: TState): TransitionResult<TState> {
    const from = this.currentState;
    const current = this.states[from];
    const transition = current.transitions?.[nextState];

    if (!transition) {
      return {
        success: false,
        from,
        to: nextState,
        reason: "INVALID_TRANSITION",
      };
    }

    if (transition.guard && !transition.guard(this.contextValue)) {
      return {
        success: false,
        from,
        to: nextState,
        reason: "GUARD_BLOCKED",
      };
    }

    current.onExit?.({
      state: from,
      context: this.contextValue,
    });

    transition.onTransition?.({
      from,
      to: nextState,
      context: this.contextValue,
    });

    this.currentState = nextState;

    this.states[nextState].onEnter?.({
      state: nextState,
      context: this.contextValue,
    });

    return {
      success: true,
      from,
      to: nextState,
    };
  }
}
