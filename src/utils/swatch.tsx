import { convertColor, validateColorInput } from "@/utils/colors.jsx";
import { generateCircleSamples } from "@/utils/harmony.jsx";

interface AllData {
	colorSpace: "hex" | "rgb" | "hsl";
	colorInput: string;
	numberInput: number;
	harmony: "equidistant" | "monochromatic" | "analogous" | "complementary";
	style: string;
	hueShift: number;
	lightnessShift: number;
	chromaShift: number;
	harmonySpread: number;
}

function parseBaseColor(allData: AllData) {
	const isValid = validateColorInput(
		allData.colorInput,
		allData.colorSpace.toLowerCase(),
	);
	if (!isValid) return null;
	return convertColor(allData.colorInput, allData.colorSpace) || null;
}

// UI tints derived from the base color. Cheap enough to recompute on every
// input change, so the form can follow the live value.
export function computeSwatchTheme(allData: AllData) {
	const convertedColor = parseBaseColor(allData);
	if (!convertedColor) return null;
	return {
		swatchColor: `oklch(${convertedColor.l} ${convertedColor.c} ${convertedColor.h})`,
		swatchColorDarkTint: `oklch(.5 ${convertedColor.c} ${convertedColor.h})`,
		swatchColorDarkTint03: `oklch(.6 ${convertedColor.c} ${convertedColor.h} / .03)`,
		swatchColorDarkTint07: `oklch(.6 ${convertedColor.c} ${convertedColor.h} / .07)`,
		swatchColorDarkTint11: `oklch(.6 ${convertedColor.c} ${convertedColor.h} / .11)`,
		swatchColorDarkTint12: `oklch(.6 ${convertedColor.c} ${convertedColor.h} / .12)`,
		swatchColorDarkTint20: `oklch(.6 ${convertedColor.c} ${convertedColor.h} / .2)`,
		swatchColorDarkTint40: `oklch(.6 ${convertedColor.c} ${convertedColor.h} / .4)`,
		swatchColorDarkTint90: `oklch(.6 ${convertedColor.c} ${convertedColor.h} / .9)`,
	};
}

export function computeCircleSamples(allData: AllData) {
	const convertedColor = parseBaseColor(allData);
	if (!convertedColor) return null;
	return generateCircleSamples(
		convertedColor,
		allData.numberInput,
		allData.harmony,
		{
			hueShift: allData.hueShift,
			lightnessShift: allData.lightnessShift,
			chromaShift: allData.chromaShift,
		},
		allData.harmonySpread,
	);
}
