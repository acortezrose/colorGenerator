import * as culori from "culori";
import { STYLE_MULTIPLIERS } from "@/generated/gradientArchetypes.js";

const generateLightnessSteps = (numSwatches, baseLightness, min = 0.35, max = 0.9) => {
	const levels = Math.ceil(numSwatches / 2) || 1;
	const maxK = Math.ceil((levels - 1) / 2) || 1;
	const stepUp = (max - baseLightness) / maxK;
	const stepDown = (baseLightness - min) / maxK;
	return Array.from({ length: levels }, (_, i) => {
		if (i === 0) return baseLightness;
		const k = Math.ceil(i / 2);
		const sign = i % 2 === 1 ? 1 : -1;
		const step = sign === 1 ? stepUp : stepDown;
		return Math.min(1, Math.max(0, baseLightness + sign * k * step));
	}).sort((a, b) => a - b);
};

const wrapHue = (hue) => ((hue % 360) + 360) % 360;

// Hue offset normalized to (-180, 180], so scaling it pulls toward the base
// hue from whichever side is closer.
const signedHueOffset = (deg) => wrapHue(deg + 180) - 180;

// Total hue range (degrees) Analogous covers at the top of the harmony
// spread slider.
const ANALOGOUS_MAX_RANGE = 240;

// Max hue range (degrees) each side of a Complementary pair fans across at
// the top of the harmony spread slider.
const COMPLEMENT_MAX_FAN = 60;

// Adds `delta` lightness to `base`, softly compressing it against whichever
// boundary (0 or 1) it's heading toward instead of hard-clamping. Each swatch's
// own base lightness still drives the result (so different swatches land on
// different lightened/darkened tones), but no tier can ever overshoot, and
// tiers that would have collided at the ceiling now stay smoothly graduated.
const softShiftLightness = (base, delta) => {
	if (delta === 0) return base;
	const headroom = delta > 0 ? 1 - base : base;
	if (headroom <= 0) return delta > 0 ? 1 : 0;
	const t = 1 - Math.exp(-Math.abs(delta) / headroom);
	return base + Math.sign(delta) * headroom * t;
};

