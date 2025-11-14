"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Cell = { x: number; y: number };

const GRID_SIZE = 25;
const CELL_SIZE = 20;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;
const INITIAL_SPEED = 150;
const SPEED_FLOOR = 60;
const SPEED_STEP = 4;

const KEY_TO_DIRECTION: Record<string, Cell> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
};

const createInitialSnake = (): Cell[] => {
  const center = Math.floor(GRID_SIZE / 2);
  return [
    { x: center + 1, y: center },
    { x: center, y: center },
    { x: center - 1, y: center },
  ];
};

const getRandomFood = (occupied: Cell[]): Cell => {
  const occupiedKey = new Set(occupied.map(({ x, y }) => `${x}:${y}`));
  const spaces: Cell[] = [];

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      if (!occupiedKey.has(`${x}:${y}`)) {
        spaces.push({ x, y });
      }
    }
  }

  if (!spaces.length) {
    return { x: 0, y: 0 };
  }

  return spaces[Math.floor(Math.random() * spaces.length)];
};

const cellsEqual = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;

export function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nextDirectionRef = useRef<Cell | null>(null);
  const directionRef = useRef<Cell>({ x: 1, y: 0 });
  const loopRef = useRef<number | null>(null);

  const initialState = useMemo(() => {
    const snake = createInitialSnake();
    return {
      snake,
      food: getRandomFood(snake),
    };
  }, []);

  const [snake, setSnake] = useState<Cell[]>(initialState.snake);
  const [direction, setDirection] = useState<Cell>({ x: 1, y: 0 });
  const [food, setFood] = useState<Cell>(initialState.food);
  const [isRunning, setIsRunning] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [speed, setSpeed] = useState(INITIAL_SPEED);

  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("snake-highscore");
    if (stored) {
      const parsed = Number.parseInt(stored, 10);
      if (!Number.isNaN(parsed)) {
        startTransition(() => {
          setHighScore(parsed);
        });
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("snake-highscore", String(highScore));
  }, [highScore]);

  const resetGame = useCallback((autoStart = true) => {
    const freshSnake = createInitialSnake();
    const newFood = getRandomFood(freshSnake);
    setSnake(freshSnake);
    setDirection({ x: 1, y: 0 });
    nextDirectionRef.current = null;
    setFood(newFood);
    setScore(0);
    setSpeed(INITIAL_SPEED);
    setIsGameOver(false);
    setIsRunning(autoStart);
  }, []);

  const handleGameOver = useCallback(() => {
    setIsRunning(false);
    setIsGameOver(true);
  }, []);

  const step = useCallback(
    (currentDirection: Cell) => {
      setSnake((previousSnake) => {
        const head = previousSnake[0];
        const nextHead = {
          x: head.x + currentDirection.x,
          y: head.y + currentDirection.y,
        };

        const hitsWall =
          nextHead.x < 0 ||
          nextHead.y < 0 ||
          nextHead.x >= GRID_SIZE ||
          nextHead.y >= GRID_SIZE;

        const hitsSelf = previousSnake.some((segment) =>
          cellsEqual(segment, nextHead),
        );

        if (hitsWall || hitsSelf) {
          handleGameOver();
          return previousSnake;
        }

        const nextSnake = [nextHead, ...previousSnake];
        const ateFood = cellsEqual(nextHead, food);

        if (ateFood) {
          const newFood = getRandomFood(nextSnake);
          setFood(newFood);
          setScore((currentScore) => {
            const updatedScore = currentScore + 10;
            setHighScore((currentHighScore) =>
              updatedScore > currentHighScore ? updatedScore : currentHighScore,
            );
            return updatedScore;
          });
          setSpeed((currentSpeed) =>
            Math.max(SPEED_FLOOR, currentSpeed - SPEED_STEP),
          );
        } else {
          nextSnake.pop();
        }

        return nextSnake;
      });
    },
    [food, handleGameOver],
  );

  useEffect(() => {
    if (!isRunning || isGameOver) {
      if (loopRef.current) {
        window.clearInterval(loopRef.current);
        loopRef.current = null;
      }
      return;
    }

    if (loopRef.current) {
      window.clearInterval(loopRef.current);
      loopRef.current = null;
    }

    loopRef.current = window.setInterval(() => {
      const nextDirection = nextDirectionRef.current;
      const activeDirection = nextDirection ?? directionRef.current;

      if (nextDirection) {
        setDirection(nextDirection);
        directionRef.current = nextDirection;
        nextDirectionRef.current = null;
      }

      step(activeDirection);
    }, speed);

    return () => {
      if (loopRef.current) {
        window.clearInterval(loopRef.current);
        loopRef.current = null;
      }
    };
  }, [isRunning, isGameOver, speed, step]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

      if (key === " ") {
        event.preventDefault();
        if (isGameOver) {
          resetGame(true);
        } else {
          setIsRunning((previous) => !previous);
        }
        return;
      }

      const desiredDirection = KEY_TO_DIRECTION[key];
      if (!desiredDirection) return;

      event.preventDefault();

      const { x: currentX, y: currentY } = directionRef.current;
      if (currentX + desiredDirection.x === 0 && currentY + desiredDirection.y === 0) {
        return;
      }

      nextDirectionRef.current = desiredDirection;
      if (!isRunning && !isGameOver) {
        setIsRunning(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isRunning, isGameOver, resetGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.fillStyle = "#030712";
    context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    context.strokeStyle = "rgba(255,255,255,0.04)";
    context.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i += 1) {
      const offset = i * CELL_SIZE;
      context.beginPath();
      context.moveTo(offset + 0.5, 0);
      context.lineTo(offset + 0.5, CANVAS_SIZE);
      context.stroke();
      context.beginPath();
      context.moveTo(0, offset + 0.5);
      context.lineTo(CANVAS_SIZE, offset + 0.5);
      context.stroke();
    }

    context.fillStyle = "#f97316";
    context.fillRect(
      food.x * CELL_SIZE + 2,
      food.y * CELL_SIZE + 2,
      CELL_SIZE - 4,
      CELL_SIZE - 4,
    );

    snake.forEach((segment, index) => {
      context.fillStyle = index === 0 ? "#38bdf8" : "#0ea5e9";
      context.fillRect(
        segment.x * CELL_SIZE + 1,
        segment.y * CELL_SIZE + 1,
        CELL_SIZE - 2,
        CELL_SIZE - 2,
      );
    });
  }, [snake, food]);

  const handleStart = useCallback(() => {
    if (isGameOver) {
      resetGame(true);
    } else {
      setIsRunning(true);
    }
  }, [isGameOver, resetGame]);

  const handlePause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const handleResume = useCallback(() => {
    if (!isGameOver) {
      setIsRunning(true);
    }
  }, [isGameOver]);

  const handleRestart = useCallback(() => {
    resetGame(true);
  }, [resetGame]);

  const showStart = !isRunning && !isGameOver && score === 0;
  const showResume = !isRunning && !isGameOver && score > 0;

  return (
    <div className="flex w-full flex-col gap-8 text-slate-100">
      <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Neon Snake
          </h1>
          <p className="text-sm text-slate-300">
            Use the arrow keys or WASD to guide the snake. Eat energy orbs to
            grow, but avoid colliding with walls or your tail. Press space to
            pause or restart.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
          <span className="rounded-full bg-slate-800/80 px-4 py-1 text-slate-200">
            Score: {score}
          </span>
          <span className="rounded-full bg-slate-800/80 px-4 py-1 text-slate-200">
            High Score: {highScore}
          </span>
          <span className="rounded-full bg-slate-800/80 px-4 py-1 text-slate-200">
            Speed: {(1000 / speed).toFixed(1)} tiles/sec
          </span>
        </div>
        <div className="flex flex-wrap gap-3">
          {showStart && (
            <button
              type="button"
              onClick={handleStart}
              className="rounded-full bg-white/5 px-6 py-2 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Start
            </button>
          )}
          {isRunning && (
            <button
              type="button"
              onClick={handlePause}
              className="rounded-full bg-white/5 px-6 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Pause
            </button>
          )}
          {showResume && (
            <button
              type="button"
              onClick={handleResume}
              className="rounded-full bg-white/5 px-6 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Resume
            </button>
          )}
          <button
            type="button"
            onClick={handleRestart}
            disabled={score === 0 && !isRunning && !isGameOver}
            className="rounded-full bg-white/5 px-6 py-2 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Restart
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="h-[500px] w-[500px] rounded-3xl border border-white/10 bg-slate-950/90 shadow-2xl shadow-cyan-500/10"
        />
        {isGameOver && (
          <div className="rounded-full bg-rose-500/20 px-6 py-2 text-sm font-semibold text-rose-200">
            Game over! Press restart or hit space to play again.
          </div>
        )}
        <div className="grid grid-cols-3 gap-2 text-xs text-slate-300 sm:hidden">
          <button
            type="button"
            onClick={() => {
              const desired = KEY_TO_DIRECTION.ArrowUp;
              const { x: currentX, y: currentY } = directionRef.current;
              if (currentX + desired.x !== 0 || currentY + desired.y !== 0) {
                nextDirectionRef.current = desired;
                if (!isRunning) {
                  setIsRunning(true);
                }
              }
            }}
            className="col-start-2 rounded-lg bg-white/5 px-4 py-3 font-semibold text-white"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => {
              const desired = KEY_TO_DIRECTION.ArrowLeft;
              const { x: currentX, y: currentY } = directionRef.current;
              if (currentX + desired.x !== 0 || currentY + desired.y !== 0) {
                nextDirectionRef.current = desired;
                if (!isRunning) {
                  setIsRunning(true);
                }
              }
            }}
            className="rounded-lg bg-white/5 px-4 py-3 font-semibold text-white"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => {
              const desired = KEY_TO_DIRECTION.ArrowRight;
              const { x: currentX, y: currentY } = directionRef.current;
              if (currentX + desired.x !== 0 || currentY + desired.y !== 0) {
                nextDirectionRef.current = desired;
                if (!isRunning) {
                  setIsRunning(true);
                }
              }
            }}
            className="rounded-lg bg-white/5 px-4 py-3 font-semibold text-white"
          >
            →
          </button>
          <button
            type="button"
            onClick={() => {
              const desired = KEY_TO_DIRECTION.ArrowDown;
              const { x: currentX, y: currentY } = directionRef.current;
              if (currentX + desired.x !== 0 || currentY + desired.y !== 0) {
                nextDirectionRef.current = desired;
                if (!isRunning) {
                  setIsRunning(true);
                }
              }
            }}
            className="col-start-2 rounded-lg bg-white/5 px-4 py-3 font-semibold text-white"
          >
            ↓
          </button>
        </div>
      </div>
    </div>
  );
}
