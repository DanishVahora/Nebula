let currentPort = 3200;

export function getNextPort(): number {
  currentPort += 1;
  return currentPort;
}
