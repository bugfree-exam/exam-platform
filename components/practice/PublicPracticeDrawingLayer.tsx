"use client";

import {
  PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type Point = { x: number; y: number };
type Stroke = {
  id: string;
  color: string;
  width: number;
  points: Point[];
};
type Tool = "off" | "pen" | "eraser";
type Viewport = { x: number; y: number; width: number; height: number };

const COLORS = ["#111827", "#ffffff", "#dc2626", "#2563eb", "#16a34a"];
const WIDTHS = [
  { value: 2, label: "Тонкий" },
  { value: 5, label: "Средний" },
  { value: 9, label: "Толстый" },
];

function isPoint(value: unknown): value is Point {
  if (!value || typeof value !== "object") return false;
  const point = value as Partial<Point>;
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function isStroke(value: unknown): value is Stroke {
  if (!value || typeof value !== "object") return false;
  const stroke = value as Partial<Stroke>;
  return (
    typeof stroke.id === "string" &&
    typeof stroke.color === "string" &&
    Number.isFinite(stroke.width) &&
    Array.isArray(stroke.points) &&
    stroke.points.every(isPoint)
  );
}

function pathFromPoints(points: Point[]) {
  return points
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command} ${point.x} ${point.y}`;
    })
    .join(" ");
}

function distanceToSegment(point: Point, start: Point, end: Point) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const progress = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) /
        lengthSquared
    )
  );
  const closest = {
    x: start.x + progress * dx,
    y: start.y + progress * dy,
  };

  return Math.hypot(point.x - closest.x, point.y - closest.y);
}

function strokeTouchesPoint(stroke: Stroke, point: Point) {
  const hitRadius = Math.max(14, stroke.width / 2 + 10);

  if (stroke.points.length === 1) {
    return (
      Math.hypot(
        point.x - stroke.points[0].x,
        point.y - stroke.points[0].y
      ) <= hitRadius
    );
  }

  return stroke.points
    .slice(1)
    .some((end, index) =>
      distanceToSegment(point, stroke.points[index], end) <= hitRadius
    );
}

export function PublicPracticeDrawingLayer({ taskId }: { taskId: string }) {
  const storageKey = `open-bank-drawings:${taskId}`;
  const drawingIdRef = useRef<string | null>(null);
  const erasingRef = useRef(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [tool, setTool] = useState<Tool>("off");
  const [color, setColor] = useState(COLORS[0]);
  const [lineWidth, setLineWidth] = useState(5);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [viewport, setViewport] = useState<Viewport>({
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  });

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved) as unknown;
          setStrokes(Array.isArray(parsed) ? parsed.filter(isStroke) : []);
        }
      } catch {
        window.localStorage.removeItem(storageKey);
      } finally {
        setIsLoaded(true);
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [storageKey]);

  useEffect(() => {
    if (!isLoaded) return;
    window.localStorage.setItem(storageKey, JSON.stringify(strokes));
  }, [isLoaded, storageKey, strokes]);

  useEffect(() => {
    const updateViewport = () => {
      setViewport({
        x: window.scrollX,
        y: window.scrollY,
        width: Math.max(1, window.innerWidth),
        height: Math.max(1, window.innerHeight),
      });
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    window.addEventListener("scroll", updateViewport, { passive: true });
    return () => {
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("scroll", updateViewport);
    };
  }, []);

  useEffect(() => {
    if (tool === "off") return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTool("off");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tool]);

  function pointFromEvent(event: ReactPointerEvent<SVGSVGElement>) {
    return {
      x: event.clientX + window.scrollX,
      y: event.clientY + window.scrollY,
    };
  }

  function eraseAtPoint(point: Point) {
    setStrokes((current) =>
      current.filter((stroke) => !strokeTouchesPoint(stroke, point))
    );
  }

  function beginInteraction(event: ReactPointerEvent<SVGSVGElement>) {
    if (tool === "off" || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    if (tool === "eraser") {
      erasingRef.current = true;
      eraseAtPoint(pointFromEvent(event));
      return;
    }

    const id = crypto.randomUUID();
    drawingIdRef.current = id;
    const stroke: Stroke = {
      id,
      color,
      width: lineWidth,
      points: [pointFromEvent(event)],
    };
    setStrokes((current) => [...current, stroke]);
  }

  function continueInteraction(event: ReactPointerEvent<SVGSVGElement>) {
    if (tool === "eraser" && erasingRef.current) {
      event.preventDefault();
      eraseAtPoint(pointFromEvent(event));
      return;
    }

    const id = drawingIdRef.current;
    if (!id || tool !== "pen") return;
    event.preventDefault();
    const point = pointFromEvent(event);
    setStrokes((current) =>
      current.map((stroke) =>
        stroke.id === id
          ? { ...stroke, points: [...stroke.points, point] }
          : stroke
      )
    );
  }

  function endInteraction(event: ReactPointerEvent<SVGSVGElement>) {
    if (!drawingIdRef.current && !erasingRef.current) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    drawingIdRef.current = null;
    erasingRef.current = false;
  }

  function clearStrokes() {
    if (
      strokes.length > 0 &&
      window.confirm("Удалить все пометки для этого задания?")
    ) {
      setStrokes([]);
    }
  }

  return (
    <>
      <svg
        aria-label="Полноэкранный слой пометок"
        className={`fixed inset-0 z-40 h-screen w-screen select-none ${
          tool === "off" ? "pointer-events-none" : "cursor-crosshair touch-none"
        }`}
        viewBox={`${viewport.x} ${viewport.y} ${viewport.width} ${viewport.height}`}
        preserveAspectRatio="none"
        onPointerDown={beginInteraction}
        onPointerMove={continueInteraction}
        onPointerUp={endInteraction}
        onPointerCancel={endInteraction}
        onLostPointerCapture={() => {
          drawingIdRef.current = null;
          erasingRef.current = false;
        }}
      >
        <rect
          x={viewport.x}
          y={viewport.y}
          width={viewport.width}
          height={viewport.height}
          fill="transparent"
        />
        {strokes.map((stroke) => (
          <path
            key={stroke.id}
            d={pathFromPoints(stroke.points)}
            fill="none"
            stroke={stroke.color}
            strokeWidth={stroke.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            className="pointer-events-none"
          />
        ))}
      </svg>

      {tool === "off" ? (
        <button
          type="button"
          onClick={() => setTool("pen")}
          className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-2xl transition hover:-translate-y-0.5 hover:bg-cyan-800 sm:bottom-6 sm:right-6"
        >
          <span aria-hidden="true">✎</span>
          Пометки
          {strokes.length > 0 ? (
            <span className="rounded-full bg-cyan-300 px-2 py-0.5 text-[10px] text-slate-950">
              {strokes.length}
            </span>
          ) : null}
        </button>
      ) : (
        <div
          role="toolbar"
          aria-label="Инструменты для пометок"
          className="fixed bottom-3 left-1/2 z-50 flex w-[calc(100%-1.5rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/95 p-2.5 text-white shadow-2xl backdrop-blur sm:bottom-5 sm:w-auto sm:flex-nowrap sm:justify-start"
        >
          <button
            type="button"
            onClick={() => setTool("pen")}
            className={`rounded-xl px-3 py-2 text-xs font-black transition ${
              tool === "pen"
                ? "bg-cyan-300 text-slate-950"
                : "bg-white/10 hover:bg-white/20"
            }`}
          >
            ✎ Маркер
          </button>
          <button
            type="button"
            onClick={() => setTool("eraser")}
            className={`rounded-xl px-3 py-2 text-xs font-black transition ${
              tool === "eraser"
                ? "bg-cyan-300 text-slate-950"
                : "bg-white/10 hover:bg-white/20"
            }`}
          >
            ◇ Ластик
          </button>

          <div className="flex items-center gap-1" aria-label="Цвет маркера">
            {COLORS.map((item) => (
              <button
                key={item}
                type="button"
                title={`Цвет ${item}`}
                aria-label={`Выбрать цвет ${item}`}
                onClick={() => {
                  setColor(item);
                  setTool("pen");
                }}
                className={`h-7 w-7 rounded-full border-2 shadow-sm ${
                  color === item && tool === "pen"
                    ? "border-cyan-300 ring-2 ring-cyan-300/30"
                    : "border-white/40"
                }`}
                style={{ backgroundColor: item }}
              />
            ))}
          </div>

          <select
            aria-label="Толщина маркера"
            value={lineWidth}
            onChange={(event) => {
              setLineWidth(Number(event.target.value));
              setTool("pen");
            }}
            className="rounded-xl border border-white/20 bg-white/10 px-2 py-2 text-xs font-bold outline-none"
          >
            {WIDTHS.map((width) => (
              <option
                key={width.value}
                value={width.value}
                className="bg-slate-950"
              >
                {width.label}
              </option>
            ))}
          </select>

          <span className="hidden h-7 w-px bg-white/15 sm:block" />
          <button
            type="button"
            disabled={strokes.length === 0}
            onClick={() => setStrokes((current) => current.slice(0, -1))}
            className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ↶ Отменить
          </button>
          <button
            type="button"
            disabled={strokes.length === 0}
            onClick={clearStrokes}
            className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold transition hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Очистить
          </button>
          <button
            type="button"
            onClick={() => setTool("off")}
            className="rounded-xl bg-white px-4 py-2 text-xs font-black text-slate-950 transition hover:bg-cyan-100"
          >
            Готово
          </button>
          <span className="hidden whitespace-nowrap text-[10px] text-slate-400 lg:block">
            Esc — выйти из рисования
          </span>
        </div>
      )}
    </>
  );
}
