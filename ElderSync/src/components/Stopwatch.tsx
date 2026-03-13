import { useRef, useEffect, useCallback, useReducer } from "react";
import { Button } from "./ui/button";
import { Play, Square, RotateCcw } from "lucide-react";

interface StopwatchProps {
  /** Chamado ao parar o cronômetro. Recebe o tempo em segundos (1 decimal). */
  onStop?: (timeSeconds: number) => void;
  disabled?: boolean;
  /** Valor inicial para exibição (não afeta o timer interno). */
  initialDisplay?: number | null;
}

type State = { elapsed: number; running: boolean; stopped: boolean };
type Action =
  | { type: "START" }
  | { type: "TICK"; elapsed: number }
  | { type: "STOP" }
  | { type: "RESET" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "START":
      if (state.running) return state;
      return { ...state, running: true, stopped: false };
    case "TICK":
      if (!state.running) return state;
      return { ...state, elapsed: action.elapsed };
    case "STOP":
      if (!state.running) return state;
      return { ...state, running: false, stopped: true };
    case "RESET":
      return { elapsed: 0, running: false, stopped: false };
  }
}

export function Stopwatch({ onStop, disabled, initialDisplay }: StopwatchProps) {
  const [state, dispatch] = useReducer(reducer, {
    elapsed: 0,
    running: false,
    stopped: false,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const elapsedRef = useRef(0);
  elapsedRef.current = state.elapsed;

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const start = useCallback(() => {
    if (state.running || disabled) return;
    startTimeRef.current = Date.now() - elapsedRef.current;
    intervalRef.current = setInterval(() => {
      dispatch({ type: "TICK", elapsed: Date.now() - startTimeRef.current });
    }, 50);
    dispatch({ type: "START" });
  }, [state.running, disabled]);

  const stop = useCallback(() => {
    if (!state.running) return;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    dispatch({ type: "STOP" });
    const seconds = Math.round(elapsedRef.current / 100) / 10;
    onStop?.(seconds);
  }, [state.running, onStop]);

  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    dispatch({ type: "RESET" });
  }, []);

  const displaySeconds =
    state.stopped || state.elapsed > 0
      ? (state.elapsed / 1000).toFixed(1)
      : initialDisplay != null
        ? initialDisplay.toFixed(1)
        : "0.0";

  return (
    <div className="flex items-center gap-4">
      <div className="text-4xl font-mono font-bold text-gray-900 min-w-22.5 tabular-nums">
        {displaySeconds}s
      </div>

      <div className="flex gap-2">
        {/* Ambos sempre no React tree — `hidden` (display:none) alterna visibilidade */}
        <Button
          type="button"
          size="sm"
          onClick={start}
          disabled={state.stopped || disabled}
          className={`gap-1.5 bg-[#29D68B] hover:bg-[#22c07a] text-white ${state.running ? "hidden" : ""}`}
        >
          <Play className="w-3.5 h-3.5" />
          Iniciar
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={stop}
          className={`gap-1.5 bg-red-600 hover:bg-red-700 text-white ${state.running ? "" : "hidden"}`}
        >
          <Square className="w-3.5 h-3.5" />
          Parar
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={reset}
          disabled={state.running || (!state.stopped && state.elapsed === 0)}
          title="Reiniciar"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
