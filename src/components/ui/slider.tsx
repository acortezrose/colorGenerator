import * as React from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue } from "framer-motion";
import { rubberBand } from "@/utils/rubberBand";

type SliderProps = {
	name: string;
	label: string;
	value: number;
	min: number;
	max: number;
	step?: number;
	fillColor?: string;
	labelColor?: string;
	onValueChange: (value: number) => void;
};

// How far (px) the handle sits inside the fill's leading edge.
const HANDLE_INSET_PX = 10;
// Fill widths (px) over which the handle fades out as the fill gets too
// short to hold it.
const HANDLE_FADE_START_PX = 28;
const HANDLE_FADE_END_PX = 16;

// Max extra width (px) the section can stretch when dragged past its bounds.
const MAX_STRETCH_PX = 6;


const decimalsOf = (n: number) => (String(n).split(".")[1] || "").length;

export function Slider({
	name,
	label,
	value,
	min,
	max,
	step = 1,
	fillColor,
	labelColor,
	onValueChange,
}: SliderProps) {
	const sectionRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [sectionWidth, setSectionWidth] = useState(0);
	const scaleX = useMotionValue(1);
	const scaleY = useMotionValue(1);
	const originX = useMotionValue(0.5);

	const percent = ((value - min) / (max - min)) * 100;
	const fillPx = (percent / 100) * sectionWidth;
	const handleOpacity = Math.min(
		1,
		Math.max(
			0,
			(fillPx - HANDLE_FADE_END_PX) /
				(HANDLE_FADE_START_PX - HANDLE_FADE_END_PX),
		),
	);

	useLayoutEffect(() => {
		const el = sectionRef.current;
		if (!el) return;
		// offsetWidth ignores the stretch transform, so this is the resting width.
		const measure = () => setSectionWidth(el.offsetWidth);
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	const valueFromClientX = (clientX: number, rect: DOMRect) => {
		const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
		const stepped = min + Math.round((ratio * (max - min)) / step) * step;
		return Number(stepped.toFixed(decimalsOf(step)));
	};

	// Pointer drags are handled here rather than by the native range input,
	// since the input can't report how far the pointer has gone past its ends.
	const handlePointer = (e: React.PointerEvent<HTMLDivElement>) => {
		const rect = sectionRef.current!.getBoundingClientRect();
		// Undo the current stretch so the value maps to the resting width.
		const restingRect = new DOMRect(
			rect.left + (rect.width - rect.width / scaleX.get()) * originX.get(),
			rect.top,
			rect.width / scaleX.get(),
			rect.height,
		);
		const next = valueFromClientX(e.clientX, restingRect);
		if (next !== value) onValueChange(next);

		const overLeft = restingRect.left - e.clientX;
		const overRight = e.clientX - restingRect.right;
		const overshoot = Math.max(overLeft, overRight, 0);
		const stretch = rubberBand(overshoot, MAX_STRETCH_PX) / restingRect.width;
		// Anchor the side opposite the pull so it stretches toward the pointer.
		originX.set(overRight > 0 ? 0 : 1);
		scaleX.set(1 + stretch);
		scaleY.set(1 - stretch * 0.35);
	};

	const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		if (e.button !== 0) return;
		e.currentTarget.setPointerCapture(e.pointerId);
		inputRef.current?.focus({ preventScroll: true });
		setIsDragging(true);
		handlePointer(e);
	};

	const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
		if (isDragging) handlePointer(e);
	};

	const endDrag = () => {
		setIsDragging(false);
		const spring = { type: "spring", stiffness: 500, damping: 36 } as const;
		animate(scaleX, 1, spring);
		animate(scaleY, 1, spring);
	};

	return (
		<motion.div
			ref={sectionRef}
			className={`form-group text-base slider-section ${isDragging ? "is-dragging" : ""}`}
			style={{ scaleX, scaleY, originX }}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={endDrag}
			onPointerCancel={endDrag}
		>
			<div className="input-group-layout slider-row rounded-none!">
				<motion.div
					className="slider-fill"
					style={{ background: fillColor }}
					// Mount at the current value (e.g. when an accordion opens) and
					// only spring on later changes.
					initial={false}
					animate={{ width: `${percent}%` }}
					transition={{ type: "spring", bounce: 0.25, duration: 0.2 }}
				/>
				<motion.div
					className="slider-handle-track"
					aria-hidden
					initial={false}
					animate={{ opacity: handleOpacity }}
					transition={{ type: "spring", bounce: 0.25, duration: 0.2 }}
				>
					<motion.div
						className="slider-handle"
						style={{ background: labelColor, marginLeft: -HANDLE_INSET_PX }}
						initial={false}
						animate={{ left: `${percent}%` }}
						transition={{ type: "spring", bounce: 0.25, duration: 0.2 }}
					/>
				</motion.div>
				<label
					htmlFor={name}
					className="slider-label opacity-95 mix-blend-plus-darker rounded-none"
				>
					{label}
				</label>
				{/* Always shown to the step's precision, e.g. 0.30 rather than 0.3. */}
				<span className="slider-value opacity-70 mix-blend-plus-darker">
					{value.toFixed(decimalsOf(step))}
				</span>
				{/* Kept for keyboard and screen reader access; pointer input is
				handled on the section above. */}
				<input
					ref={inputRef}
					id={name}
					name={name}
					type="range"
					min={min}
					max={max}
					step={step}
					value={value}
					onChange={(e) => onValueChange(parseFloat(e.target.value))}
				/>
			</div>
		</motion.div>
	);
}