export const generateCircleSamples = (
	baseColor,
	N,
	harmony,
	gradientControls = {},
	// Scales the harmony's own contrast: 1 is the unmodified harmony, lower
	// pulls the set together, higher pushes it apart.
	harmonySpread = 1,
) => {
	if (!baseColor) return [];
	const samples = [];
	const { l, c, h } = baseColor;
	const {
		hueShift: hueShiftFactor = 46,
		lightnessShift: lightnessShiftFactor = 0.7,
		chromaShift: chromaShiftFactor = 1,
	} = gradientControls;

	// Each tier gets its own exactly-fit chroma multiplier (same idea as hue and
	// lightness) instead of one flat chromaShift shared by every tier — a single
	// shared value can't represent an archetype whose shapes span several
	// unrelated hues/chromas (e.g. a multi-color illustration), since it'd only
	// ever be a compromise average across them.
	const deriveTier = (lightBase, unit, hueBase, hueMult, lightMult, baseChroma, chromaMult) => ({
		hue: wrapHue(hueBase - hueShiftFactor * hueMult),
		lightness: softShiftLightness(lightBase, unit * lightMult),
		chroma: Math.max(0, baseChroma + chromaShiftFactor * chromaMult),
	});

	// Data-driven over STYLE_MULTIPLIERS (generated from archetypes/*.svg):
	// adding a new archetype SVG automatically gets correctly-scaled colors
	// here with no further edits, named css<StyleName>Shift1..N.
	const buildStyleColors = (lightBase, unit, hueBase, baseChroma, format) => {
		const colors = {};
		Object.entries(STYLE_MULTIPLIERS).forEach(([styleName, { hue, light, chroma }]) => {
			hue.forEach((hueMult, idx) => {
				const tier = deriveTier(
					lightBase,
					unit,
					hueBase,
					hueMult,
					light[idx],
					baseChroma,
					chroma[idx],
				);
				colors[`css${styleName}Shift${idx + 1}`] = format(tier);
			});
		});
		return colors;
	};

	if (harmony === "Equidistant") {
		const toRgb = culori.clampGamut("rgb");
		const format = ({ hue, lightness, chroma }) =>
			culori.formatCss(toRgb(`oklch(${lightness} ${chroma} ${hue})`));
		const unit = lightnessShiftFactor / 7;
		// Already spans the full wheel at 1, so it can only narrow.
		const spread = Math.min(1, harmonySpread);
		for (let i = 0; i < N; i++) {
			const newHue = wrapHue(h + signedHueOffset((i * 360) / N) * spread);
			const css = culori.formatCss(toRgb(`oklch(${l} ${c} ${newHue})`));
			samples.push({
				l,
				c,
				h: newHue,
				css,
				...buildStyleColors(baseColor.l, unit, newHue, c, format),
			});
		}
	} else if (harmony === "Monochromatic") {
		const format = ({ hue, lightness, chroma }) => `oklch(${lightness} ${chroma} ${hue})`;
		const unit = lightnessShiftFactor / 7;
		for (let i = 0; i < N; i++) {
			const newLightness = Math.min(
				1,
				Math.max(0, l + (0.2 - (i * 0.6) / N) * harmonySpread),
			);
			samples.push({
				l: newLightness,
				c,
				h,
				css: `oklch(${newLightness} ${c} ${h})`,
				...buildStyleColors(newLightness, unit, h, c, format),
			});
		}
	} else if (harmony === "Analogous") {
		// 60° total at 1; below that it narrows linearly to 0, above it widens
		// faster, up to ANALOGOUS_MAX_RANGE at 2.
		const hueRange =
			harmonySpread <= 1
				? 60 * harmonySpread
				: 60 + (ANALOGOUS_MAX_RANGE - 60) * (harmonySpread - 1);
		const hueStep = hueRange / N;
		const lightnessCycle = [0.85, 0.75, 0.65, 0.55, 0.45];
		const format = ({ hue, lightness, chroma }) => `oklch(${lightness} ${chroma} ${hue})`;
		const unit = lightnessShiftFactor / 7;
		for (let i = 0; i < N; i++) {
			const newHue = (h + (i - Math.floor(N / 2)) * hueStep) % 360;
			const lightness = lightnessCycle[i % lightnessCycle.length];
			samples.push({
				l: lightness,
				c,
				h: newHue,
				css: `oklch(${lightness} ${c} ${newHue})`,
				...buildStyleColors(lightness, unit, newHue, c, format),
			});
		}
	} else if (harmony === "Complementary") {
		const lightnessCycle = generateLightnessSteps(N, baseColor.l);
		// Below 1 the complement moves toward the base hue; above 1 each side
		// fans out across a hue range (split-complementary).
		const hues = [h, wrapHue(h + 180 * Math.min(1, harmonySpread))];
		const fan = COMPLEMENT_MAX_FAN * Math.max(0, harmonySpread - 1);
		const mid = (lightnessCycle.length - 1) / 2;
		const format = ({ hue, lightness, chroma }) => `oklch(${lightness} ${chroma} ${hue})`;
		const unit = lightnessShiftFactor / 7;
		for (let i = 0; i < N; i++) {
			const j = i % lightnessCycle.length;
			const fanOffset = mid > 0 ? ((j - mid) / mid) * (fan / 2) : 0;
			const hue = wrapHue(
				hues[Math.floor(i / lightnessCycle.length) % 2] + fanOffset,
			);
			const lightness = lightnessCycle[j];
			samples.push({
				l: lightness,
				c,
				h: hue,
				css: `oklch(${lightness} ${c} ${hue})`,
				...buildStyleColors(lightness, unit, hue, c, format),
			});
		}
	}
	return samples;
};
