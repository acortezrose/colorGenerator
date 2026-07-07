import { useState, useEffect, useMemo, useRef } from "react";
import { CircleSampleForm } from "@/components/ui/circleSampleForm.jsx";
import { CircleSample } from "@/components/ui/circleSample.jsx";
import { computeSwatchData } from "@/utils/swatch.tsx";
import { validateColorInput } from "@/utils/colors.jsx";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster, toast } from "sonner";
import { Analytics } from "@vercel/analytics/react";

function App() {
	const defaults = {
		colorSpace: "Hex",
		colorInput: "#9400D3",
		numberInput: 32,
		harmony: "Equidistant",
		style: "Gradient",
	};
	const [allData, setAllData] = useState(defaults);
	const [debouncedAllData, setDebouncedAllData] = useState(defaults);

	const swatchDataRef = useRef({
		circleSamples: [],
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

	const swatchData = useMemo(() => {
		const computed = computeSwatchData(debouncedAllData);
		if (computed) {
			swatchDataRef.current = computed;
		}
		return swatchDataRef.current;
	}, [debouncedAllData]);

	useEffect(() => {
		const timeout = setTimeout(() => {
			setDebouncedAllData(allData);
		}, 250);
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
			<div className="mask-overlay md:grid md:grid-cols-[1fr_3fr] w-full relative gutter-stable">
				{/* Form */}
				<div className="md:min-w-80 w-full">
					<div className="md:sticky md:top-0 md:self-start  gap-6 p-8 md:pr-4 flex flex-col">
						<CircleSampleForm
							allData={allData}
							setAllData={setAllData}
							setAllDataImmediate={setDebouncedAllData}
							swatchData={swatchData}
						/>
					</div>
				</div>
				{/* Samples Container */}
				<div className="rounded-[56px] rounded-b-none md:rounded-[56px] mt-8 md:m-8 shadow-[0_0_0_1px_rgba(0,0,0,0.08)] flex flex-col overflow-hidden  md:gutter-stable">
					<ul className="bg-neutral-100 card gap-5 p-8 gutter-stable">
						{/* Samples */}
						<AnimatePresence>
							{swatchData.circleSamples.map((color, i) => (
								<motion.li key={i} className="sample">
									<CircleSample
										allData={allData}
										swatchData={swatchData}
										color={color}
										i={i}
									/>
								</motion.li>
							))}
						</AnimatePresence>
					</ul>
				</div>
			</div>
			<Toaster position="bottom-right" />
			<Analytics />
		</div>
	);
}

export default App;
