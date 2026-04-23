export const COLS = 10;
export const ROWS = 20;
export const BLOCK_SIZE = 30;

export type PieceType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

export const COLORS: Record<PieceType, string> = {
  I: '#22d3ee', // cyan-400
  J: '#3b82f6', // blue-500
  L: '#f59e0b', // amber-500
  O: '#eab308', // yellow-500
  S: '#22c55e', // green-500
  T: '#a855f7', // purple-500
  Z: '#ef4444', // red-500
};

export const SHAPES: Record<PieceType, number[][]> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
};
