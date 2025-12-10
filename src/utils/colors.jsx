import * as culori from "culori";

export const convertColor = (color, format) => {
	try {
		const toOklch = (c) => culori.oklch(culori.parse(c));
		if (format === "Hex") return toOklch(color);
		if (format === "RGB") return toOklch(`rgb(${color})`);
		if (format === "HSL") return toOklch(`hsl(${color})`);
	} catch (e) {
		return null;
	}
	return null;
};

export const validateColorInput = (color, format) => {
	if (format === "hex") {
		return /^#?([0-9A-Fa-f]{3}){1,2}$/.test(color);
	}
	if (format === "rgb") {
		return /^\s*(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(?:[\s,]+(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){2}\s*$/.test(
			color
		);
	}
	if (format === "hsl") {
		return /^(\s*\d+(\.\d+)?\s*%?)(?:[,\s]+\d+(\.\d+)?\s*%?){2}\s*$/.test(
			color
		);
	}
	return false;
};

export const convertFromOklch = (oklchColor, targetFormat) => {
	if (!oklchColor) return "";
	try {
		const rgb = culori.rgb(oklchColor);
		if (targetFormat === "Hex") {
			return culori.formatHex(rgb);
		}
		if (targetFormat === "RGB") {
			const r = Math.round(rgb.r * 255);
			const g = Math.round(rgb.g * 255);
			const b = Math.round(rgb.b * 255);
			return `${r}, ${g}, ${b}`;
		}
		if (targetFormat === "HSL") {
			const hsl = culori.hsl(rgb);
			const h = Math.round(hsl.h || 0);
			const s = Math.round(hsl.s * 100);
			const l = Math.round(hsl.l * 100);
			return `${h}, ${s}%, ${l}%`;
		}
	} catch (e) {
		return "";
	}
	return "";
};
