// Reads every SVG in archetypes/, parses its shapes/filters/colors, and emits
// src/generated/gradientArchetypes.js — the single generated source of truth
// for GRADIENT_STYLE_GEOMETRY, STYLE_MULTIPLIERS, GRADIENT_STYLE_PRESETS, and
// GRADIENT_STYLE_NAMES consumed by harmony.jsx / circleSample.tsx /
// circleSampleForm.tsx.
//
// Convention: every archetype SVG must have a base fill (full-canvas
// background shape) and one or more <g filter="url(#id)"> groups, each
// containing one or more <path d="..." fill="..."/> or <rect ... fill="..."/>
// shapes, plus matching <filter> defs of either kind: a single
// <feGaussianBlur stdDeviation="..."/> (outer glow), or Figma's inner-shadow
// chain (feOffset + feGaussianBlur + feComposite + a recoloring
// feColorMatrix). viewBox need not be 88x88 — everything is scaled uniformly
// to fit the app's 88x88 canvas. Shapes are numbered in document order
// (flattened across groups); that order maps 1:1 to each style's hue/light
// multiplier tiers.
//
// Color fit: hueShiftFactor and lightnessShiftFactor are each archetype's own
// "pivot" — derived from its single most extreme shape (largest hue swing /
// lightness swing from the base fill) rather than a value shared across every
// archetype. The pivot itself is mathematically arbitrary (any value works
// equally well paired with correctly-fit multipliers), but a shared one meant
// every archetype's slider defaults looked identical, hiding how much shift
// each design actually uses. Every tier gets its own exactly-fit hue/light/
// chroma multiplier (closed-form inverse of the runtime formulas in
// harmony.jsx) relative to that archetype's pivot, so the generated preset
// still reproduces the archetype's reference colors exactly — including
// chroma, which used to be a single flat value averaged across all tiers and
// could only approximate archetypes whose shapes span several unrelated hues.
//
// Path scaling assumes only M/L/H/V/C absolute commands (no Arc), since that
// covers every archetype built so far — every numeric token in `d` is scaled
// uniformly, which is correct for square-to-square uniform scaling. Rect
// shapes carry a separate rotate-only transform (same shape as the ellipse
// mask's) rather than going through scaleNumber, so the rotation angle itself
// is never scaled — only its pivot point is.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as culori from "culori";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARCHETYPES_DIR = path.resolve(__dirname, "../archetypes");
const OUTPUT_FILE = path.resolve(
	__dirname,
	"../src/generated/gradientArchetypes.js",
);

// Only used as a last resort, for the degenerate case where an archetype's
// shapes are all exactly the base fill's hue/lightness (nothing to pivot on).
const FALLBACK_HUE_SHIFT = 46;
const FALLBACK_LIGHTNESS_SHIFT = 0.7;

const toOklch = culori.converter("oklch");

function attr(tag, name) {
	const match = tag.match(new RegExp(`${name}="([^"]*)"`));
	return match ? match[1] : undefined;
}

function scaleNumber(str, scale) {
	if (scale === 1) return str;
	return str.replace(/-?\d*\.?\d+(?:[eE][-+]?\d+)?/g, (m) => {
		const scaled = Number(m) * scale;
		return Number(scaled.toFixed(4)).toString();
	});
}

// Parses a `transform="rotate(angle cx cy)"` attribute into a structured
// {angle, pivotX, pivotY}, scaling only the pivot — the angle is scale-
// invariant. Returns null for absent/unsupported (non-rotate) transforms.
function parseRotateTransform(transformAttr, scale) {
	if (!transformAttr) return null;
	const m = transformAttr.match(
		/rotate\(([-\d.]+)[,\s]+([-\d.]+)[,\s]+([-\d.]+)\)/,
	);
	if (!m) return null;
	return {
		angle: Number(m[1]),
		pivotX: Number((Number(m[2]) * scale).toFixed(4)),
		pivotY: Number((Number(m[3]) * scale).toFixed(4)),
	};
}

// "rise-up.svg" -> { key: "RiseUp", label: "Rise Up" }. `key` is the internal
// PascalCase identifier used for STYLE_MULTIPLIERS/geometry/colorKey names;
// `label` is the human-readable Title Case string shown in the UI dropdown.
function styleNameFromFilename(filename) {
	const base = path.basename(filename, path.extname(filename));
	const words = base.split(/[-_\s]+/).filter(Boolean);
	const capitalize = (w) => w.charAt(0).toUpperCase() + w.slice(1);
	return {
		key: words.map(capitalize).join(""),
		label: words.map(capitalize).join(" "),
	};
}

