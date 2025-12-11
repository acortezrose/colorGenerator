import { useState, useEffect } from "react";
import { CircleSampleForm } from "@/components/ui/circleSampleForm.jsx";
import { CircleSample } from "@/components/ui/circleSample.jsx";
import { convertColor, validateColorInput } from "@/utils/colors.jsx";
import { generateCircleSamples } from "@/utils/harmony.jsx";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster, toast } from "sonner";

function App() {
	const [allData, setAllData] = useState({
		colorSpace: "Hex",
		colorInput: "#9400D3",
		numberInput: 32,
		harmony: "Equidistant",
		style: "Gradient",
	});

	const [swatchData, setSwatchData] = useState({
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

	useEffect(() => {
		const timeout = setTimeout(() => {
			const isValid = validateColorInput(
				allData.colorInput,
				allData.colorSpace.toLowerCase()
			);
			if (!isValid) {
				toast(`Invalid ${allData.colorSpace} color format`, {
					className: "error text-sm",
				});
				return;
			}
			const convertedColor = convertColor(
				allData.colorInput,
				allData.colorSpace
			);
			if (convertedColor) {
				const samples = generateCircleSamples(
					convertedColor,
					allData.numberInput,
					allData.harmony
				);
				setSwatchData((prev) => ({
					...prev,
					swatchColor: `oklch(${convertedColor.l} ${convertedColor.c} ${convertedColor.h})`,
					swatchColorDarkTint: `oklch(.5 ${convertedColor.c} ${convertedColor.h})`,
					swatchColorDarkTint03: `oklch(.6 ${convertedColor.c} ${convertedColor.h} / .03)`,
					swatchColorDarkTint07: `oklch(.6 ${convertedColor.c} ${convertedColor.h} / .07)`,
					swatchColorDarkTint11: `oklch(.6 ${convertedColor.c} ${convertedColor.h} / .11)`,
					swatchColorDarkTint12: `oklch(.6 ${convertedColor.c} ${convertedColor.h} / .12)`,
					swatchColorDarkTint20: `oklch(.6 ${convertedColor.c} ${convertedColor.h} / .2)`,
					swatchColorDarkTint40: `oklch(.6 ${convertedColor.c} ${convertedColor.h} / .4)`,
					swatchColorDarkTint90: `oklch(.6 ${convertedColor.c} ${convertedColor.h} / .9)`,
					circleSamples: samples,
				}));
			}
		}, 500);
		return () => clearTimeout(timeout);
	}, [
		allData.colorInput,
		allData.colorSpace,
		allData.numberInput,
		allData.harmony,
	]);

	return (
		<div>
			{/* TODO: switch to using tailwind where possible */}
			{/* TODO: a real mobile experience */}
			<div className="grid">
				{/* Form */}
				<div className="min-w-xs gap-6 p-8 pr-4 flex flex-col relative overflow-auto">
					<CircleSampleForm
						allData={allData}
						setAllData={setAllData}
						swatchData={swatchData}
					/>
				</div>

				<div className="rounded-[40px] m-8 border border-1 border-[rgba(0, 0, 0, 0.08)] flex overflow-hidden flex-col">
					<div className="bg-neutral-100 card flex flex-row flex-wrap align content-start gap-4 p-6 overflow-auto">
						{/* Samples */}
						<AnimatePresence>
							{swatchData.circleSamples.map((color, i) => (
								<motion.div key={i} className="sample">
									<CircleSample
										allData={allData}
										swatchData={swatchData}
										color={color}
										i={i}
									/>
								</motion.div>
							))}
						</AnimatePresence>
					</div>
				</div>
			</div>
			<Toaster position="bottom-right" />
		</div>
	);
}

export default App;
