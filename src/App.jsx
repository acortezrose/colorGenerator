import { useState, useEffect } from "react";
import { Input } from "/components/input.tsx";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import * as culori from "culori";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster, toast } from "sonner";

function App() {
	const [allData, setAllData] = useState({
		colorSpace: "Hex",
		colorInput: "#9400D3",
		numberInput: 12,
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
	});

	const updateData = (event) => {
		setAllData((prev) => ({
			...prev,
			[event.target.name]: event.target.value,
		}));
	};

	const convertColor = (color, format) => {
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

	const validateColorInput = (color, format) => {
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

	const convertFromOklch = (oklchColor, targetFormat) => {
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

	const handleColorSpaceChange = (newColorSpace) => {
		const currentOklch = convertColor(allData.colorInput, allData.colorSpace);
		if (currentOklch) {
			const newColorValue = convertFromOklch(currentOklch, newColorSpace);
			setAllData((prev) => ({
				...prev,
				colorSpace: newColorSpace,
				colorInput: newColorValue,
			}));
		} else {
			setAllData((prev) => ({ ...prev, colorSpace: newColorSpace }));
		}
	};

	const generateLightnessSteps = (numSwatches, min = 0.35, max = 0.9) => {
		const step = (max - min) / (numSwatches - 1 || 1);
		return Array.from({ length: numSwatches }, (_, i) => max - i * step);
	};

	const generateCircleSamples = (baseColor, N, harmony) => {
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

	const downloadSVGs = async () => {
		const zip = new JSZip();
		swatchData.circleSamples.forEach((sample, idx) => {
			const hex = culori.formatHex({
				mode: "oklch",
				l: sample.l,
				c: sample.c,
				h: sample.h,
			});
			const shift1 = culori.parse(sample.cssShift1);
			const shift2 = culori.parse(sample.cssShift2);
			const hexShift1 = culori.formatHex({
				mode: "oklch",
				l: shift1.l,
				c: shift1.c,
				h: shift1.h,
			});
			const hexShift2 = culori.formatHex({
				mode: "oklch",
				l: shift2.l,
				c: shift2.c,
				h: shift2.h,
			});
			const svgParts = {
				start: `<svg width="88" height="88" viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_4740_1055)"><rect width="88" height="88" rx="44" fill="${hex}" />`,
				gradient: `<g filter="url(#filter0_f_4740_1055)"><path d="M47.3002 58.2996L28.6002 48.3996L15.4002 16.4996V-5.50039L2.2002 -26.4004L24.2002 -15.4004L47.3002 23.0996L63.8002 31.8996L107.8 28.5996V48.3996L77.0002 58.2996H47.3002Z" fill="${hexShift1}" /></g><g filter="url(#filter1_f_4740_1055)"><path d="M85.8 -1.05561V28.5124V39.6004L48.8632 28.5124L32.0737 10.0324L22 -6.59961H48.8632L85.8 -1.05561Z" fill="${hexShift2}" /></g>`,
				end: `</g><rect x="1.1" y="1.1" width="85.8" height="85.8" rx="42.9" stroke="url(#paint0_linear_4740_1055)" stroke-width="2.2" style="mix-blend-mode: overlay" />`,
				defs: `<defs><filter id="filter0_f_4740_1055" x="-24.1998" y="-52.8004" width="158.4" height="137.5" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix" /><feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" /><feGaussianBlur stdDeviation="13.2" result="effect1_foregroundBlur_4740_1055" /></filter><filter id="filter1_f_4740_1055" x="4.4" y="-24.1996" width="98.9998" height="81.4002" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood floodOpacity="0" result="BackgroundImageFix" /><feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" /><feGaussianBlur stdDeviation="8.8" result="effect1_foregroundBlur_4740_1055" /></filter><linearGradient id="paint0_linear_4740_1055" x1="44" y1="0" x2="44" y2="88" gradientUnits="userSpaceOnUse"><stop stop-color="white" stop-opacity="0.7" /><stop offset="1" stop-color="#4A5669" /></linearGradient><clipPath id="clip0_4740_1055"><rect width="88" height="88" rx="44" fill="white" /></clipPath></defs></svg>`,
			};
			const svg =
				allData.style === "Gradient"
					? svgParts.start + svgParts.gradient + svgParts.end + svgParts.defs
					: svgParts.start + svgParts.end + svgParts.defs;
			zip.file(`swatch-${idx + 1}.svg`, svg);
		});
		const content = await zip.generateAsync({ type: "blob" });
		saveAs(content, "circleSamples.zip");
	};

	return (
		<div>
			{/* TODO: switch to using tailwind where possible */}
			<div className="grid">
				<div className="min-w-xs gap-6 p-8 pr-4 flex flex-col relative overflow-scroll">
					<h1>Profile Palette Generator</h1>
					<div
						style={{
							width: "100%",
							height: "5.25em",
							borderRadius: "0.5em",
							border: `1px solid ${swatchData.swatchColorDarkTint20}`,
							background: swatchData.swatchColor,
							flexShrink: 0,
						}}
					/>
					<div className="form-group text-base">
						<div className="input-group-layout">
							<label htmlFor="colorSpace">Color Mode</label>
							<Select
								value={allData.colorSpace}
								name="colorSpace"
								onValueChange={handleColorSpaceChange}
							>
								<SelectTrigger
									className="select"
									style={{
										background: swatchData.swatchColorDarkTint11,
										color: swatchData.swatchColorDarkTint,
									}}
								>
									<SelectValue placeholder="Select a color mode" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										<SelectLabel>Color Mode</SelectLabel>
										<SelectItem value="Hex">Hex</SelectItem>
										<SelectItem value="RGB">RGB</SelectItem>
										<SelectItem value="HSL">HSL</SelectItem>
									</SelectGroup>
								</SelectContent>
							</Select>
						</div>
						<hr />
						<Input
							name="colorInput"
							label="Base Color"
							type="text"
							placeholder="#9400D3"
							value={allData.colorInput}
							onChange={updateData}
							required
						/>
						<hr />
						<Input
							name="numberInput"
							label="Number"
							type="number"
							placeholder="1 – 20"
							min={1}
							max={20}
							value={allData.numberInput}
							onChange={updateData}
							required
						/>
					</div>
					<div className="form-group text-base">
						<div className="input-group-layout">
							<label htmlFor="harmony">Harmony</label>
							<Select
								value={allData.harmony}
								name="harmony"
								onValueChange={(val) =>
									setAllData((prev) => ({ ...prev, harmony: val }))
								}
							>
								<SelectTrigger
									className="select"
									style={{
										background: swatchData.swatchColorDarkTint11,
										color: swatchData.swatchColorDarkTint,
									}}
								>
									<SelectValue placeholder="Select a harmony" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										<SelectLabel>Harmony</SelectLabel>
										<SelectItem value="Equidistant">Equidistant</SelectItem>
										<SelectItem value="Monochromatic">Monochromatic</SelectItem>
										<SelectItem value="Analogous">Analogous</SelectItem>
										<SelectItem value="Complementary">Complementary</SelectItem>
									</SelectGroup>
								</SelectContent>
							</Select>
						</div>
						<hr />
						<div className="input-group-layout">
							<label htmlFor="style">Style</label>
							<Select
								value={allData.style}
								name="style"
								onValueChange={(val) =>
									setAllData((prev) => ({ ...prev, style: val }))
								}
							>
								<SelectTrigger
									className="select"
									style={{
										background: swatchData.swatchColorDarkTint11,
										color: swatchData.swatchColorDarkTint,
									}}
								>
									<SelectValue placeholder="Select a style" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										<SelectLabel>Style</SelectLabel>
										<SelectItem value="Gradient">Gradient</SelectItem>
										<SelectItem value="Flat">Flat</SelectItem>
									</SelectGroup>
								</SelectContent>
							</Select>
						</div>
					</div>
					{swatchData.circleSamples.length > 0 && (
						<button
							onClick={downloadSVGs}
							className="text-base medium w-full button"
						>
							<span
								style={{
									borderTop: "1px solid rgba(255,255,255,.8)",
									borderBottom: "2px solid rgba(0,0,0,.2)",
									background: swatchData.swatchColorDarkTint,
									outline: `2px solid ${swatchData.swatchColorDarkTint20}`,
									boxShadow: `0px 1px 3px ${swatchData.swatchColorDarkTint12}, 0px 6px 6px ${swatchData.swatchColorDarkTint11}, 0px 13px 8px ${swatchData.swatchColorDarkTint07}, 0px 24px 9px ${swatchData.swatchColorDarkTint03}`,
								}}
							>
								Download SVGs
							</span>
						</button>
					)}
				</div>
				<div className="card">
					<AnimatePresence>
						{swatchData.circleSamples.map((color, i) => (
							<motion.div key={i} className="sample">
								<motion.svg
									width="88"
									height="88"
									viewBox="0 0 88 88"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
									key={color.css}
									initial={{ opacity: 0, filter: "blur(4px)", scale: 0.96 }}
									animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
									exit={{ opacity: 0, filter: "blur(4px)", scale: 0.5 }}
									transition={{
										type: "spring",
										stiffness: 200,
										damping: 20,
										mass: 1,
										delay: i * 0.003,
									}}
								>
									<title>Profile background {i + 1}</title>
									<g clipPath="url(#clip0_4740_1055)">
										<rect width="88" height="88" rx="44" fill={color.css} />
										{allData.style === "Gradient" && (
											<>
												<g filter="url(#filter0_f_4740_1055)">
													<path
														d="M47.3002 58.2996L28.6002 48.3996L15.4002 16.4996V-5.50039L2.2002 -26.4004L24.2002 -15.4004L47.3002 23.0996L63.8002 31.8996L107.8 28.5996V48.3996L77.0002 58.2996H47.3002Z"
														fill={color.cssShift1}
													/>
												</g>
												<g filter="url(#filter1_f_4740_1055)">
													<path
														d="M85.8 -1.05561V28.5124V39.6004L48.8632 28.5124L32.0737 10.0324L22 -6.59961H48.8632L85.8 -1.05561Z"
														fill={color.cssShift2}
													/>
												</g>
											</>
										)}
									</g>
									<rect
										x="1.1"
										y="1.1"
										width="85.8"
										height="85.8"
										rx="42.9"
										stroke="url(#paint0_linear_4740_1055)"
										strokeWidth="2.2"
										style={{ mixBlendMode: "overlay" }}
									/>
									<defs>
										{allData.style === "Gradient" && (
											<>
												<filter
													id="filter0_f_4740_1055"
													x="-24.1998"
													y="-52.8004"
													width="158.4"
													height="137.5"
													filterUnits="userSpaceOnUse"
													colorInterpolationFilters="sRGB"
												>
													<feFlood
														floodOpacity="0"
														result="BackgroundImageFix"
													/>
													<feBlend
														mode="normal"
														in="SourceGraphic"
														in2="BackgroundImageFix"
														result="shape"
													/>
													<feGaussianBlur
														stdDeviation="13.2"
														result="effect1_foregroundBlur_4740_1055"
													/>
												</filter>
												<filter
													id="filter1_f_4740_1055"
													x="4.4"
													y="-24.1996"
													width="98.9998"
													height="81.4002"
													filterUnits="userSpaceOnUse"
													colorInterpolationFilters="sRGB"
												>
													<feFlood
														floodOpacity="0"
														result="BackgroundImageFix"
													/>
													<feBlend
														mode="normal"
														in="SourceGraphic"
														in2="BackgroundImageFix"
														result="shape"
													/>
													<feGaussianBlur
														stdDeviation="8.8"
														result="effect1_foregroundBlur_4740_1055"
													/>
												</filter>
											</>
										)}
										<linearGradient
											id="paint0_linear_4740_1055"
											x1="44"
											y1="0"
											x2="44"
											y2="88"
											gradientUnits="userSpaceOnUse"
										>
											<stop stopColor="white" stopOpacity="0.7" />
											<stop offset="1" stopColor="#4A5669" />
										</linearGradient>
										<clipPath id="clip0_4740_1055">
											<rect width="88" height="88" rx="44" fill="white" />
										</clipPath>
									</defs>
								</motion.svg>
							</motion.div>
						))}
					</AnimatePresence>
				</div>
			</div>
			<Toaster position="bottom-right" />
		</div>
	);
}

export default App;