// Signed shortest hue difference (base - target), normalized to (-180, 180].
function hueDelta(baseHue, targetHue) {
	let raw = ((baseHue - targetHue) % 360 + 540) % 360 - 180;
	return raw;
}

// Raw (pre-pivot) exponential-space lightness distance for one shape — the
// exact inverse of the runtime softShiftLightness(base, unit*mult) formula,
// stopping short of dividing by a unit so the caller can pick the pivot.
// Positive means the target is lighter than base.
function lightRawDelta(baseLightness, targetLightness) {
	const diff = targetLightness - baseLightness;
	if (Math.abs(diff) < 1e-9) return 0;
	const positive = diff > 0;
	const headroom = positive ? 1 - baseLightness : baseLightness;
	if (headroom <= 1e-9) return 0;
	const frac = Math.min(Math.abs(diff) / headroom, 0.999999);
	const delta = -headroom * Math.log(1 - frac);
	return positive ? delta : -delta;
}

// Two mask shapes are supported: ellipse (rotate-only transform) and rect
// (arbitrary matrix transform — e.g. Plume's rounded "pill" masks, which use
// a reflection+rotation matrix, not just a rotation). A common Figma export
// pattern is a full-canvas luminance mask (`<path d="M{W} 0H0V{H}H{W}V0Z"
// fill="white"/>`) wrapping everything — that's redundant with our own
// clipPath, so it's deliberately *not* captured here; any group that
// references it (instead of a real ellipse/rect mask) is left unmasked,
// matching prior behavior for Corner/Flare.
function parseMasks(svgText, scale) {
	const masks = {};
	const maskRegex = /<mask id="([\w-]+)"([^>]*)>([\s\S]*?)<\/mask>/g;
	let m;
	while ((m = maskRegex.exec(svgText))) {
		const [, id, openAttrs, body] = m;
		const ellipseMatch = body.match(/<ellipse\b([^>]*)\/>/);
		const rectMatch = !ellipseMatch && body.match(/<rect\b([^>]*)\/>/);
		if (!ellipseMatch && !rectMatch) continue;

		const round = (n) => Number((n * scale).toFixed(4));
		const maskType = attr(openAttrs, "style")?.includes("luminance")
			? "luminance"
			: "alpha";

		// <mask> has its own region (x/y/width/height, default -10%/-10%/120%/
		// 120% of the viewport per spec) that content is clipped to — separate
		// from the region of whatever it's masking. These archetype shapes are
		// often larger than the 88x88 canvas, so the spec default clips them too
		// tight; browsers disagree on exactly how (Safari clips strictly,
		// Firefox is lenient), causing a visible cross-browser mismatch. Prefer
		// the source SVG's explicit region; otherwise derive one generous enough
		// to fully contain the (possibly rotated/reflected) shape.
		const explicitX = attr(openAttrs, "x");
		const explicitY = attr(openAttrs, "y");
		const explicitWidth = attr(openAttrs, "width");
		const explicitHeight = attr(openAttrs, "height");
		const hasExplicitRegion =
			explicitX && explicitY && explicitWidth && explicitHeight;

		if (ellipseMatch) {
			const eAttrs = ellipseMatch[1];
			const cx = Number(attr(eAttrs, "cx"));
			const cy = Number(attr(eAttrs, "cy"));
			const rx = Number(attr(eAttrs, "rx"));
			const ry = Number(attr(eAttrs, "ry"));
			const rotate = parseRotateTransform(attr(eAttrs, "transform"), 1);
			const angle = rotate ? rotate.angle : 0;

			let regionX, regionY, regionWidth, regionHeight;
			if (hasExplicitRegion) {
				regionX = Number(explicitX);
				regionY = Number(explicitY);
				regionWidth = Number(explicitWidth);
				regionHeight = Number(explicitHeight);
			} else {
				const rad = (angle * Math.PI) / 180;
				const halfW = Math.sqrt((rx * Math.cos(rad)) ** 2 + (ry * Math.sin(rad)) ** 2);
				const halfH = Math.sqrt((rx * Math.sin(rad)) ** 2 + (ry * Math.cos(rad)) ** 2);
				regionX = cx - halfW * 1.2;
				regionY = cy - halfH * 1.2;
				regionWidth = halfW * 2.4;
				regionHeight = halfH * 2.4;
			}

			masks[id] = {
				id,
				maskType,
				shape: "ellipse",
				x: round(regionX),
				y: round(regionY),
				width: round(regionWidth),
				height: round(regionHeight),
				cx: round(cx),
				cy: round(cy),
				rx: round(rx),
				ry: round(ry),
				rotate: rotate
					? {
							angle,
							pivotX: round(rotate.pivotX),
							pivotY: round(rotate.pivotY),
						}
					: null,
			};
		} else {
			const rAttrs = rectMatch[1];
			const width = Number(attr(rAttrs, "width"));
			const height = Number(attr(rAttrs, "height"));
			const rx = Number(attr(rAttrs, "rx")) || 0;
			const matrixMatch = rAttrs.match(/transform="matrix\(([^)]+)\)"/);
			const matrix = matrixMatch
				? matrixMatch[1].trim().split(/[\s,]+/).map(Number)
				: [1, 0, 0, 1, 0, 0];

			let regionX, regionY, regionWidth, regionHeight;
			if (hasExplicitRegion) {
				regionX = Number(explicitX);
				regionY = Number(explicitY);
				regionWidth = Number(explicitWidth);
				regionHeight = Number(explicitHeight);
			} else {
				const corners = [
					[0, 0],
					[width, 0],
					[0, height],
					[width, height],
				].map(([x, y]) => [
					matrix[0] * x + matrix[2] * y + matrix[4],
					matrix[1] * x + matrix[3] * y + matrix[5],
				]);
				const xs = corners.map((c) => c[0]);
				const ys = corners.map((c) => c[1]);
				const minX = Math.min(...xs), maxX = Math.max(...xs);
				const minY = Math.min(...ys), maxY = Math.max(...ys);
				regionX = minX - (maxX - minX) * 0.1;
				regionY = minY - (maxY - minY) * 0.1;
				regionWidth = (maxX - minX) * 1.2;
				regionHeight = (maxY - minY) * 1.2;
			}

			masks[id] = {
				id,
				maskType,
				shape: "rect",
				x: round(regionX),
				y: round(regionY),
				width: round(regionWidth),
				height: round(regionHeight),
				rectWidth: round(width),
				rectHeight: round(height),
				rectRx: round(rx),
				// Linear (a,b,c,d) part of an affine matrix is unaffected by a
				// uniform scale — only the translation (e,f) needs it.
				matrix: [matrix[0], matrix[1], matrix[2], matrix[3], round(matrix[4]), round(matrix[5])],
			};
		}
	}
	return masks;
}

