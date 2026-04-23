import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { COLS, ROWS, SHAPES, COLORS, PieceType } from '../constants';
import { GameState, Piece, Pos } from '../types';

const createPiece = (type: PieceType): Piece => ({
  pos: { x: Math.floor(COLS / 2) - Math.floor(SHAPES[type][0].length / 2), y: 0 },
  shape: SHAPES[type],
  color: COLORS[type],
  type,
});

const getRandomPieceType = (): PieceType => {
  const types: PieceType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
  return types[Math.floor(Math.random() * types.length)];
};

export const useTetris = () => {
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    level: 1,
    lines: 0,
    gameOver: true,
    paused: false,
    activePiece: null,
    nextPiece: null,
    holdPiece: null,
    grid: Array.from({ length: ROWS }, () => Array(COLS).fill(0)),
  });

  const canHoldRef = useRef(true);
  const nextPieceRef = useRef<Piece | null>(null);

  const collide = useCallback((pos: Pos, shape: number[][], grid: (string | 0)[][]) => {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x] !== 0) {
          const newY = y + pos.y;
          const newX = x + pos.x;
          if (
            newY >= ROWS ||
            newX < 0 ||
            newX >= COLS ||
            (newY >= 0 && grid[newY][newX] !== 0)
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }, []);

  const spawn = useCallback(() => {
    setGameState(prev => {
      const next = nextPieceRef.current || createPiece(getRandomPieceType());
      const newNext = createPiece(getRandomPieceType());
      nextPieceRef.current = newNext;
      canHoldRef.current = true;

      if (collide(next.pos, next.shape, prev.grid)) {
        return { ...prev, gameOver: true, activePiece: next, nextPiece: newNext };
      }

      return { ...prev, activePiece: next, nextPiece: newNext };
    });
  }, [collide]);

  const clearLines = useCallback((grid: (string | 0)[][]) => {
    let linesCleared = 0;
    const newGrid = grid.filter(row => {
      const isFull = row.every(cell => cell !== 0);
      if (isFull) linesCleared++;
      return !isFull;
    });

    while (newGrid.length < ROWS) {
      newGrid.unshift(Array(COLS).fill(0));
    }

    if (linesCleared > 0) {
      setGameState(prev => {
        const points = [0, 100, 300, 500, 800];
        const newScore = prev.score + points[linesCleared] * prev.level;
        const newLines = prev.lines + linesCleared;
        const newLevel = Math.floor(newLines / 10) + 1;
        return {
          ...prev,
          grid: newGrid,
          score: newScore,
          lines: newLines,
          level: newLevel,
        };
      });
    } else {
      setGameState(prev => ({ ...prev, grid: newGrid }));
    }
  }, []);

  const reset = useCallback(() => {
    const firstPiece = createPiece(getRandomPieceType());
    const nextPiece = createPiece(getRandomPieceType());
    nextPieceRef.current = nextPiece;
    canHoldRef.current = true;
    
    setGameState({
      score: 0,
      level: 1,
      lines: 0,
      gameOver: false,
      paused: false,
      activePiece: firstPiece,
      nextPiece: nextPiece,
      holdPiece: null,
      grid: Array.from({ length: ROWS }, () => Array(COLS).fill(0)),
    });
  }, []);

  const drop = useCallback(() => {
    setGameState(prev => {
      if (prev.gameOver || prev.paused || !prev.activePiece) return prev;
      
      const nextPos = { ...prev.activePiece.pos, y: prev.activePiece.pos.y + 1 };
      
      if (collide(nextPos, prev.activePiece.shape, prev.grid)) {
        const finalGrid = prev.grid.map(row => [...row]);
        prev.activePiece.shape.forEach((row, y) => {
          row.forEach((value, x) => {
            if (value) {
              const gy = y + prev.activePiece!.pos.y;
              const gx = x + prev.activePiece!.pos.x;
              if (gy >= 0) finalGrid[gy][gx] = prev.activePiece!.color;
            }
          });
        });
        return { ...prev, grid: finalGrid, activePiece: null };
      }

      return {
        ...prev,
        activePiece: { ...prev.activePiece, pos: nextPos },
      };
    });
  }, [collide]);

  const move = useCallback((dir: number) => {
    setGameState(prev => {
      if (prev.gameOver || prev.paused || !prev.activePiece) return prev;
      const nextPos = { ...prev.activePiece.pos, x: prev.activePiece.pos.x + dir };
      if (!collide(nextPos, prev.activePiece.shape, prev.grid)) {
        return {
          ...prev,
          activePiece: { ...prev.activePiece, pos: nextPos }
        };
      }
      return prev;
    });
  }, [collide]);

  const rotateAction = useCallback(() => {
    setGameState(prev => {
      if (prev.gameOver || prev.paused || !prev.activePiece) return prev;
      
      const rotateMatrix = (matrix: number[][]) => {
        return matrix[0].map((_, i) => matrix.map(row => row[i]).reverse());
      };

      const newShape = rotateMatrix(prev.activePiece.shape);
      const pos = { ...prev.activePiece.pos };
      let offset = 1;

      while (collide(pos, newShape, prev.grid)) {
        pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > newShape[0].length) {
          return prev;
        }
      }

      return {
        ...prev,
        activePiece: { ...prev.activePiece, shape: newShape, pos }
      };
    });
  }, [collide]);

  const hardDrop = useCallback(() => {
    setGameState(prev => {
      if (prev.gameOver || prev.paused || !prev.activePiece) return prev;
      
      let finalY = prev.activePiece.pos.y;
      while (!collide({ ...prev.activePiece.pos, y: finalY + 1 }, prev.activePiece.shape, prev.grid)) {
        finalY++;
      }
      
      const finalGrid = prev.grid.map(row => [...row]);
      prev.activePiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value) {
            const gy = y + finalY;
            const gx = x + prev.activePiece!.pos.x;
            if (gy >= 0) finalGrid[gy][gx] = prev.activePiece!.color;
          }
        });
      });
      return { ...prev, grid: finalGrid, activePiece: null };
    });
  }, [collide]);

  const hold = useCallback(() => {
    setGameState(prev => {
      if (prev.gameOver || prev.paused || !prev.activePiece || !canHoldRef.current) return prev;
      
      const currentType = prev.activePiece.type;
      let nextToSpawn: Piece;
      let newHold: Piece;

      if (prev.holdPiece) {
        nextToSpawn = createPiece(prev.holdPiece.type);
        newHold = createPiece(currentType);
      } else {
        nextToSpawn = nextPieceRef.current || createPiece(getRandomPieceType());
        nextPieceRef.current = createPiece(getRandomPieceType());
        newHold = createPiece(currentType);
      }

      canHoldRef.current = false;
      return {
        ...prev,
        holdPiece: newHold,
        activePiece: nextToSpawn,
        nextPiece: nextPieceRef.current,
      };
    });
  }, []);

  const togglePause = useCallback(() => {
    setGameState(prev => ({ ...prev, paused: !prev.paused }));
  }, []);

  useEffect(() => {
    if (!gameState.activePiece && !gameState.gameOver) {
      clearLines(gameState.grid);
      spawn();
    }
  }, [gameState.activePiece, gameState.gameOver, gameState.grid, clearLines, spawn]);

  useEffect(() => {
    if (gameState.gameOver || gameState.paused) return;
    const interval = Math.max(100, 1000 - (gameState.level - 1) * 100);
    const timer = setInterval(drop, interval);
    return () => clearInterval(timer);
  }, [gameState.gameOver, gameState.paused, gameState.level, drop]);

  const methods = useMemo(() => ({
    move,
    rotate: rotateAction,
    drop,
    hardDrop,
    hold,
    reset,
    togglePause,
  }), [move, rotateAction, drop, hardDrop, hold, reset, togglePause]);

  return {
    gameState,
    methods,
  };
};
