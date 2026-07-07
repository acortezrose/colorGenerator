import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import * as culori from "culori";

const PANEL_COUNT = 5;
const BASE_HUES = Array.from(
	{ length: PANEL_COUNT },
	(_, i) => (i * 360) / PANEL_COUNT,
);
const BASE_ANGLES = [-32, -16, 0, 16, 32];
const HOVER_PUSH = 28;
const DEFAULT_CARD_WIDTH = 114;
const DEFAULT_CARD_HEIGHT = 330;
const LOUPE_SIZE_RATIO = 96 / DEFAULT_CARD_WIDTH;
const STOP_COUNT = 12;
const LOUPE_WINDOW = 0.05;
const HOVER_LEAVE_GRACE_MS = 150;

const toRgb = culori.clampGamut("rgb");
const oklchCss = (l: number, c: number, h: number) =>
	culori.formatCss(toRgb(`oklch(${l} ${c} ${h})`));

const sampleCard = (t: number) => ({
	l: 0.9 - t * 0.65,
	c: 0.05 + t * 0.4,
});

const buildCardGradient = (hue: number) => {
	const stops = Array.from({ length: STOP_COUNT }, (_, i) => {
		const t = i / (STOP_COUNT - 1);
		const { l, c } = sampleCard(t);
		const pct = (t * 100).toFixed(0);
		return `${oklchCss(l, c, hue)} ${pct}%`;
	});
	return `linear-gradient(to bottom, ${stops.join(", ")})`;
};

const getPivotRelative = (
	mx: number,
	my: number,
	pivotX: number,
	pivotY: number,
) => {
	const dx = mx - pivotX;
	const dy = my - pivotY;
	const angleDeg = (Math.atan2(dx, -dy) * 180) / Math.PI;
	const distance = Math.sqrt(dx * dx + dy * dy);
	return { angleDeg, distance };
};

const buildLoupeGradient = (hue: number, centerT: number) => {
	const lo = Math.max(0, centerT - LOUPE_WINDOW);
	const hi = Math.min(1, centerT + LOUPE_WINDOW);
	const span = hi - lo || 1;
	const stops = Array.from({ length: 5 }, (_, i) => {
		const t = lo + (span * i) / 4;
		const { l, c } = sampleCard(t);
		const pct = (((t - lo) / span) * 100).toFixed(1);
		return `${oklchCss(l, c, hue)} ${pct}%`;
	});
	return `linear-gradient(to bottom, ${stops.join(", ")})`;
};

interface Pointer {
	index: number;
	t: number;
	x: number;
	y: number;
}

interface SwatchFanProps {
	onSelectColor?: (l: number, c: number, h: number) => void;
	cardWidth?: number;
	cardHeight?: number;
	fanAmount?: number;
}

