import * as culori from "culori";

const generateLightnessSteps = (numSwatches, min = 0.35, max = 0.9) => {
	const step = (max - min) / (numSwatches - 1 || 1);
	return Array.from({ length: numSwatches }, (_, i) => max - i * step);
};

export const generateCircleSamples = (baseColor, N, harmony) => {
	if (!baseColor) return [];
	const samples = [];
	const { l, c, h } = baseColor;
	const hueShiftFactor = 35;
	const lightnessShiftFactor = 0.2;

	if (harmony === "Equidistant") {
		for (let i = 0; i < N; i++) {
			const newHue = (h + (i * 360) / N) % 360;
			const shiftHue1 = (newHue - hueShiftFactor) % 360;
			const shift = lightnessShiftFactor * (0.5 + (1 - baseColor.l));
			const lightness1 = Math.max(0, baseColor.l - shift / 7);
			const lightness2 = Math.min(1, baseColor.l + shift / 7);
			const toRgb = culori.clampGamut("rgb");
			const css = culori.formatCss(toRgb(`oklch(${l} ${c} ${newHue})`));
			const cssShift1 = culori.formatCss(
				toRgb(`oklch(${lightness1} ${c} ${shiftHue1})`)
			);
			const cssShift2 = culori.formatCss(
				toRgb(`oklch(${lightness2} ${c} ${shiftHue1})`)
			);
			samples.push({ l, c, h: newHue, css, cssShift1, cssShift2 });
		}
	} else if (harmony === "Monochromatic") {
		for (let i = 0; i < N; i++) {
			const newLightness = l - (i * 0.6) / N + 0.2;
			const shiftHue1 = (h - hueShiftFactor) % 360;
			const shift = lightnessShiftFactor * (0.5 + (1 - baseColor.l));
			const lightness1 = Math.max(0, newLightness + shift / 1.5);
			const lightness2 = Math.min(1, newLightness + shift);
			samples.push({
				l: newLightness,
				c,
				h,
				css: `oklch(${newLightness} ${c} ${h})`,
				cssShift1: `oklch(${lightness1} ${c} ${shiftHue1})`,
				cssShift2: `oklch(${lightness2} ${c} ${shiftHue1})`,
			});
		}
	} else if (harmony === "Analogous") {
		const hueStep = 60 / N;
		const lightnessCycle = [0.85, 0.75, 0.65, 0.55, 0.45];
		for (let i = 0; i < N; i++) {
			const newHue = (h + (i - Math.floor(N / 2)) * hueStep) % 360;
			const lightness = lightnessCycle[i % lightnessCycle.length];
			const shiftHue1 = (newHue - hueShiftFactor + 360) % 360;
			const shift = lightnessShiftFactor * (0.5 + (1 - baseColor.l));
			const lightness1 = Math.max(0, baseColor.l + shift / 1.5);
			const lightness2 = Math.min(1, baseColor.l + shift);
			samples.push({
				l: lightness,
				c,
				h: newHue,
				css: `oklch(${lightness} ${c} ${newHue})`,
				cssShift1: `oklch(${lightness1} ${c} ${shiftHue1})`,
				cssShift2: `oklch(${lightness2} ${c} ${shiftHue1})`,
			});
		}
	} else if (harmony === "Complementary") {
		const lightnessCycle = generateLightnessSteps(N);
		const hues = [h, (h + 180) % 360];
		for (let i = 0; i < N; i++) {
			const hue = hues[i % 2];
			const lightness =
				lightnessCycle[Math.floor(i / 2) % lightnessCycle.length];
			const shiftHue1 = (hue - hueShiftFactor + 360) % 360;
			const lightness1 = Math.min(1, lightness + lightnessShiftFactor / 1.5);
			const lightness2 = Math.min(1, lightness + lightnessShiftFactor);
			samples.push({
				l: lightness,
				c,
				h: hue,
				css: `oklch(${lightness} ${c} ${hue})`,
				cssShift1: `oklch(${lightness1} ${c} ${shiftHue1})`,
				cssShift2: `oklch(${lightness2} ${c} ${shiftHue1})`,
			});
		}
	}
	return samples;
};
