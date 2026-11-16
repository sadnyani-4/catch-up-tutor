export const sampleDisclosure = {
  title: "Adaptive thermal routing for modular battery packs",
  description:
    "A fictional engineering disclosure created solely to demonstrate an evidence-first intake workflow.",
  sources: [
    {
      id: "p1",
      page: 1,
      heading: "Problem and background",
      text: "In a modular battery pack, cells near the center may operate at higher temperatures than cells near the outer wall. A fixed cooling flow can leave some cells under-cooled while using more pump power than necessary. The inventor wants to respond to temperature differences across the pack rather than relying only on a single pack-wide temperature threshold.",
    },
    {
      id: "p2",
      page: 2,
      heading: "Proposed system",
      text: "The proposed system places multiple temperature sensors near different cell groups. A controller estimates a temperature gradient from those sensor readings and sends control signals to independently actuated valves in a coolant manifold. The valves direct more coolant toward selected cell groups when the estimated gradient exceeds a configurable limit.",
    },
    {
      id: "p3",
      page: 3,
      heading: "Variants and safeguards",
      text: "In one variant, the controller also changes pump speed. The disclosure mentions alternative sensor locations and a fail-safe mode that opens the valves if a sensor reading is unavailable. The inventor has not yet specified how the gradient limit is selected, how quickly the controller updates the valves, or which alternative cooling media have been tested.",
    },
  ],
} as const;

export type IntakeCitation = {
  sourceId: string;
  page: number;
  heading: string;
  excerpt: string;
};

export type IntakeElement = {
  name: string;
  description: string;
  citations: IntakeCitation[];
};

export type IntakeAnalysis = {
  inventionTitle: string;
  summary: string;
  problem: string;
  proposedSolution: string;
  elements: IntakeElement[];
  followUpQuestions: string[];
};

const citationFor = (sourceId: string): IntakeCitation => {
  const source = sampleDisclosure.sources.find((item) => item.id === sourceId);
  if (!source) throw new Error(`Unknown sample source: ${sourceId}`);

  return {
    sourceId: source.id,
    page: source.page,
    heading: source.heading,
    excerpt: source.text,
  };
};

export const preparedIntakeExample: IntakeAnalysis = {
  inventionTitle: sampleDisclosure.title,
  summary:
    "A modular battery cooling concept that uses local temperature readings to direct coolant toward selected cell groups.",
  problem:
    "A fixed cooling flow may leave some cell groups under-cooled while using more pump power than necessary, and one pack-wide threshold may miss local temperature differences.",
  proposedSolution:
    "Use multiple temperature sensors, estimate a temperature gradient, and control independently actuated coolant valves to direct more flow toward selected groups.",
  elements: [
    {
      name: "Distributed temperature sensing",
      description:
        "Temperature sensors are positioned near different cell groups to capture local conditions.",
      citations: [citationFor("p2")],
    },
    {
      name: "Gradient estimation",
      description:
        "A controller estimates a temperature gradient from the sensor readings and compares it with a configurable limit.",
      citations: [citationFor("p2")],
    },
    {
      name: "Selective coolant routing",
      description:
        "Independently actuated manifold valves direct additional coolant toward selected cell groups.",
      citations: [citationFor("p2")],
    },
    {
      name: "Sensor-failure response",
      description:
        "A fail-safe mode opens the valves when a sensor reading is unavailable.",
      citations: [citationFor("p3")],
    },
  ],
  followUpQuestions: [
    "How is the temperature-gradient limit selected or adjusted?",
    "How quickly does the controller update valve positions?",
    "What alternative cooling media have been tested?",
    "What operating conditions trigger the pump-speed variant?",
  ],
};

export const sampleLesson = `# Catch-Up Tutor sample lesson

## What is a temperature gradient?

A temperature gradient describes how temperature changes from one location to another. In a battery pack, comparing readings from several cell groups can reveal uneven heating that one overall temperature reading might miss.

## Why use independently controlled cooling?

If a controller estimates that one group is warmer, it can direct more coolant to that area rather than increasing flow everywhere. The trade-off is that the system needs reliable sensors, a clear control rule, and a safe response when a reading is unavailable.

## Remember

- Multiple sensors provide local information.
- A controller uses the readings to estimate uneven heating.
- Independently actuated valves can direct coolant to selected groups.
- The sample disclosure leaves design questions unanswered; those should be checked rather than guessed.`;

export const sampleFlashcards = [
  {
    id: "sample-1",
    course_title: "Engineering systems (sample)",
    question: "What does a temperature gradient describe?",
    answer: "How temperature changes between different locations in a system.",
  },
  {
    id: "sample-2",
    course_title: "Engineering systems (sample)",
    question: "Why might several local sensors be more useful than one pack-wide reading?",
    answer:
      "They can reveal uneven heating between cell groups that one overall reading could hide.",
  },
  {
    id: "sample-3",
    course_title: "Engineering systems (sample)",
    question: "What should a system do if a sensor reading is unavailable?",
    answer:
      "Use an explicitly designed fail-safe response; the sample disclosure proposes opening the valves.",
  },
];
