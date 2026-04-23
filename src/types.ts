import { PieceType } from './constants';

export interface Pos {
  x: number;
  y: number;
}

export interface Piece {
  pos: Pos;
  shape: number[][];
  color: string;
  type: PieceType;
}

export interface GameState {
  score: number;
  level: number;
  lines: number;
  gameOver: boolean;
  paused: boolean;
  activePiece: Piece | null;
  nextPiece: Piece | null;
  holdPiece: Piece | null;
  grid: (string | 0)[][];
}