// Stack-based <g> walker (regex alone can't correctly pair nested same-name
// tags): tracks which <g mask="url(#id)"> a given <g filter="url(#id)"> is
// nested inside, if any, so filter-groups can be attributed to the mask that
// clips them.
function findEnclosingMasks(svgText) {
	const tagRegex = /<g\b([^>]*)>|<\/g>/g;
	const stack = [];
	const filterToMask = {};
	let match;
	while ((match = tagRegex.exec(svgText))) {
		if (match[0] === "</g>") {
			stack.pop();
			continue;
		}
		const attrs = match[1] || "";
		const maskMatch = attrs.match(/mask="url\(#([\w-]+)\)"/);
		const filterMatch = attrs.match(/filter="url\(#([\w-]+)\)"/);
		if (filterMatch) {
			const enclosingMask = [...stack].reverse().find((s) => s.type === "mask");
			filterToMask[filterMatch[1]] = enclosingMask ? enclosingMask.id : null;
			stack.push({ type: "filter" });
		} else if (maskMatch) {
			stack.push({ type: "mask", id: maskMatch[1] });
		} else {
			stack.push({ type: "plain" });
		}
	}
	return filterToMask;
}

function parseArchetypeSVG(svgText, styleName) {
	const viewBoxMatch = svgText.match(
		/viewBox="0 0 ([\d.]+) ([\d.]+)"/,
	);
	if (!viewBoxMatch) throw new Error(`${styleName}: missing viewBox`);
	const sourceSize = Number(viewBoxMatch[1]);
	const scale = 88 / sourceSize;

	const baseMatch =
		svgText.match(
			new RegExp(
				`<path d="M${sourceSize} 0H0V${sourceSize}H${sourceSize}V0Z" fill="(#[0-9A-Fa-f]{3,8})"\\s*/>`,
			),
		) ||
		svgText.match(
			/<rect width="[\d.]+" height="[\d.]+" fill="(#[0-9A-Fa-f]{3,8})"\s*\/>/,
		);
	if (!baseMatch) throw new Error(`${styleName}: couldn't find base fill`);
	const baseHex = baseMatch[1];
	const base = toOklch(baseHex);

	const groups = [];
	const shapeTargets = [];
	const groupRegex = /<g filter="url\(#([\w-]+)\)">([\s\S]*?)<\/g>/g;
	let groupMatch;
	while ((groupMatch = groupRegex.exec(svgText))) {
		const [, filterId, groupBody] = groupMatch;
		const shapes = [];
		// path and rect are matched together (not two separate passes) so tiers
		// stay numbered in true document order regardless of which tag a given
		// archetype happens to use.
		const shapeRegex = /<(path|rect)\b[^>]*\/>/g;
		let shapeMatch;
		while ((shapeMatch = shapeRegex.exec(groupBody))) {
			const tag = shapeMatch[0];
			const tagName = shapeMatch[1];
			const fill = attr(tag, "fill");
			if (!fill) continue;
			if (tagName === "path") {
				const d = attr(tag, "d");
				if (!d) continue;
				const colorKey = `css${styleName}Shift${shapeTargets.length + 1}`;
				shapes.push({ type: "path", d: scaleNumber(d, scale), colorKey });
			} else {
				const width = Number(attr(tag, "width"));
				const height = Number(attr(tag, "height"));
				if (!Number.isFinite(width) || !Number.isFinite(height)) continue;
				const x = Number(attr(tag, "x")) || 0;
				const y = Number(attr(tag, "y")) || 0;
				const rx = Number(attr(tag, "rx")) || 0;
				const colorKey = `css${styleName}Shift${shapeTargets.length + 1}`;
				shapes.push({
					type: "rect",
					x: Number((x * scale).toFixed(4)),
					y: Number((y * scale).toFixed(4)),
					width: Number((width * scale).toFixed(4)),
					height: Number((height * scale).toFixed(4)),
					rx: Number((rx * scale).toFixed(4)),
					rotate: parseRotateTransform(attr(tag, "transform"), scale),
					colorKey,
				});
			}
			shapeTargets.push(toOklch(fill));
		}
		if (shapes.length > 0) groups.push({ filterId, shapes });
	}
	if (groups.length === 0) throw new Error(`${styleName}: no filter groups found`);

	const parsedMasks = parseMasks(svgText, scale);
	const filterToMask = findEnclosingMasks(svgText);
	for (const group of groups) {
		const rawMaskId = filterToMask[group.filterId];
		group.maskId = rawMaskId && parsedMasks[rawMaskId] ? rawMaskId : null;
	}
	const usedMaskIds = new Set(groups.map((g) => g.maskId).filter(Boolean));
	const masks = Object.values(parsedMasks).filter((m) => usedMaskIds.has(m.id));

	const filters = [];
	const filterRegex = /<filter\b([^>]*)>([\s\S]*?)<\/filter>/g;
	let filterMatch;
	while ((filterMatch = filterRegex.exec(svgText))) {
		const [, openTagAttrs, body] = filterMatch;
		const id = attr(`<filter ${openTagAttrs}`, "id");
		const x = Number(attr(`<filter ${openTagAttrs}`, "x"));
		const y = Number(attr(`<filter ${openTagAttrs}`, "y"));
		const width = Number(attr(`<filter ${openTagAttrs}`, "width"));
		const height = Number(attr(`<filter ${openTagAttrs}`, "height"));
		const stdDeviationMatch = body.match(/stdDeviation="([\d.]+)"/);
		if (!id || !stdDeviationMatch) continue;
		const base = {
			id,
			x: Number((x * scale).toFixed(4)),
			y: Number((y * scale).toFixed(4)),
			width: Number((width * scale).toFixed(4)),
			height: Number((height * scale).toFixed(4)),
		};
		// Figma inner shadow: feOffset + feGaussianBlur + feComposite, then a
		// recoloring feColorMatrix — distinct from the plain outer-glow blur
		// (feFlood + feBlend + feGaussianBlur alone, no feOffset). The alpha-
		// extraction feColorMatrix that precedes it (a fixed "hardAlpha" step,
		// always the same values, carries no color) is skipped by taking the
		// *last* feColorMatrix, in case a future archetype ever has more than
		// one recoloring step.
		const offsetMatch = body.match(/<feOffset\b[^>]*\/>/);
		const colorMatrixMatches = [
			...body.matchAll(/<feColorMatrix[^>]*type="matrix"[^>]*values="([^"]+)"/g),
		];
		if (offsetMatch && colorMatrixMatches.length > 0) {
			filters.push({
				...base,
				type: "innerShadow",
				dx: Number((Number(attr(offsetMatch[0], "dx") || 0) * scale).toFixed(4)),
				dy: Number((Number(attr(offsetMatch[0], "dy") || 0) * scale).toFixed(4)),
				stdDeviation: Number((Number(stdDeviationMatch[1]) * scale).toFixed(4)),
				colorMatrix: colorMatrixMatches[colorMatrixMatches.length - 1][1].trim(),
			});
		} else {
			filters.push({
				...base,
				type: "blur",
				stdDeviation: Number((Number(stdDeviationMatch[1]) * scale).toFixed(4)),
			});
		}
	}
	if (filters.length === 0) throw new Error(`${styleName}: no filters found`);

	// Pivot on this archetype's own most extreme shape (largest hue/lightness
	// swing from the base fill) rather than a value shared across every
	// archetype — see the file-header comment for why the pivot's absolute
	// value doesn't otherwise matter.
	const hueDeltas = shapeTargets.map((t) => hueDelta(base.h, t.h));
	const maxAbsHueDelta = Math.max(...hueDeltas.map(Math.abs));
	const archetypeHueShift =
		maxAbsHueDelta > 1e-6 ? maxAbsHueDelta : FALLBACK_HUE_SHIFT;
	const hue = hueDeltas.map((d) => Number((d / archetypeHueShift).toFixed(6)));

	const lightRawDeltas = shapeTargets.map((t) => lightRawDelta(base.l, t.l));
	const maxAbsLightRawDelta = Math.max(...lightRawDeltas.map(Math.abs));
	const archetypeLightnessShift =
		maxAbsLightRawDelta > 1e-6 ? maxAbsLightRawDelta : FALLBACK_LIGHTNESS_SHIFT;
	const lightnessUnit = archetypeLightnessShift / 7;
	const light = lightRawDeltas.map((d) =>
		Number((d / lightnessUnit).toFixed(6)),
	);

	// chromaShift is a scaling factor (default 1 = full strength) applied to
	// each tier's own exact chroma multiplier, mirroring hue/light — not a flat
	// delta shared by every tier. Unlike hue/lightness, this is already
	// archetype-relative with no shared pivot to fix: "1" always means "this
	// archetype's own original chroma swing," whichever archetype it is.
	const chroma = shapeTargets.map((t) => Number((t.c - base.c).toFixed(4)));

	return {
		geometry: { groups, filters, masks },
		multipliers: { hue, light, chroma },
		preset: {
			hueShift: Number(archetypeHueShift.toFixed(2)),
			lightnessShift: Number(archetypeLightnessShift.toFixed(4)),
			chromaShift: 1,
		},
	};
}

