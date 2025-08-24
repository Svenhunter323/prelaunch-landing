export interface WeightedChoice<T> {
  value: T;
  weight: number;
}

export function weightedRandom<T>(choices: WeightedChoice<T>[]): T {
  const totalWeight = choices.reduce((sum, choice) => sum + choice.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const choice of choices) {
    random -= choice.weight;
    if (random <= 0) {
      return choice.value;
    }
  }
  
  // Fallback to last choice
  return choices[choices.length - 1]!.value;
}

export const FIRST_CHEST_REWARDS: WeightedChoice<number>[] = [
  { value: 0.10, weight: 0.70 },
  { value: 0.20, weight: 0.30 },
];

export const REGULAR_CHEST_REWARDS: WeightedChoice<number>[] = [
  { value: 0, weight: 0.20 },
  { value: 0.10, weight: 0.60 },
  { value: 0.20, weight: 0.05 },
  { value: 0.50, weight: 0.05 },
  { value: 1.00, weight: 0.05 },
];

export function drawChestReward(isFirst: boolean): number {
  const choices = isFirst ? FIRST_CHEST_REWARDS : REGULAR_CHEST_REWARDS;
  return weightedRandom(choices);
}

// Fake win amounts (display only, never credited)
export const FAKE_WIN_AMOUNTS: WeightedChoice<number>[] = [
  { value: 10, weight: 0.30 },
  { value: 25, weight: 0.25 },
  { value: 50, weight: 0.20 },
  { value: 100, weight: 0.15 },
  { value: 250, weight: 0.05 },
  { value: 500, weight: 0.03 },
  { value: 1000, weight: 0.015 },
  { value: 2500, weight: 0.003 },
  { value: 5000, weight: 0.001 },
  { value: 10000, weight: 0.0005 },
];

export function drawFakeWinAmount(): number {
  return weightedRandom(FAKE_WIN_AMOUNTS);
}