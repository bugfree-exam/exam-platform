"use client";

import {
  PointerEvent as ReactPointerEvent,
  ReactNode,
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
type DrawingsByTask = Record<string, Stroke[]>;
type Tool = "off" | "pen" | "eraser";

const COLORS = ["#111827", "#ffffff", "#dc2626", "#2563eb", "#16a34a"];
const WIDTHS = [
  { value: 2, label: "Тонкий" },
  { value: 5, label: "Средний" },
  { value: 9, label: "Толстый" },
];

function pathFromPoints(points: Point[], width: number, height: number) {
  if (points.length === 0) return "";
  return points
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command} ${point.x * width} ${point.y * height}`;
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

function strokeTouchesPoint(
  stroke: Stroke,
  point: Point,
  width: number,
  height: number
) {
  const pointInPixels = { x: point.x * width, y: point.y * height };
  const strokePoints = stroke.points.map((strokePoint) => ({
    x: strokePoint.x * width,
    y: strokePoint.y * height,
  }));
  const hitRadius = Math.max(14, stroke.width / 2 + 10);

  if (strokePoints.length === 1) {
    return (
      Math.hypot(
        pointInPixels.x - strokePoints[0].x,
        pointInPixels.y - strokePoints[0].y
      ) <= hitRadius
    );
  }

  return strokePoints.slice(1).some((end, index) =>
    distanceToSegment(pointInPixels, strokePoints[index], end) <= hitRadius
  );
}

export function TaskDrawingLayer({
  attemptId,
  taskId,
  children,
}: {
  attemptId: string;
  taskId: string;
  children: ReactNode;
}) {
  const storageKey = `exam-drawings:${attemptId}`;
  const svgRef = useRef<SVGSVGElement>(null);
  const drawingIdRef = useRef<string | null>(null);
  const erasingRef = useRef(false);
  const [tool, setTool] = useState<Tool>("off");
  const [color, setColor] = useState(COLORS[0]);
  const [lineWidth, setLineWidth] = useState(5);
  const [drawings, setDrawings] = useState<DrawingsByTask>({});
  const [canvasSize, setCanvasSize] = useState({ width: 1, height: 1 });
  const [isLoaded, setIsLoaded] = useState(false);
  const strokes = drawings[taskId] ?? [];

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(storageKey);
        if (saved) setDrawings(JSON.parse(saved) as DrawingsByTask);
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
    window.localStorage.setItem(storageKey, JSON.stringify(drawings));
  }, [drawings, isLoaded, storageKey]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const updateSize = () => {
      const rect = svg.getBoundingClientRect();
      setCanvasSize({
        width: Math.max(1, rect.width),
        height: Math.max(1, rect.height),
      });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(svg);
    return () => observer.disconnect();
  }, [taskId]);

  function pointFromEvent(event: ReactPointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    };
  }

  function eraseAtPoint(point: Point) {
    setDrawings((current) => ({
      ...current,
      [taskId]: (current[taskId] ?? []).filter(
        (stroke) =>
          !strokeTouchesPoint(
            stroke,
            point,
            canvasSize.width,
            canvasSize.height
          )
      ),
    }));
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
    setDrawings((current) => ({
      ...current,
      [taskId]: [...(current[taskId] ?? []), stroke],
    }));
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
    setDrawings((current) => ({
      ...current,
      [taskId]: (current[taskId] ?? []).map((stroke) =>
        stroke.id === id
          ? { ...stroke, points: [...stroke.points, point] }
          : stroke
      ),
    }));
  }

  function endInteraction(event: ReactPointerEvent<SVGSVGElement>) {
    if (!drawingIdRef.current && !erasingRef.current) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    drawingIdRef.current = null;
    erasingRef.current = false;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-[#dadce0] bg-white px-4 py-2.5">
        <span className="mr-1 text-xs font-bold text-[#5f6368]">Заметки:</span>
        <button
          type="button"
          onClick={() => setTool((current) => (current === "pen" ? "off" : "pen"))}
          className={`rounded-md border px-3 py-1.5 text-xs font-bold transition ${
            tool === "pen"
              ? "border-[#1a73e8] bg-[#e8f0fe] text-[#1967d2]"
              : "border-[#c7c9cc] bg-white hover:bg-[#f8f9fa]"
          }`}
        >
          ✎ Маркер
        </button>
        <button
          type="button"
          onClick={() =>
            setTool((current) => (current === "eraser" ? "off" : "eraser"))
          }
          className={`rounded-md border px-3 py-1.5 text-xs font-bold transition ${
            tool === "eraser"
              ? "border-[#1a73e8] bg-[#e8f0fe] text-[#1967d2]"
              : "border-[#c7c9cc] bg-white hover:bg-[#f8f9fa]"
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
              className={`h-6 w-6 rounded-full border-2 shadow-sm ${
                color === item && tool === "pen"
                  ? "border-[#1a73e8] ring-2 ring-blue-100"
                  : "border-[#bdc1c6]"
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
          className="rounded-md border border-[#c7c9cc] bg-white px-2 py-1.5 text-xs font-bold outline-none"
        >
          {WIDTHS.map((width) => (
            <option key={width.value} value={width.value}>
              {width.label}
            </option>
          ))}
        </select>

        <span className="ml-auto hidden text-[11px] text-[#5f6368] sm:block">
          {tool === "off"
            ? "Включите инструмент, чтобы рисовать"
            : tool === "eraser"
              ? "Зажмите и проведите рядом с линией — она удалится целиком"
              : "Рисунок сохраняется на этом устройстве"}
        </span>
      </div>

      <div className="relative">
        {children}
        <svg
          ref={svgRef}
          aria-label="Слой заметок поверх задания"
          className={`absolute inset-0 h-full w-full ${
            tool === "off"
              ? "pointer-events-none"
              : tool === "eraser"
                ? "cursor-crosshair touch-none"
                : "cursor-crosshair touch-none"
          }`}
          onPointerDown={beginInteraction}
          onPointerMove={continueInteraction}
          onPointerUp={endInteraction}
          onPointerCancel={endInteraction}
          onLostPointerCapture={() => {
            drawingIdRef.current = null;
            erasingRef.current = false;
          }}
        >
          {strokes.map((stroke) => (
            <path
              key={stroke.id}
              d={pathFromPoints(stroke.points, canvasSize.width, canvasSize.height)}
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
      </div>
    </div>
  );
}
