export type MachineHook<TState extends string, TContext> = (payload: {
  state: TState;
  context: TContext;
}) => void;

export type TransitionHook<TState extends string, TContext> = (payload: {
  from: TState;
  to: TState;
  context: TContext;
}) => void;

export interface TransitionConfig<TState extends string, TContext> {
  guard?: (context: TContext) => boolean;
  onTransition?: TransitionHook<TState, TContext>;
}

export interface StateConfig<TState extends string, TContext> {
  onEnter?: MachineHook<TState, TContext>;
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

  get context(): TContext {
    return this.contextValue;
  }

  updateContext(updater: TContext | ((current: TContext) => TContext)): TContext {
    this.contextValue =
      typeof updater === "function"
        ? (updater as (current: TContext) => TContext)(this.contextValue)
        : updater;

    return this.contextValue;
  }

  canTransitionTo(nextState: TState): boolean {
    const transition = this.states[this.currentState].transitions?.[nextState];

    if (!transition) {
      return false;
    }

    return transition.guard ? transition.guard(this.contextValue) : true;
  }

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
