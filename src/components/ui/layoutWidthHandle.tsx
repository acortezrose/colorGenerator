import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { elasticClamp } from "@/utils/rubberBand";
import {
	HANDLE_MAX_STRETCH_PX,
	SETTLE_MS,
} from "@/components/ui/layoutDivider";

type LayoutWidthHandleProps = {
	// Current max width in px; Infinity means no limit.
	maxWidth: number;
	stops: readonly number[];
	// Distance from the layout's right edge to the line (the samples card's
	// right margin), so the line sits on the card's edge.
	edgeInsetPx: number;
	onChange: (maxWidth: number) => void;
};

const formatWidth = (width: number) =>
	Number.isFinite(width) ? `${width}px` : "Full";

// Draggable right edge of the samples card that sets the whole layout's max
// width. Reuses the column divider's look (.layout-divider in App.css).
export function LayoutWidthHandle({
	maxWidth,
	stops,
	edgeInsetPx,
	onChange,
}: LayoutWidthHandleProps) {
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
		setDragX(lineAt(maxWidth));
		clearTimeout(settleTimer.current);
		settleTimer.current = setTimeout(() => {
			setIsHandingOff(true);
			setDragX(null);
			requestAnimationFrame(() =>
				requestAnimationFrame(() => setIsHandingOff(false)),
			);
		}, SETTLE_MS);
	};

	// Stops at or past the window width all look like "Full", so only the
	// unlimited one is kept.
	const usableStops = () => {
		const viewport = document.documentElement.clientWidth;
		return stops.filter((stop) => !Number.isFinite(stop) || stop < viewport);
	};

	const nearestStop = (width: number) => {
		const viewport = document.documentElement.clientWidth;
		return usableStops().reduce((best, stop) => {
			const effective = (s: number) => Math.min(s, viewport);
			return Math.abs(effective(stop) - width) <
				Math.abs(effective(best) - width)
				? stop
				: best;
		});
	};

	// Where the line sits (viewport x) once the layout is `stop` wide. The
	// layout is centered, so this doesn't depend on its in-flight width.
	const lineAt = (stop: number) => {
		const viewport = document.documentElement.clientWidth;
		return viewport / 2 + Math.min(stop, viewport) / 2 - edgeInsetPx;
	};

	// The line tracks the pointer between the narrowest and widest usable
	// stops, and stretches elastically past them.
	const followX = (clientX: number) => {
		const stops = usableStops();
		return elasticClamp(
			clientX,
			lineAt(stops[0]),
			lineAt(stops[stops.length - 1]),
			HANDLE_MAX_STRETCH_PX,
		);
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
		// The layout is centered, so it grows on both sides: twice the
		// pointer's distance from the center keeps the edge under the pointer.
		const center = document.documentElement.clientWidth / 2;
		const width = 2 * (e.clientX + edgeInsetPx - center);
		const next = nearestStop(width);
		if (next !== maxWidth) onChange(next);
	};

	const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		const list = usableStops();
		const index = list.indexOf(nearestStop(maxWidth));
		let next = index;
		if (e.key === "ArrowLeft") next = index - 1;
		else if (e.key === "ArrowRight") next = index + 1;
		else if (e.key === "Home") next = 0;
		else if (e.key === "End") next = list.length - 1;
		else return;
		e.preventDefault();
		onChange(list[Math.min(list.length - 1, Math.max(0, next))]);
	};

	return (
		<div
			role="separator"
			aria-orientation="vertical"
			aria-label="Resize layout width"
			aria-valuetext={`Layout width ${formatWidth(maxWidth)}`}
			tabIndex={0}
			className={`layout-divider layout-divider--outer hidden md:block ${isDragging ? "is-dragging" : ""} ${isHandingOff ? "no-transition" : ""}`}
			style={
				dragX === null
					? { left: `calc(100% - ${edgeInsetPx}px)` }
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
