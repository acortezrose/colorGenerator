import { convertColor, validateColorInput } from "@/utils/colors.jsx";
import { generateCircleSamples } from "@/utils/harmony.jsx";

interface AllData {
	colorSpace: "hex" | "rgb" | "hsl";
	colorInput: string;
	numberInput: number;
	harmony: "equidistant" | "monochromatic" | "analogous" | "complementary";
	style: "gradient" | "flat";
}

export function computeSwatchData(allData: AllData) {
	const isValid = validateColorInput(
		allData.colorInput,
		allData.colorSpace.toLowerCase(),
	);
	if (!isValid) return null;

	const convertedColor = convertColor(allData.colorInput, allData.colorSpace);
	if (!convertedColor) return null;

	const samples = generateCircleSamples(
		convertedColor,
		allData.numberInput,
		allData.harmony,
	);
	const swatchData = {
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
	};
	return swatchData;
}
