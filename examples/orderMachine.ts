import { StateMachine } from "../lib/index.js";

type OrderState = "draft" | "submitted" | "paid" | "shipped";

interface OrderContext {
  total: number;
  paymentConfirmed: boolean;
}

const orderMachine = new StateMachine<OrderState, OrderContext>({
  initialState: "draft",
  context: {
    total: 125,
    paymentConfirmed: false,
  },
  states: {
    draft: {
      onEnter: ({ state }) => {
        console.log(`Entered ${state}`);
      },
      transitions: {
        submitted: {
          onTransition: ({ from, to }) => {
            console.log(`Submitting order: ${from} -> ${to}`);
          },
        },
      },
    },
    submitted: {
      transitions: {
        paid: {
          guard: (context) => context.paymentConfirmed,
          onTransition: ({ context }) => {
            console.log(`Payment accepted for $${context.total}`);
          },
        },
      },
    },
    paid: {
      transitions: {
        shipped: {},
      },
    },
    shipped: {},
  },
});

console.log("Initial state:", orderMachine.state);
console.log("Submit:", orderMachine.transitionTo("submitted"));
console.log("Pay before confirmation:", orderMachine.transitionTo("paid"));

orderMachine.updateContext((context) => ({
  ...context,
  paymentConfirmed: true,
}));

console.log("Pay after confirmation:", orderMachine.transitionTo("paid"));
console.log("Ship:", orderMachine.transitionTo("shipped"));
console.log("Final state:", orderMachine.state);
