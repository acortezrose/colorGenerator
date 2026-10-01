import { useState, useEffect, useMemo, useRef, startTransition } from "react";
import { CircleSampleForm } from "@/components/ui/circleSampleForm.jsx";
import { CircleSample } from "@/components/ui/circleSample.jsx";
import { LayoutDivider } from "@/components/ui/layoutDivider";
import { LayoutWidthHandle } from "@/components/ui/layoutWidthHandle";
import { computeSwatchTheme, computeCircleSamples } from "@/utils/swatch.tsx";
import { validateColorInput } from "@/utils/colors.jsx";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster, toast } from "sonner";
import { Analytics } from "@vercel/analytics/react";

// Share of the width the controls column can take on desktop.
const LAYOUT_SNAPS = [1 / 4, 1 / 3, 2 / 5, 1 / 2];
const DEFAULT_LAYOUT_FRACTION = 1 / 4;
// Matches md:min-w-80 on the controls column.
const MIN_CONTROLS_WIDTH_PX = 320;
const LAYOUT_STORAGE_KEY = "okavatar:layout-fraction";

// Max widths (px) the whole layout can snap to on desktop; Infinity is no
// limit.
const LAYOUT_WIDTH_STOPS = [960, 1200, 1400, 1600, 1920, Infinity];
const DEFAULT_LAYOUT_WIDTH = 1400;
const LAYOUT_WIDTH_STORAGE_KEY = "okavatar:layout-max-width";
// Matches md:mr-8 on the samples card.
const SAMPLES_RIGHT_MARGIN_PX = 32;

const readStoredLayoutWidth = () => {
	try {
		const stored = localStorage.getItem(LAYOUT_WIDTH_STORAGE_KEY);
		if (stored === "Infinity") return Infinity;
		return LAYOUT_WIDTH_STOPS.find((stop) => stop === Number(stored)) ??
			DEFAULT_LAYOUT_WIDTH;
	} catch {
		return DEFAULT_LAYOUT_WIDTH;
	}
};

const readStoredLayoutFraction = () => {
	try {
		const stored = Number(localStorage.getItem(LAYOUT_STORAGE_KEY));
		return LAYOUT_SNAPS.find((snap) => Math.abs(snap - stored) < 1e-6) ??
			DEFAULT_LAYOUT_FRACTION;
	} catch {
		return DEFAULT_LAYOUT_FRACTION;
	}
};