export function SwatchFan({
	onSelectColor,
	cardWidth = DEFAULT_CARD_WIDTH,
	cardHeight = DEFAULT_CARD_HEIGHT,
	fanAmount = 1,
}: SwatchFanProps) {
	const loupeSize = cardWidth * LOUPE_SIZE_RATIO;
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
	const [pointer, setPointer] = useState<Pointer | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const hasMounted = useRef(false);
	const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(() => {
		hasMounted.current = true;
		return () => {
			if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
		};
	}, []);

	const gradients = useMemo(() => BASE_HUES.map(buildCardGradient), []);

	const cancelScheduledLeave = () => {
		if (leaveTimerRef.current) {
			clearTimeout(leaveTimerRef.current);
			leaveTimerRef.current = null;
		}
	};

	const scheduleLeave = () => {
		cancelScheduledLeave();
		leaveTimerRef.current = setTimeout(() => {
			setHoveredIndex(null);
			setPointer(null);
		}, HOVER_LEAVE_GRACE_MS);
	};

	const updatePointerFromClient = (clientX: number, clientY: number) => {
		if (!containerRef.current) return;
		const rect = containerRef.current.getBoundingClientRect();
		const mx = clientX - rect.left;
		const my = clientY - rect.top;
		const { angleDeg, distance } = getPivotRelative(
			mx,
			my,
			rect.width / 2,
			rect.height,
		);

		let closestIndex = 0;
		let closestDiff = Infinity;
		BASE_ANGLES.forEach((a, i) => {
			const diff = Math.abs(a - angleDeg);
			if (diff < closestDiff) {
				closestDiff = diff;
				closestIndex = i;
			}
		});

		const t = Math.min(1, Math.max(0, 1 - distance / cardHeight));
		cancelScheduledLeave();
		setHoveredIndex(closestIndex);
		setPointer({ index: closestIndex, t, x: mx, y: my });
	};

	const handleContainerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		updatePointerFromClient(e.clientX, e.clientY);
	};

	const commitPointerSelection = () => {
		if (!pointer) return;
		const { l, c } = sampleCard(pointer.t);
		onSelectColor?.(l, c, BASE_HUES[pointer.index]);
	};

	const handleContainerClick = () => {
		commitPointerSelection();
	};

	const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
		const touch = e.touches[0];
		if (touch) updatePointerFromClient(touch.clientX, touch.clientY);
	};

	const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
		const touch = e.touches[0];
		if (touch) updatePointerFromClient(touch.clientX, touch.clientY);
	};

	const handleTouchEnd = () => {
		commitPointerSelection();
		setHoveredIndex(null);
		setPointer(null);
	};

	return (
		<div
			ref={containerRef}
			className="relative mx-auto"
			onMouseMove={handleContainerMouseMove}
			onMouseLeave={scheduleLeave}
			onClick={handleContainerClick}
			onTouchStart={handleTouchStart}
			onTouchMove={handleTouchMove}
			onTouchEnd={handleTouchEnd}
			style={{
				width: cardWidth * 3,
				height: cardHeight + 60,
				cursor: "none",
				touchAction: "none",
			}}
		>
			{BASE_HUES.map((_, i) => {
				const isHovered = hoveredIndex === i;
				const pushSign =
					hoveredIndex === null ? 0 : Math.sign(i - hoveredIndex);
				const extraPush =
					hoveredIndex === null || isHovered ? 0 : pushSign * HOVER_PUSH;
				const angle = BASE_ANGLES[i] * fanAmount + extraPush;

				return (
					<motion.div
						key={i}
						initial={{ rotate: 0, opacity: 0 }}
						animate={{
							rotate: angle,
							opacity: 1,
							y: isHovered ? -20 : 0,
							scale: isHovered ? 1.06 : 1,
						}}
						transition={{
							type: "spring",
							stiffness: 140,
							damping: 16,
							delay: hasMounted.current ? 0 : i * 0.05,
						}}
						style={{
							position: "absolute",
							bottom: 0,
							left: "50%",
							marginLeft: -cardWidth / 2,
							width: cardWidth,
							height: cardHeight,
							transformOrigin: "bottom center",
							borderRadius: 12,
							background: gradients[i],
							boxShadow:
								"0 6px 14px -6px rgba(0,0,0,.18), inset 0 0 0 1px rgba(0,0,0,.08)",
							zIndex: i,
						}}
					/>
				);
			})}
			<AnimatePresence>
				{pointer && (
					<motion.div
						style={{
							position: "absolute",
							left: pointer.x - loupeSize / 2,
							top: pointer.y - loupeSize / 2,
							width: loupeSize,
							height: loupeSize,
							borderRadius: "50%",
							overflow: "hidden",
							pointerEvents: "none",
							boxShadow:
								"0 4px 12px -4px rgba(0,0,0,.10), 0 2px 4px -2px rgba(0,0,0,.10), 0 32px 32px 32px rgba(0,0,0,.04)",
							zIndex: 20,
						}}
						key="loupe"
						initial={{ opacity: 0, filter: "blur(4px)", scale: 0.7 }}
						animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
						exit={{ opacity: 0, filter: "blur(6px)", scale: 0.7 }}
						transition={{
							type: "spring",
							stiffness: 250,
							damping: 20,
							mass: 1,
						}}
					>
						<div
							style={{
								position: "absolute",
								inset: 0,
								background: buildLoupeGradient(
									BASE_HUES[pointer.index],
									pointer.t,
								),
							}}
						/>
						<div
							style={{
								position: "absolute",
								inset: 0,
								borderRadius: "50%",
								boxShadow:
									"inset 0 1px 2px 1px rgba(0,0,0,.08), inset 0 0 4px 2px rgba(255,255,255,.04), inset 0 0 12px 4px rgba(255,255,255,.04), inset 0 0 24px 6px rgba(255,255,255,.04)",
							}}
						/>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
