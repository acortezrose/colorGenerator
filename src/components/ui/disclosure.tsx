import * as React from "react";
import { useId, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDownIcon } from "lucide-react";

type DisclosureProps = {
	label: string;
	// Accessible name when the visible label isn't unique on the page.
	ariaLabel?: string;
	defaultOpen?: boolean;
	className?: string;
	children: React.ReactNode;
};

// Strong ease-out: fast start, long gentle settle.
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

// The panel stays mounted and animates with CSS (see .disclosure-panel in
// App.css). Mounting the sliders at open time used to stall the height
// animation while they measured themselves, so the reveal jumped at the end.
export function Disclosure({
	label,
	ariaLabel,
	defaultOpen = false,
	className = "",
	children,
}: DisclosureProps) {
	const [isOpen, setIsOpen] = useState(defaultOpen);
	// Fully open and done animating. Only then is clipping lifted, so slider
	// stretch and focus rings aren't cut off.
	const [isSettled, setIsSettled] = useState(defaultOpen);
	const contentId = useId();

	const toggle = () => {
		setIsSettled(false);
		setIsOpen((open) => !open);
	};

	const onTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
		if (e.target !== e.currentTarget) return;
		if (e.propertyName === "grid-template-rows" && isOpen) setIsSettled(true);
	};

	return (
		<div className={`flex flex-col ${className}`}>
			<button
				type="button"
				onClick={toggle}
				aria-label={ariaLabel}
				aria-expanded={isOpen}
				aria-controls={contentId}
				className="flex items-center justify-between text-sm px-1 py-1 rounded-md text-neutral-600 cursor-pointer transition ease duration-150 hover:text-black focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgb(255,255,255),0_0_0_4px_rgb(0,0,0)]"
			>
				{label}
				<motion.span
					animate={{ rotate: isOpen ? 180 : 0 }}
					transition={{ duration: 0.4, ease: EASE_OUT }}
					className="flex"
				>
					<ChevronDownIcon className="size-3.5" />
				</motion.span>
			</button>
			<div
				id={contentId}
				className="disclosure-panel"
				data-open={isOpen}
				inert={!isOpen}
				onTransitionEnd={onTransitionEnd}
			>
				{/* Padded out (and pulled back by the same amount) so the sections'
				shadows have room inside the clip while the panel animates. */}
				<div
					className={`min-h-0 -mx-2 px-2 -mb-2 pb-2 ${isSettled ? "" : "overflow-hidden"}`}
				>
					<div className="pt-1">{children}</div>
				</div>
			</div>
		</div>
	);
}