function App() {
	const defaults = {
		colorSpace: "Hex",
		colorInput: "#9400D3",
		numberInput: 16,
		harmony: "Equidistant",
		style: "Petal",
		hueShift: 46,
		lightnessShift: 0.7,
		chromaShift: 1,
		harmonySpread: 1,
	};
	const [allData, setAllData] = useState(defaults);
	const layoutRef = useRef(null);
	const [layoutFraction, setLayoutFraction] = useState(readStoredLayoutFraction);

	const [layoutMaxWidth, setLayoutMaxWidth] = useState(readStoredLayoutWidth);

	// #root lives outside React, so its max width goes through a CSS variable.
	useEffect(() => {
		document.documentElement.style.setProperty(
			"--layout-max-width",
			// 100vw rather than none so the change to "Full" still animates.
			Number.isFinite(layoutMaxWidth) ? `${layoutMaxWidth}px` : "100vw",
		);
		try {
			localStorage.setItem(LAYOUT_WIDTH_STORAGE_KEY, String(layoutMaxWidth));
		} catch {
			// Storage unavailable; just don't remember it.
		}
	}, [layoutMaxWidth]);

	useEffect(() => {
		try {
			localStorage.setItem(LAYOUT_STORAGE_KEY, String(layoutFraction));
		} catch {
			// Storage unavailable (private mode, blocked); just don't remember it.
		}
	}, [layoutFraction]);
	const [debouncedAllData, setDebouncedAllDataState] = useState(defaults);
	const setDebouncedAllData = (next) => {
		startTransition(() => {
			setDebouncedAllDataState(next);
		});
	};

	// Both keep their last valid value while the color input is mid-edit.
	const themeRef = useRef({
		swatchColor: "white",
		swatchColorDarkTint: "black",
		swatchColorDarkTint03: "rgba(0,0,0,.03)",
		swatchColorDarkTint07: "rgba(0,0,0,.07)",
		swatchColorDarkTint11: "rgba(0,0,0,.11)",
		swatchColorDarkTint12: "rgba(0,0,0,.12)",
		swatchColorDarkTint20: "rgba(0,0,0,.2)",
		swatchColorDarkTint90: "rgba(0,0,0,.9)",
		swatchColorDarkTint40: "rgba(0,0,0,.4)",
	});

	const samplesRef = useRef([]);

	// UI colors follow the live input so tweaks read immediately; only the
	// (expensive) sample grid waits on the debounce.
	const theme = useMemo(() => {
		const computed = computeSwatchTheme(allData);
		if (computed) themeRef.current = computed;
		return themeRef.current;
	}, [allData]);

	const circleSamples = useMemo(() => {
		const computed = computeCircleSamples(debouncedAllData);
		if (computed) samplesRef.current = computed;
		return samplesRef.current;
	}, [debouncedAllData]);

	const swatchData = useMemo(
		() => ({ ...theme, circleSamples }),
		[theme, circleSamples],
	);

	useEffect(() => {
		const timeout = setTimeout(() => {
			setDebouncedAllData(allData);
		}, 120);
		return () => clearTimeout(timeout);
	}, [allData]);

	useEffect(() => {
		const isValid = validateColorInput(
			debouncedAllData.colorInput,
			debouncedAllData.colorSpace.toLowerCase(),
		);
		if (!isValid) {
			toast(`Invalid ${debouncedAllData.colorSpace} color format`, {
				className: "error text-sm",
			});
		}
	}, [debouncedAllData.colorInput, debouncedAllData.colorSpace]);

	return (
		<div className="w-full gutter-stable">
			{/* TODO: switch to using tailwind where possible */}
			{/* TODO: a real mobile experience */}
			{/* On md+ the layout is pinned to the viewport and each column scrolls
			on its own. */}
			<div
				ref={layoutRef}
				className="mask-overlay layout-grid md:grid md:grid-rows-[minmax(0,1fr)] md:h-dvh w-full relative gutter-stable"
				style={{
					// Samples column stays 1fr so it always takes all leftover space.
					// With fractional fr values (e.g. 0.25fr 0.75fr), once the controls
					// column hits its 320px minimum the samples column's flex total
					// drops below 1 and it only gets that share of the space.
					gridTemplateColumns: `${layoutFraction / (1 - layoutFraction)}fr 1fr`,
					// Resize handles' line color (see .layout-divider-line).
					"--layout-accent": swatchData.swatchColorDarkTint,
				}}
			>
				{/* Form */}
				<div className="md:min-w-80 w-full md:overflow-y-auto scroll-area gutter-stable">
					<div className="gap-6 p-8 flex flex-col">
						<CircleSampleForm
							allData={allData}
							setAllData={setAllData}
							swatchData={swatchData}
						/>
					</div>
				</div>
				{/* Samples Container */}
				<div className="rounded-[56px] rounded-b-none md:rounded-[56px] mt-8 md:my-8 md:mr-8 md:ml-0 bg-neutral-100/70 backdrop-blur-[2px] shadow-(--surface-shadow) flex flex-col overflow-hidden md:overflow-y-auto scroll-area samples-scroll-area md:gutter-stable">
					<ul className="card gap-5 p-8">
						{/* Samples */}
						<AnimatePresence>
							{swatchData.circleSamples.map((color, i) => (
								<motion.li key={i} className="sample">
									<CircleSample style={allData.style} color={color} i={i} />
								</motion.li>
							))}
						</AnimatePresence>
					</ul>
				</div>
				<LayoutDivider
					fraction={layoutFraction}
					snaps={LAYOUT_SNAPS}
					minLeftPx={MIN_CONTROLS_WIDTH_PX}
					containerRef={layoutRef}
					onChange={setLayoutFraction}
				/>
				<LayoutWidthHandle
					maxWidth={layoutMaxWidth}
					stops={LAYOUT_WIDTH_STOPS}
					edgeInsetPx={SAMPLES_RIGHT_MARGIN_PX}
					onChange={setLayoutMaxWidth}
				/>
			</div>
			<Toaster position="bottom-right" />
			<Analytics />
		</div>
	);
}

export default App;
