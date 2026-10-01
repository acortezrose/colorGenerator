import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { elasticClamp } from "@/utils/rubberBand";

// How far (px) a handle can be pulled past its first or last stop.
export const HANDLE_MAX_STRETCH_PX = 24;
// Matches the .layout-divider left transition in App.css.
export const SETTLE_MS = 300;

type LayoutDividerProps = {
	// Share of the container's width taken by the left column (0–1).
	fraction: number;
	snaps: readonly number[];
	// The left column never gets narrower than this, so the line follows it.
	minLeftPx: number;
	containerRef: React.RefObject<HTMLElement | null>;
	onChange: (fraction: number) => void;
};

const nearest = (snaps: readonly number[], value: number) =>
	snaps.reduce((best, snap) =>
		Math.abs(snap - value) < Math.abs(best - value) ? snap : best,
	);

const formatFraction = (f: number) => {
	for (let d = 2; d <= 12; d++) {
		const n = Math.round(f * d);
		if (Math.abs(n / d - f) < 1e-6) return `${n}/${d}`;
	}
	return `${Math.round(f * 100)}%`;
};

// Draggable boundary between the two layout columns. Only lands on `snaps`,
// so the (expensive) sample grid re-lays out a handful of times per drag
// rather than on every pixel.
export function LayoutDivider({
	fraction,
	snaps,
	minLeftPx,
	containerRef,
	onChange,
}: LayoutDividerProps) {
	const [isDragging, setIsDragging] = useState(false);
	// Pointer x while dragging. The line follows it directly (fixed to the
	// viewport, so it doesn't drift while the layout animates underneath);
	// the layout itself snaps behind it.
	const [dragX, setDragX] = useState<number | null>(null);
	const settleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
	// True for the frame where positioning switches back, so that switch
	// itself isn't animated.
	const [isHandingOff, setIsHandingOff] = useState(false);
	useEffect(() => () => clearTimeout(settleTimer.current), []);

	// On release, glide from the pointer to the snapped edge while still
	// fixed to the viewport, and only then hand back to normal positioning.
	// Switching straight back mid-glide mixed two coordinate spaces and
	// flung the line off before it settled.
	const endDrag = () => {
		setIsDragging(false);
		setDragX(snappedLineX());
		clearTimeout(settleTimer.current);
		settleTimer.current = setTimeout(() => {
			setIsHandingOff(true);
			setDragX(null);
			requestAnimationFrame(() =>
				requestAnimationFrame(() => setIsHandingOff(false)),
			);
		}, SETTLE_MS);
	};

	// Stops that would put the left column under its minimum all look the
	// same, so only the smallest of those is kept.
	const usableSnaps = () => {
		const width = containerRef.current?.getBoundingClientRect().width ?? 0;
		const fits = snaps.filter((snap) => snap * width >= minLeftPx);
		const tooSmall = snaps.filter((snap) => snap * width < minLeftPx);
		return tooSmall.length ? [tooSmall[tooSmall.length - 1], ...fits] : fits;
	};

	// Where the line sits (viewport x) at the current snapped fraction.
	const snappedLineX = () => {
		const rect = containerRef.current!.getBoundingClientRect();
		return rect.left + Math.max(minLeftPx, fraction * rect.width);
	};

	// The line tracks the pointer between the first and last usable stops,
	// and stretches elastically past them.
	const followX = (clientX: number) => {
		const rect = containerRef.current!.getBoundingClientRect();
		const stops = usableSnaps();
		const lineAt = (snap: number) =>
			rect.left + Math.max(minLeftPx, snap * rect.width);
		return elasticClamp(
			clientX,
			lineAt(stops[0]),
			lineAt(stops[stops.length - 1]),
			HANDLE_MAX_STRETCH_PX,
		);
	};

	const fractionFromPointer = (clientX: number) => {
		const rect = containerRef.current!.getBoundingClientRect();
		return nearest(usableSnaps(), (clientX - rect.left) / rect.width);
	};

	const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		if (e.button !== 0) return;
		e.preventDefault();
		e.currentTarget.setPointerCapture(e.pointerId);
		clearTimeout(settleTimer.current);
		setIsDragging(true);
		setDragX(followX(e.clientX));
	};

	const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
		if (!isDragging) return;
		setDragX(followX(e.clientX));
		const next = fractionFromPointer(e.clientX);
		if (next !== fraction) onChange(next);
	};

	const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		const stops = usableSnaps();
		const index = stops.indexOf(nearest(stops, fraction));
		let next = index;
		if (e.key === "ArrowLeft") next = index - 1;
		else if (e.key === "ArrowRight") next = index + 1;
		else if (e.key === "Home") next = 0;
		else if (e.key === "End") next = stops.length - 1;
		else return;
		e.preventDefault();
		onChange(stops[Math.min(stops.length - 1, Math.max(0, next))]);
	};

	return (
		<div
			role="separator"
			aria-orientation="vertical"
			aria-label="Resize panels"
			aria-valuemin={Math.round(snaps[0] * 100)}
			aria-valuemax={Math.round(snaps[snaps.length - 1] * 100)}
			aria-valuenow={Math.round(fraction * 100)}
			aria-valuetext={`Controls take ${formatFraction(fraction)} of the width`}
			tabIndex={0}
			className={`layout-divider hidden md:block ${isDragging ? "is-dragging" : ""} ${isHandingOff ? "no-transition" : ""}`}
			style={
				dragX === null
					? { left: `max(${minLeftPx}px, ${fraction * 100}%)` }
					: { position: "fixed", left: dragX }
			}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={endDrag}
			onPointerCancel={endDrag}
			onKeyDown={onKeyDown}
		>
			<div className="layout-divider-line" />
		</div>
	);
}
