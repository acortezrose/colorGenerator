import { useState, useEffect } from "react";
import { Input } from "/components/input.tsx";
import { Select } from "/components/select.tsx";
import * as culori from "culori";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import "./App.css";
import { motion, AnimatePresence } from "framer-motion";

function App() {
	const [allData, setAllData] = useState({
		colorSpace: "hex",
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
		setAllData((oldState) => ({
			...oldState,
			[event.target.name]: event.target.value,
		}));
	};
	const [error, setError] = useState(null);

	// Auto-generate when inputs change (debounced)
	useEffect(() => {
		const timeout = setTimeout(() => {
			const isValid = validateColorInput(
				allData.colorInput,
				allData.colorSpace.toLowerCase()
			);

			if (!isValid) {
				setError(`Invalid ${allData.colorSpace} color format`);
				return;
			} else {
				setError(null);
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
				// Update color scheme and swatch colors
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
					harmony: allData.harmony,
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

	// Convert color input to OKLCH
	function convertColor(color, format) {
		const toOklch = (c) => culori.oklch(culori.parse(c));

		if (format === "hex") return toOklch(color);
		if (format === "rgb") return toOklch(`rgb(${color})`);
		if (format === "hsl") return toOklch(`hsl(${color})`);
		return null;
	}

	function validateColorInput(color, format) {
		if (format === "hex") {
			return /^#([0-9A-Fa-f]{3}){1,2}$/.test(color);
		}
		if (format === "rgb") {
			return /^(\s*\d+\s*,){2}\s*\d+\s*$/.test(color); // e.g. "255,0,128"
		}
		if (format === "hsl") {
			return /^(\s*\d+\s*,){2}\s*\d+%?\s*$/.test(color); // e.g. "120,100%,50%"
		}
		return false;
	}

	// Generate N circle samples evenly spaced along the hue axis
	function generateCircleSamples(baseColor, N, harmony) {
		if (!baseColor) return [];
		const samples = [];
		const { l, c, h } = baseColor;
		var hueShiftFactor = 35;
		var lightnessShiftFactor = 0.2;
		const hueMin = 0;
		const hueMax = 360;
		const hueRange = hueMax - hueMin;

		// Generate N circle samples evenly spaced along the hue axis
		if (harmony === "Equidistant") {
			for (let i = 0; i < N; i++) {
				const newHue = (h + (i * 360) / N) % 360;
				const shiftHue1 = (newHue - hueShiftFactor) % 360;
				const shift = lightnessShiftFactor * (0.5 + (1 - baseColor.l));
				const lightness1 = Math.max(0, baseColor.l - shift / 7);
				const lightness2 = Math.min(1, baseColor.l + shift / 7);

				const toRgb = culori.clampGamut("rgb");
				var css = culori.formatCss(toRgb(`oklch(${l} ${c} ${newHue})`));
				var cssShift1 = culori.formatCss(
					toRgb(`oklch(${lightness1} ${c} ${shiftHue1})`)
				);
				var cssShift2 = culori.formatCss(
					toRgb(`oklch(${lightness2} ${c} ${shiftHue1})`)
				);

				samples.push({
					l,
					c,
					h: newHue,
					css: css,
					cssShift1: cssShift1,
					cssShift2: cssShift2,
				});
			}
		}
		// Generate N circle samples by varying lightness while keeping hue and chroma constant
		else if (harmony === "Monochromatic") {
			for (let i = 0; i < N; i++) {
				const newLightness = l - (i * 0.6) / N + 0.2; // vary lightness between 0.3 and 0.9
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
		}
		// Generate N circle samples by varying hue within a limited range around the base hue. Adjust lightness up or down every 4th sample to create more contrast similar hues.
		else if (harmony === "Analogous") {
			const hueStep = 60 / N; // how far apart analogous hues are
			const lightnessCycle = [0.85, 0.75, 0.65, 0.55, 0.45]; // repeat every 5

			for (let i = 0; i < N; i++) {
				const newHue = (h + (i - Math.floor(N / 2)) * hueStep) % 360;
				const lightness = lightnessCycle[i % lightnessCycle.length];

				const shiftHue1 = (newHue - hueShiftFactor + 360) % 360;
				const shift = lightnessShiftFactor * (0.5 + (1 - baseColor.l));
				const lightness1 = Math.max(0, baseColor.l + shift / 1.5);
				const lightness2 = Math.min(1, baseColor.l + shift);
				// const lightness1 = Math.min(1, lightness + lightnessShiftFactor / 1.5);
				// const lightness2 = Math.min(1, lightness + lightnessShiftFactor);

				samples.push({
					l: lightness,
					c,
					h: newHue,
					css: `oklch(${lightness} ${c} ${newHue})`,
					cssShift1: `oklch(${lightness1} ${c} ${shiftHue1})`,
					cssShift2: `oklch(${lightness2} ${c} ${shiftHue1})`,
				});
			}
		}
		// Generate N circle samples by varying hue within a limited range around the complementary hue. Adjust lightness up or down every 4th sample to create more contrast similar hues.
		else if (harmony === "Complementary") {
			// const lightnessCycle = [0.85, 0.7, 0.55, 0.4]; // adjust if you want more/less contrast
			const lightnessCycle = generateLightnessSteps(N);
			const hues = [h, (h + 180) % 360];

			for (let i = 0; i < N; i++) {
				const hue = hues[i % 2]; // alternate between base + complementary
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
	}

	function generateLightnessSteps(numSwatches, min = 0.35, max = 0.9) {
		// evenly space lightness values between max and min
		const step = (max - min) / (numSwatches - 1 || 1);
		return Array.from({ length: numSwatches }, (_, i) => max - i * step);
	}

	// Download all circle samples as a single zip
	const downloadSVGs = async () => {
		const zip = new JSZip();

		swatchData.circleSamples.forEach((sample, idx) => {
			// Convert OKLCH to hex for SVG
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
			const svgStart = `<svg
							width="88"
							height="88"
							viewBox="0 0 88 88"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<g clip-path="url(#clip0_4740_1055)">
								<rect width="88" height="88" rx="44" fill="${hex}" />`;
			const svgGradient = `<g filter="url(#filter0_f_4740_1055)">
									<path
										d="M47.3002 58.2996L28.6002 48.3996L15.4002 16.4996V-5.50039L2.2002 -26.4004L24.2002 -15.4004L47.3002 23.0996L63.8002 31.8996L107.8 28.5996V48.3996L77.0002 58.2996H47.3002Z"
										fill="${hexShift1}"
									/>
								</g>
								<g filter="url(#filter1_f_4740_1055)">
									<path
										d="M85.8 -1.05561V28.5124V39.6004L48.8632 28.5124L32.0737 10.0324L22 -6.59961H48.8632L85.8 -1.05561Z"
										fill="${hexShift2}"
									/>
								</g>`;
			const svgEnd = `</g>
							<rect
								x="1.1"
								y="1.1"
								width="85.8"
								height="85.8"
								rx="42.9"
								stroke="url(#paint0_linear_4740_1055)"
								stroke-width="2.2"
								style="mix-blend-mode: overlay"
							/>`;
			const svgDefsGradientFilters = `
								<filter
									id="filter0_f_4740_1055"
									x="-24.1998"
									y="-52.8004"
									width="158.4"
									height="137.5"
									filterUnits="userSpaceOnUse"
									color-interpolation-filters="sRGB"
								>
									<feFlood flood-opacity="0" result="BackgroundImageFix" />
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
									color-interpolation-filters="sRGB"
								>
									<feFlood floodOpacity="0" result="BackgroundImageFix" />
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
								</filter>`;
			var svg;

			if (allData.style === "Gradient") {
				svg =
					svgStart +
					svgGradient +
					svgEnd +
					"<defs>" +
					svgDefsGradientFilters +
					`<linearGradient
									id="paint0_linear_4740_1055"
									x1="44"
									y1="0"
									x2="44"
									y2="88"
									gradientUnits="userSpaceOnUse"
								>
									<stop stop-color="white" stop-opacity="0.7" />
									<stop offset="1" stop-color="#4A5669" />
								</linearGradient>
								<clipPath id="clip0_4740_1055">
									<rect width="88" height="88" rx="44" fill="white" />
								</clipPath></defs></svg>`;
			} else if (allData.style === "Flat") {
				svg =
					svgStart +
					svgEnd +
					`<defs><linearGradient
									id="paint0_linear_4740_1055"
									x1="44"
									y1="0"
									x2="44"
									y2="88"
									gradientUnits="userSpaceOnUse"
								>
									<stop stop-color="white" stop-opacity="0.7" />
									<stop offset="1" stop-color="#4A5669" />
								</linearGradient>
								<clipPath id="clip0_4740_1055">
									<rect width="88" height="88" rx="44" fill="white" />
								</clipPath>
							</defs>
						</svg>`;
			}

			zip.file(`swatch-${idx + 1}.svg`, svg);
		});

		const content = await zip.generateAsync({ type: "blob" });
		saveAs(content, "circleSamples.zip");
	};

	return (
		<div>
			<div className="grid">
				<div>
					<h1>Profile Palette Generator</h1>
					<form onSubmit={(e) => e.preventDefault()}>
						{/* Swatch for input color */}
						<div
							style={{
								width: "100%",
								height: "5.25em",
								borderRadius: "0.5em",
								border: `1px solid ${swatchData.swatchColorDarkTint20}`,
								background: swatchData.swatchColor,
							}}
						></div>
						<div className="form-group text-base">
							{/* Color space selector */}
							<Select
								ref="ref"
								name="colorSpace"
								label="Color Mode"
								options={["Hex", "RGB", "HSL"]}
								value={allData.colorSpace}
								onChange={updateData}
								style={{
									background: `${swatchData.swatchColorDarkTint11}`,
									color: `${swatchData.swatchColorDarkTint}`,
								}}
							></Select>

							<hr />

							{/* Color input */}
							<Input
								name="colorInput"
								label="Base Color"
								type="text"
								placeholder="#9400D3"
								value={allData.colorInput}
								onChange={updateData}
								required
							></Input>

							<hr />

							{/* Number input */}
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
							></Input>
						</div>
						<div className="form-group text-base">
							{/* Harmony selector */}
							<Select
								name="harmony"
								label="Harmony"
								options={[
									"Equidistant",
									"Monochromatic",
									"Analogous",
									"Complementary",
								]}
								value={allData.harmony}
								onChange={updateData}
								style={{
									background: `${swatchData.swatchColorDarkTint11}`,
									color: `${swatchData.swatchColorDarkTint}`,
								}}
							></Select>

							<hr />

							{/* Style selector */}
							<Select
								name="style"
								label="Style"
								options={["Gradient", "Flat"]}
								value={allData.style}
								onChange={updateData}
								style={{
									background: `${swatchData.swatchColorDarkTint11}`,
									color: `${swatchData.swatchColorDarkTint}`,
								}}
							></Select>
						</div>
					</form>

					{swatchData.circleSamples.length > 0 && (
						<button onClick={downloadSVGs} className={"text-base medium"}>
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

				{/* Color samples */}
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
									<title>Default profile background {i + 1}</title>
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
										{allData.style === "Shapes" && (
											<>
												{/* Square */}
												{i % 4 === 0 && (
													<>
														<path
															d="M44.6021 17.5996L67.4652 30.7996V57.1996L44.6021 70.3996L21.7391 57.1996V30.7996L44.6021 17.5996Z"
															fill={`url(#cube_gradient_${i})`}
														/>
														<path
															d="M44.6013 43.6122V70.3978L21.7383 57.1978V30.7979L44.6013 43.6122Z"
															fill={color.cssShift2}
														/>{" "}
														<defs>
															<linearGradient
																id={`cube_gradient_${i}`}
																x1="44.6021"
																y1="17.5996"
																x2="44.6021"
																y2="70.3996"
																gradientUnits="userSpaceOnUse"
															>
																<stop
																	stopColor={color.cssShift2}
																	stopOpacity="1"
																/>
																<stop offset="1" stopColor={color.cssShift1} />
															</linearGradient>
														</defs>
													</>
												)}
												{/* Circle */}
												{i % 4 === 1 && (
													<>
														<path
															d="M68.6002 56.1004C68.6002 62.783 57.7655 68.2004 44.4002 68.2004C31.0349 68.2004 20.2002 62.783 20.2002 56.1004C20.2002 37.3177 20.2002 31.9004 20.2002 31.9004H68.6002C68.6002 31.9004 68.6002 52.575 68.6002 56.1004Z"
															fill={`url(#paint1_linear_4785_5842_${i})`}
														/>
														<ellipse
															cx="44.4002"
															cy="31.8998"
															rx="24.2"
															ry="12.1"
															fill={color.cssShift1}
														/>
														<defs>
															<linearGradient
																id={`paint1_linear_4785_5842_${i}`}
																x1="68.6002"
																y1="50.0504"
																x2="20.2002"
																y2="50.0504"
																gradientUnits="userSpaceOnUse"
															>
																<stop stopColor={color.cssShift1} />
																<stop offset="1" stopColor={color.cssShift2} />
															</linearGradient>
														</defs>
													</>
												)}
												{/* Pentagram */}
												{i % 4 === 2 && (
													<>
														<path
															d="M32.7011 19.7998H56.9025L45.3934 38.0615L49.7934 67.5579H25.5889L21.1934 38.0418L32.7011 19.7998Z"
															fill={color.cssShift2}
														/>
														<path
															d="M56.8998 19.7998L68.4076 38.0418L64.012 67.5579H49.7876L45.392 38.0418L56.8998 19.7998Z"
															fill={color.cssShift1}
														/>
														<path
															d="M45.3934 38.0618L49.7934 67.5581H25.5889L21.1934 38.042L45.3934 38.0618Z"
															fill={color.cssShift2}
														/>
														<path
															d="M45.3934 38.0618L49.7934 67.5581H25.5889L21.1934 38.042L45.3934 38.0618Z"
															fill={`url(#paint1_linear_4785_5854_${i})`}
														/>
														<path
															d="M32.7011 19.7998H56.9025L45.3934 38.0615L21.1934 38.0418L32.7011 19.7998Z"
															fill={`url(#paint2_linear_4785_5854_${i})`}
														/>
														<defs>
															<linearGradient
																id="paint1_linear_4785_5854${i}"
																x1="35.4934"
																y1="38.042"
																x2="35.4934"
																y2="67.5581"
																gradientUnits="userSpaceOnUse"
															>
																<stop stopColor={color.cssShift2} />
																<stop offset="1" stopColor={color.cssShift1} />
															</linearGradient>
															<linearGradient
																id={`paint2_linear_4785_5854_${i}`}
																x1="39.0479"
																y1="19.7998"
																x2="39.0479"
																y2="38.0615"
																gradientUnits="userSpaceOnUse"
															>
																<stop stopColor={color.cssShift2} />
																<stop offset="1" stopColor={color.cssShift1} />
															</linearGradient>
														</defs>
													</>
												)}
												{/* Triangle */}
												{i % 4 === 3 && (
													<>
														<path
															d="M33.2004 15.4004L72.8004 55.0004L64.0004 63.8004L24.4004 24.2004L33.2004 15.4004Z"
															fill={`url(#paint1_linear_4785_5836_${i})`}
														/>
														<path
															d="M24.4004 24.2002L64.0004 63.8002H24.4004V24.2002Z"
															fill={color.cssShift2}
														/>
														<defs>
															<linearGradient
																id={`paint1_linear_4785_5836_${i}`}
																x1="48.6004"
																y1="15.4004"
																x2="48.6004"
																y2="63.8004"
																gradientUnits="userSpaceOnUse"
															>
																<stop stopColor={color.cssShift2} />
																<stop offset="1" stopColor={color.cssShift1} />
															</linearGradient>
														</defs>
													</>
												)}
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
			{error && (
				<div className="error" id="colorInput-error">
					<p className="text-base">{error}</p>
				</div>
			)}
		</div>
	);
}

export default App;
