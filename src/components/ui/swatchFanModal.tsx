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

const useFanLayout = (active: boolean) => {
	const [layout, setLayout] = useState({
		width: 300,
		height: 300,
		windowHeight: 800,
	});

	useEffect(() => {
		if (!active) return;
		const compute = () => {
			const cardHeight = Math.min(window.innerHeight * 0.55, 480);
			const cardWidth = cardHeight * (114 / 330);
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
						y: phase === "open" ? 0 : peekY,
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
