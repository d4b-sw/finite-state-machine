import { StateMachine } from "../lib/index.js";

type TrafficLightState = "red" | "green" | "yellow";

const trafficLightMachine = new StateMachine<TrafficLightState, { cycles: number }>({
  initialState: "red",
  context: {
    cycles: 0,
  },
  states: {
    red: {
      onEnter: ({ context }) => {
        console.log(`Stop. Completed cycles: ${context.cycles}`);
      },
      transitions: {
        green: {},
      },
    },
    green: {
      onEnter: () => {
        console.log("Go");
      },
      transitions: {
        yellow: {},
      },
    },
    yellow: {
      onEnter: () => {
        console.log("Slow down");
      },
      onExit: ({ context }) => {
        context.cycles += 1;
      },
      transitions: {
        red: {},
      },
    },
  },
});

console.log(trafficLightMachine.transitionTo("green"));
console.log(trafficLightMachine.transitionTo("yellow"));
console.log(trafficLightMachine.transitionTo("red"));
console.log("Current context:", trafficLightMachine.context);