export function generateArchetypes() {
	if (!fs.existsSync(ARCHETYPES_DIR)) {
		fs.mkdirSync(ARCHETYPES_DIR, { recursive: true });
	}
	const files = fs
		.readdirSync(ARCHETYPES_DIR)
		.filter((f) => f.toLowerCase().endsWith(".svg"))
		.sort();

	const geometry = {};
	const multipliers = {};
	const presets = {};
	const labels = {};
	const names = [];

	for (const file of files) {
		const { key, label } = styleNameFromFilename(file);
		const svgText = fs.readFileSync(path.join(ARCHETYPES_DIR, file), "utf8");
		try {
			const parsed = parseArchetypeSVG(svgText, key);
			geometry[key] = parsed.geometry;
			multipliers[key] = parsed.multipliers;
			presets[key] = parsed.preset;
			labels[key] = label;
			names.push(key);
		} catch (err) {
			console.error(`[archetypes] Skipping ${file}: ${err.message}`);
		}
	}

	const banner =
		"// AUTO-GENERATED by scripts/generateArchetypes.mjs from archetypes/*.svg.\n" +
		"// Do not edit by hand — edit the SVGs and let the build regenerate this.\n";
	const contents =
		banner +
		`export const GRADIENT_STYLE_GEOMETRY = ${JSON.stringify(geometry, null, "\t")};\n\n` +
		`export const STYLE_MULTIPLIERS = ${JSON.stringify(multipliers, null, "\t")};\n\n` +
		`export const GRADIENT_STYLE_PRESETS = ${JSON.stringify(presets, null, "\t")};\n\n` +
		`export const GRADIENT_STYLE_LABELS = ${JSON.stringify(labels, null, "\t")};\n\n` +
		`export const GRADIENT_STYLE_NAMES = ${JSON.stringify(names, null, "\t")};\n`;

	fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
	fs.writeFileSync(OUTPUT_FILE, contents);
	console.log(
		`[archetypes] Generated ${names.length} style(s): ${names.join(", ") || "(none)"}`,
	);
	return names;
}

const isMain =
	process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
	generateArchetypes();
}
