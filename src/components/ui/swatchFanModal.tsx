import * as React from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { SwatchFan } from "@/components/ui/swatchFan";

interface SwatchFanModalProps {
	peek: boolean;
	open: boolean;
	onClose: () => void;
	onSelectColor: (l: number, c: number, h: number) => void;
}

const PEEK_VISIBLE_PX = 320;
const HIDDEN_MARGIN_PX = 40;
const CARD_ASPECT = 114 / 330;
// Fully fanned-out (±32deg) panels visually extend well past the naive
// cardWidth * 3 box, since they rotate outward from a bottom-center pivot.
// This is the measured ratio of total visual fan width to cardHeight.
const FAN_WIDTH_TO_HEIGHT_RATIO = 1.4;
const MAX_CARD_HEIGHT = 720;
// The panels are bottom-anchored within their own box, so the visual mass of
// the open fan sits below the box's geometric center. Nudge it up so it
// reads as centered, scaled to cardHeight so it holds up across screen sizes.
const OPEN_Y_NUDGE_RATIO = 0.06;

const useFanLayout = (active: boolean) => {
	const [layout, setLayout] = useState({
		width: 300,
		height: 300,
		windowHeight: 800,
	});

	useEffect(() => {
		if (!active) return;
		const compute = () => {
			const heightBudget = window.innerHeight * 0.6;
			const widthBudget =
				(window.innerWidth * 0.98) / FAN_WIDTH_TO_HEIGHT_RATIO;
			const cardHeight = Math.min(heightBudget, widthBudget, MAX_CARD_HEIGHT);
			const cardWidth = cardHeight * CARD_ASPECT;
			setLayout({
				width: cardWidth,
				height: cardHeight,
				windowHeight: window.innerHeight,
			});
		};
		compute();
		window.addEventListener("resize", compute);
		return () => window.removeEventListener("resize", compute);
	}, [active]);

	return layout;
};

export function SwatchFanModal({
	peek,
	open,
	onClose,
	onSelectColor,
}: SwatchFanModalProps) {
	const phase = open ? "open" : peek ? "peek" : "hidden";
	const { width, height, windowHeight } = useFanLayout(phase !== "hidden");

	useEffect(() => {
		if (!open) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [open, onClose]);

	const fanTotalHeight = height + 60;
	const offscreenCenterOffset = windowHeight / 2 + fanTotalHeight / 2;
	const hiddenY = offscreenCenterOffset + HIDDEN_MARGIN_PX;
	const peekY = offscreenCenterOffset - PEEK_VISIBLE_PX;
	const openY = -height * OPEN_Y_NUDGE_RATIO;

	return createPortal(
		<AnimatePresence>
			{phase !== "hidden" && [
				<motion.div
					key="scrim"
					className="fixed inset-0"
					style={{
						zIndex: 100,
						background: "rgba(255,255,255,.7)",
						pointerEvents: phase === "open" ? "auto" : "none",
					}}
					initial={{ opacity: 0 }}
					animate={{ opacity: phase === "open" ? 1 : 0 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.4, ease: "easeOut" }}
					onClick={onClose}
				/>,
				<motion.div
					key="fan-host"
					className="fixed inset-0 flex items-center justify-center"
					style={{ zIndex: 101, pointerEvents: "none" }}
					initial={{ y: hiddenY, scale: 0.9 }}
					animate={{
						y: phase === "open" ? openY : peekY,
						scale: phase === "open" ? 1 : 0.9,
					}}
					exit={{ y: hiddenY, scale: 0.9 }}
					transition={{
						type: "spring",
						stiffness: phase === "open" ? 320 : 380,
						damping: phase === "open" ? 24 : 28,
					}}
				>
					<div
						onClick={(e) => e.stopPropagation()}
						style={{ pointerEvents: phase === "open" ? "auto" : "none" }}
					>
						<SwatchFan
							cardWidth={width}
							cardHeight={height}
							fanAmount={phase === "open" ? 1 : 0.2}
							onSelectColor={onSelectColor}
						/>
					</div>
				</motion.div>,
			]}
		</AnimatePresence>,
		document.body,
	);
}
