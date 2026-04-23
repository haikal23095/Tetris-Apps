/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, RotateCcw, ArrowLeft, ArrowRight, ArrowDown, ArrowUp, Zap, Cpu, Activity, ShieldCheck } from 'lucide-react';
import { useTetris } from './hooks/useTetris';
import { BLOCK_SIZE, COLS, ROWS } from './constants';
import { Piece } from './types';

// Darker shades of the original colors for the bottom border depth effect
const SHADE_COLORS: Record<string, string> = {
  '#22d3ee': '#0891b2', // cyan
  '#3b82f6': '#1d4ed8', // blue
  '#f59e0b': '#b45309', // amber
  '#eab308': '#a16207', // yellow
  '#22c55e': '#15803d', // green
  '#a855f7': '#7e22ce', // purple
  '#ef4444': '#b91c1c', // red
};

export default function App() {
  const { gameState, methods } = useTetris();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement>(null);
  const holdCanvasRef = useRef<HTMLCanvasElement>(null);
  const [sessionTime, setSessionTime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setSessionTime(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const drawBlock = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string, isGhost = false) => {
    const r = 2;
    const padding = 1;
    const size = BLOCK_SIZE - padding * 2;
    const px = x * BLOCK_SIZE + padding;
    const py = y * BLOCK_SIZE + padding;

    if (isGhost) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      ctx.roundRect(px, py, size, size, r);
      ctx.stroke();
      ctx.globalAlpha = 1;
      return;
    }

    // Main Fill
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(px, py, size, size, r);
    ctx.fill();

    // Bottom depth border
    const shade = SHADE_COLORS[color] || '#000000';
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.roundRect(px, py + size - 3, size, 3, [0, 0, r, r]);
    ctx.fill();
    
    // Subtle inner shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(px, py, size, 1);
  };

  const drawPiecePreview = (ctx: CanvasRenderingContext2D, piece: Piece | null, size: number) => {
    ctx.clearRect(0, 0, size, size);
    if (!piece) return;

    const blockSize = size / 5;
    const offsetX = (size - piece.shape[0].length * blockSize) / 2;
    const offsetY = (size - piece.shape.length * blockSize) / 2;

    piece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          ctx.fillStyle = piece.color;
          ctx.beginPath();
          ctx.roundRect(
            offsetX + x * blockSize + 1,
            offsetY + y * blockSize + 1,
            blockSize - 2,
            blockSize - 2,
            1
          );
          ctx.fill();
        }
      });
    });
  };

  const getGhostY = useCallback(() => {
    if (!gameState.activePiece) return 0;
    let ghostY = gameState.activePiece.pos.y;
    const collide = (pos: { x: number, y: number }) => {
      const { shape } = gameState.activePiece!;
      for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
          if (shape[y][x] !== 0) {
            const newY = y + pos.y;
            const newX = x + pos.x;
            if (newY >= ROWS || newX < 0 || newX >= COLS || (newY >= 0 && gameState.grid[newY][newX] !== 0)) {
              return true;
            }
          }
        }
      }
      return false;
    };

    while (!collide({ x: gameState.activePiece.pos.x, y: ghostY + 1 })) {
      ghostY++;
    }
    return ghostY;
  }, [gameState.activePiece, gameState.grid]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Grid (using grid-pattern background might be better, but we can draw lines if needed)
    
    // Draw Stationary blocks
    gameState.grid.forEach((row, y) => {
      row.forEach((color, x) => {
        if (color !== 0) {
          drawBlock(ctx, x, y, color);
        }
      });
    });

    // Draw Active Piece and Ghost
    if (gameState.activePiece) {
      const ghostY = getGhostY();
      gameState.activePiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value) {
            drawBlock(ctx, gameState.activePiece!.pos.x + x, ghostY + y, gameState.activePiece!.color, true);
            drawBlock(ctx, gameState.activePiece!.pos.x + x, gameState.activePiece!.pos.y + y, gameState.activePiece!.color);
          }
        });
      });
    }
  }, [gameState.grid, gameState.activePiece, getGhostY]);

  useEffect(() => {
    const nctx = nextCanvasRef.current?.getContext('2d');
    if (nctx) drawPiecePreview(nctx, gameState.nextPiece, 80);

    const hctx = holdCanvasRef.current?.getContext('2d');
    if (hctx) drawPiecePreview(hctx, gameState.holdPiece, 80);
  }, [gameState.nextPiece, gameState.holdPiece]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState.gameOver && e.code === 'Space') {
        methods.reset();
        return;
      }
      if (gameState.gameOver) return;
      if (e.code === 'KeyP') {
        methods.togglePause();
        return;
      }
      if (gameState.paused) return;

      switch (e.code) {
        case 'ArrowLeft': methods.move(-1); break;
        case 'ArrowRight': methods.move(1); break;
        case 'ArrowDown': methods.drop(); break;
        case 'ArrowUp': methods.rotate(); break;
        case 'Space': methods.hardDrop(); break;
        case 'KeyC': methods.hold(); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.gameOver, gameState.paused, methods]);

  return (
    <div className="w-full h-screen bg-slate-50 text-slate-900 font-sans flex flex-col overflow-hidden select-none">
      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-md flex items-center justify-center">
            <Cpu className="text-white w-5 h-5" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">TETRA<span className="text-indigo-600">CORE</span> <span className="text-slate-400 font-normal">v4.2</span></h1>
        </div>
        <div className="flex items-center gap-8 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" />
            <span>SYSTEM STABLE</span>
          </div>
          <div className="w-px h-4 bg-slate-200"></div>
          <div className="tabular-nums">SESSION: {formatTime(sessionTime)}</div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 flex items-center justify-center gap-12 p-10 overflow-auto">
        
        {/* Left Stats Side */}
        <aside className="w-56 space-y-6 hidden lg:block">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current Score</p>
            <p className="text-3xl font-mono font-bold tracking-tighter text-slate-900 tabular-nums">
              {gameState.score.toLocaleString().padStart(7, '0')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Level</p>
              <p className="text-xl font-mono font-bold text-indigo-600 tabular-nums">{gameState.level.toString().padStart(2, '0')}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Lines</p>
              <p className="text-xl font-mono font-bold text-emerald-600 tabular-nums">{gameState.lines.toString().padStart(2, '0')}</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Hold Buffer</p>
            <div className="flex justify-center h-20 items-center">
              <canvas ref={holdCanvasRef} width={80} height={80} className="scale-110" />
            </div>
          </div>
        </aside>

        {/* Center Game Section */}
        <section className="relative">
          <div className="relative p-[3px] bg-slate-300 rounded-xl shadow-2xl shadow-slate-200 overflow-hidden">
            <div className="relative w-[300px] h-[600px] bg-white rounded-lg overflow-hidden flex flex-col grid-pattern">
              <canvas 
                ref={canvasRef} 
                width={300} 
                height={600} 
                className="z-0"
              />

              {/* Overlay: Game State Control */}
              <AnimatePresence>
                {(gameState.gameOver || gameState.paused) && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-white/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-8 text-center"
                  >
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="space-y-6"
                    >
                      <div className="space-y-1">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-[0.3em]">Module Status</h2>
                        <h1 className="text-4xl font-black tracking-tighter text-slate-900 italic">
                          {gameState.gameOver ? (gameState.score === 0 ? 'READY' : 'TERMINATED') : 'SUSPENDED'}
                        </h1>
                      </div>
                      
                      {gameState.gameOver && gameState.score > 0 && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Retrieval Output</p>
                          <p className="text-3xl font-mono font-bold text-indigo-600 tabular-nums">{gameState.score.toLocaleString()}</p>
                        </div>
                      )}

                      <button 
                        onClick={gameState.paused ? methods.togglePause : methods.reset}
                        className="group relative w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-3"
                      >
                        {gameState.paused ? <Play fill="currentColor" size={18} /> : <RotateCcw size={18} />}
                        <span className="uppercase tracking-widest text-xs">{gameState.paused ? 'Initialize Stream' : 'Sync New Session'}</span>
                      </button>

                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                        Command: {gameState.paused ? '[P] to resume' : '[Space] to begin'}
                      </p>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          {/* Decorative side accent */}
          <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-1.5 h-32 bg-indigo-600 rounded-full shadow-[0_0_15px_rgba(79,70,229,0.4)] md:block hidden" />
        </section>

        {/* Right Info Side */}
        <aside className="w-56 space-y-6 hidden lg:block">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Next Module</p>
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center bg-slate-50 rounded-xl h-24 border border-slate-100">
                <canvas ref={nextCanvasRef} width={80} height={80} className="scale-110" />
              </div>
              <div className="flex items-center justify-between px-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Sequence-X</span>
                <span className="text-[9px] font-mono text-indigo-600 font-bold">STABLE</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Interface Inputs</p>
            <div className="space-y-3">
              {[
                { label: 'Movement', cmd: 'ARROWS' },
                { label: 'Flash Drop', cmd: 'SPACE' },
                { label: 'Swap Buffer', cmd: 'C' },
                { label: 'Suspend', cmd: 'P' },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center text-[10px] font-bold border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                  <span className="text-slate-400 italic font-medium">{item.label}</span>
                  <span className="text-slate-600 font-mono">[{item.cmd}]</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Mobile Stats (Condensed) */}
        <div className="lg:hidden absolute bottom-24 left-0 right-0 px-8 flex justify-between gap-4">
           {/* Mobile layout could be enhanced, but we'll stick to basic stats for now */}
        </div>

      </main>

      {/* Footer */}
      <footer className="h-10 bg-slate-100 border-t border-slate-200 px-8 flex items-center justify-between shrink-0 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>© 2024 NEXUS ANALYTICS GROUP</span>
        </div>
        <div className="hidden md:flex gap-6">
          <span>LATENCY: 12ms</span>
          <span>ENCRYPTION: AES-256</span>
          <span className="text-indigo-600 font-black tracking-normal">STATION: 08-ALPHA</span>
        </div>
      </footer>
    </div>
  );
}


