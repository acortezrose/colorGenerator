// iOS-style rubber banding: grows quickly at first, then asymptotically
// approaches `maxPx` however far past the limit the pointer travels.
export const rubberBand = (overshoot: number, maxPx: number) =>
	(1 - 1 / ((overshoot * 0.55) / maxPx + 1)) * maxPx;

// Passes `value` through inside [min, max]; past either end, resists with
// rubberBand so it can only stretch a little beyond.
export const elasticClamp = (
	value: number,
	min: number,
	max: number,
	maxPx: number,
) => {
	if (value < min) return min - rubberBand(min - value, maxPx);
	if (value > max) return max + rubberBand(value - max, maxPx);
	return value;
};
