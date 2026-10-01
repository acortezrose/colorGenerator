import { motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Disclosure } from "@/components/ui/disclosure";
import { SwatchPreview } from "@/components/ui/swatchPreview";
import { convertColor, convertFromOklch } from "@/utils/colors.jsx";
import {
	GRADIENT_STYLE_GEOMETRY,
	GRADIENT_STYLE_LABELS,
	GRADIENT_STYLE_NAMES,
	GRADIENT_STYLE_PRESETS,
} from "@/generated/gradientArchetypes.js";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import * as culori from "culori";
import * as React from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

interface CircleSampleFormProps {
	allData: any;
	setAllData: any;
	swatchData: any;
}

const SHIFT_KEYS = [
	"hueShift",
	"chromaShift",
	"lightnessShift",
	"harmonySpread",
] as const;
const DEFAULT_SHIFTS = {
	hueShift: 46,
	chromaShift: 1,
	lightnessShift: 0.7,
	harmonySpread: 1,
};

// Small label above a section, styled to match the Advanced toggles. Pulled
// down so it reads as part of the section below it.
function SectionHeading({ children }: { children: React.ReactNode }) {
	return (
		<h2
			className="text-sm px-1 py-1 text-neutral-600 -mb-5"
			// Inline so it beats the global serif h2 rule in App.css.
			style={{ fontFamily: "inherit", fontWeight: 400 }}
		>
			{children}
		</h2>
	);
}

// Sizes the title so its text spans the full width of its container.
function FitHeading({ children }: { children: React.ReactNode }) {
	const ref = useRef<HTMLHeadingElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		const el = ref.current;
		const container = containerRef.current;
		if (!el || !container) return;
		const fit = () => {
			el.style.fontSize = "100px";
			const textWidth = el.scrollWidth;
			if (textWidth) {
				el.style.fontSize = `${(100 * container.clientWidth) / textWidth}px`;
			}
		};
		fit();
		// Refit once Big Shoulders loads, since the fallback font's width differs.
		document.fonts?.load('900 100px "Big Shoulders"').then(fit);
		const observer = new ResizeObserver(fit);
		observer.observe(container);
		return () => observer.disconnect();
	}, []);

	// contain: inline-size keeps the heading's (large, unwrapped) width from
	// feeding back into the layout, so the column can still shrink on narrow
	// screens and the heading refits to whatever space is left.
	return (
		<div ref={containerRef} style={{ contain: "inline-size" }}>
			<h1 ref={ref} className="inline-block">
				{children}
			</h1>
		</div>
	);
}

export function CircleSampleForm({
	allData,
	setAllData,
	swatchData,
}: CircleSampleFormProps) {
	// The base color as OKLCH, held locally so the sliders stay smooth while
	// dragging instead of snapping to whatever survives the round trip through
	// hex/rgb/hsl. Re-synced only when the text input changes from elsewhere.
	const toBaseLch = (color, space) => {
		const parsed = convertColor(color, space);
		return parsed
			? { l: parsed.l, c: parsed.c, h: parsed.h ?? 0 }
			: { l: 0.5, c: 0, h: 0 };
	};
	const [baseLch, setBaseLch] = useState(() =>
		toBaseLch(allData.colorInput, allData.colorSpace),
	);
	const lastEmittedInput = useRef(allData.colorInput);

	useEffect(() => {
		if (allData.colorInput === lastEmittedInput.current) return;
		lastEmittedInput.current = allData.colorInput;
		if (convertColor(allData.colorInput, allData.colorSpace)) {
			setBaseLch(toBaseLch(allData.colorInput, allData.colorSpace));
		}
	}, [allData.colorInput, allData.colorSpace]);

	const updateBaseLch = (key: "l" | "c" | "h") => (value: number) => {
		const next = { ...baseLch, [key]: value };
		setBaseLch(next);
		const inGamut = culori.clampChroma({ mode: "oklch", ...next }, "oklch");
		const colorInput = convertFromOklch(inGamut, allData.colorSpace);
		lastEmittedInput.current = colorInput;
		setAllData((prev) => ({ ...prev, colorInput }));
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

	const updateData = (event) => {
		setAllData((prev) => ({
			...prev,
			[event.target.name]: event.target.value,
		}));
	};

	const updateGradientControl = (name: string) => (value: number) => {
		setAllData((prev) => ({ ...prev, [name]: value }));
	};

	// Reset goes back to the current style's preset, not the app defaults.
	const baseShifts = {
		...DEFAULT_SHIFTS,
		...GRADIENT_STYLE_PRESETS[allData.style],
	};
	// Equidistant already covers the full wheel, so it can only narrow.
	const harmonySpreadMax = allData.harmony === "Equidistant" ? 1 : 2;
	// With no style, only Harmony Shift is on screen, so only it resets.
	const visibleShiftKeys =
		allData.style === "None" ? (["harmonySpread"] as const) : SHIFT_KEYS;
	const isShiftModified = visibleShiftKeys.some(
		(key) => allData[key] !== baseShifts[key],
	);
	const resetShifts = () => {
		setAllData((prev) => ({
			...prev,
			...Object.fromEntries(
				visibleShiftKeys.map((key) => [key, baseShifts[key]]),
			),
		}));
	};

	const updateStyle = (style) => {
		const preset = GRADIENT_STYLE_PRESETS[style];
		setAllData((prev) => ({ ...prev, style, ...(preset || {}) }));
	};

	const buildGradientMarkup = (styleName, sample) => {
		const geometry = GRADIENT_STYLE_GEOMETRY[styleName];
		if (!geometry) return { shapes: "", defs: "" };
		// mask and filter deliberately live on the same <g> (not nested wrapper
		// groups) — Safari has a known bug where feGaussianBlur silently fails
		// to apply to an element nested inside a masked group.
		const shapes = geometry.groups
			.map((group) => {
				const paths = group.shapes
					.map((shape) => {
						const hex = culori.formatHex(culori.parse(sample[shape.colorKey]));
						if (shape.type === "rect") {
							const transformAttr = shape.rotate
								? ` transform="rotate(${shape.rotate.angle} ${shape.rotate.pivotX} ${shape.rotate.pivotY})"`
								: "";
							return `<rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" rx="${shape.rx}" fill="${hex}"${transformAttr} />`;
						}
						return `<path d="${shape.d}" fill="${hex}" />`;
					})
					.join("");
				const maskAttr = group.maskId ? ` mask="url(#${group.maskId})"` : "";
				return `<g filter="url(#${group.filterId})"${maskAttr}>${paths}</g>`;
			})
			.join("");
		const maskDefs = geometry.masks
			.map((m) => {
				const shapeMarkup =
					m.shape === "rect"
						? `<rect width="${m.rectWidth}" height="${m.rectHeight}" rx="${m.rectRx}" fill="white" transform="matrix(${m.matrix.join(" ")})" />`
						: `<ellipse cx="${m.cx}" cy="${m.cy}" rx="${m.rx}" ry="${m.ry}" fill="white"${
								m.rotate
									? ` transform="rotate(${m.rotate.angle} ${m.rotate.pivotX} ${m.rotate.pivotY})"`
									: ""
							} />`;
				return `<mask id="${m.id}" style="mask-type:${m.maskType}" maskUnits="userSpaceOnUse" x="${m.x}" y="${m.y}" width="${m.width}" height="${m.height}">${shapeMarkup}</mask>`;
			})
			.join("");
		const filterDefs = geometry.filters
			.map((f: any) => {
				if (f.type === "innerShadow") {
					return `<filter id="${f.id}" x="${f.x}" y="${f.y}" width="${f.width}" height="${f.height}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" /><feOffset dx="${f.dx}" dy="${f.dy}" /><feGaussianBlur stdDeviation="${f.stdDeviation}" /><feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" /><feColorMatrix type="matrix" values="${f.colorMatrix}" /><feBlend mode="normal" in2="SourceGraphic" result="effect1_innerShadow_${f.id}" /></filter>`;
				}
				return `<filter id="${f.id}" x="${f.x}" y="${f.y}" width="${f.width}" height="${f.height}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="${f.stdDeviation}" result="effect1_foregroundBlur_${f.id}" /></filter>`;
			})
			.join("");
		return { shapes, defs: maskDefs + filterDefs };
	};

	const downloadSVGs = async () => {
		const zip = new JSZip();
		swatchData.circleSamples.forEach((sample, idx) => {
			const hex = culori.formatHex({
				mode: "oklch",
				l: sample.l,
				c: sample.c,
				h: sample.h,
			});
			const { shapes, defs } =
				allData.style !== "None"
					? buildGradientMarkup(allData.style, sample)
					: { shapes: "", defs: "" };
			const svg = `<svg width="88" height="88" viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_4740_1055)"><rect width="88" height="88" fill="${hex}" />${shapes}</g><defs>${defs}<linearGradient id="paint0_linear_4740_1055" x1="44" y1="0" x2="44" y2="88" gradientUnits="userSpaceOnUse"><stop stop-color="white" stop-opacity="0.7" /><stop offset="1" stop-color="#4A5669" /></linearGradient><clipPath id="clip0_4740_1055"><rect width="88" height="88" fill="white" /></clipPath></defs></svg>`;
			zip.file(`swatch-${idx + 1}.svg`, svg);
		});
		const content = await zip.generateAsync({ type: "blob" });
		saveAs(content, "circleSamples.zip");
	};

	return (
		<>
			{/* TODO: rename? */}
			<div>
				<FitHeading>okavatar</FitHeading>
				<p className="text-base mt-1">
					By{" "}
					<a
						target="_blank"
						href="https://www.alexandracortez.com/"
						className="text-black border border-0 border-b-1 border-dotted border-neutral-400 hover:border-black focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgb(255,255,255),0_0_0_4px_rgb(0,0,0)] rounded transition-shadow ease"
					>
						Alexandra Cortez
					</a>
				</p>
			</div>
			<SwatchPreview color={swatchData.swatchColor} />
			<SectionHeading>Color</SectionHeading>
			<div className="form-group text-base">
				<Select
					name="colorSpace"
					label="Color Mode"
					value={allData.colorSpace}
					onChange={handleColorSpaceChange}
					options={[
						{ value: "Hex", label: "Hex" },
						{ value: "RGB", label: "RGB" },
						{ value: "HSL", label: "HSL" },
					]}
				/>
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
			</div>
			{/* Pulled up so the toggle reads as part of the section above it. */}
			<Disclosure
				label="Advanced"
				ariaLabel="Advanced color settings"
				className="-mt-5"
			>
				<div className="flex flex-col gap-2">
					<Slider
						name="baseLightness"
						label="Lightness"
						min={0}
						max={1}
						step={0.01}
						value={Number(baseLch.l.toFixed(2))}
						onValueChange={updateBaseLch("l")}
						fillColor={swatchData.swatchColorDarkTint20}
						labelColor={swatchData.swatchColorDarkTint}
					/>
					<Slider
						name="baseChroma"
						label="Chroma"
						min={0}
						max={0.37}
						step={0.005}
						value={Number(baseLch.c.toFixed(3))}
						onValueChange={updateBaseLch("c")}
						fillColor={swatchData.swatchColorDarkTint20}
						labelColor={swatchData.swatchColorDarkTint}
					/>
					<Slider
						name="baseHue"
						label="Hue"
						min={0}
						max={360}
						step={1}
						value={Math.round(baseLch.h)}
						onValueChange={updateBaseLch("h")}
						fillColor={swatchData.swatchColorDarkTint20}
						labelColor={swatchData.swatchColorDarkTint}
					/>
				</div>
			</Disclosure>
			<SectionHeading>Style</SectionHeading>
			<div className="form-group text-base">
				<Input
					name="numberInput"
					label="Number"
					type="number"
					placeholder="1 – 52"
					min={1}
					max={52}
					value={allData.numberInput}
					onChange={updateData}
					required
				/>
				<hr />
				<Select
					name="harmony"
					label="Harmony"
					value={allData.harmony}
					onChange={(val) =>
						setAllData((prev: any) => ({ ...prev, harmony: val }))
					}
					options={[
						{ value: "Equidistant", label: "Equidistant" },
						{ value: "Monochromatic", label: "Monochromatic" },
						{ value: "Analogous", label: "Analogous" },
						{ value: "Complementary", label: "Complementary" },
					]}
				/>
				<hr />
				<Select
					name="style"
					label="Style"
					value={allData.style}
					onChange={updateStyle}
					options={[
						{ value: "None", label: "None" },
						...GRADIENT_STYLE_NAMES.map((name) => ({
							value: name,
							label: (GRADIENT_STYLE_LABELS as Record<string, string>)[name],
						})),
					]}
				/>
			</div>
			<Disclosure
				label="Advanced"
				ariaLabel="Advanced style settings"
				defaultOpen
				className="-mt-5"
			>
				<div className="flex flex-col gap-2">
					{allData.style !== "None" && (
						<>
							<Slider
								name="hueShift"
								label="Hue Shift"
								min={-180}
								max={180}
								step={1}
								value={allData.hueShift}
								onValueChange={updateGradientControl("hueShift")}
								fillColor={swatchData.swatchColorDarkTint20}
								labelColor={swatchData.swatchColorDarkTint}
							/>
							<Slider
								name="chromaShift"
								label="Chroma Shift"
								min={-1}
								max={2}
								step={0.05}
								value={allData.chromaShift}
								onValueChange={updateGradientControl("chromaShift")}
								fillColor={swatchData.swatchColorDarkTint20}
								labelColor={swatchData.swatchColorDarkTint}
							/>
							<Slider
								name="lightnessShift"
								label="Lightness Shift"
								min={-0.5}
								max={1.5}
								step={0.01}
								value={allData.lightnessShift}
								onValueChange={updateGradientControl("lightnessShift")}
								fillColor={swatchData.swatchColorDarkTint20}
								labelColor={swatchData.swatchColorDarkTint}
							/>
						</>
					)}
					<Slider
						name="harmonySpread"
						label="Harmony Shift"
						min={0}
						max={harmonySpreadMax}
						step={0.01}
						value={Math.min(allData.harmonySpread, harmonySpreadMax)}
						onValueChange={updateGradientControl("harmonySpread")}
						fillColor={swatchData.swatchColorDarkTint20}
						labelColor={swatchData.swatchColorDarkTint}
					/>
					<button
						type="button"
						onClick={resetShifts}
						disabled={!isShiftModified}
						className="self-end flex items-center gap-1.5 text-sm px-2 py-1 rounded-md text-neutral-600 cursor-pointer transition ease duration-150 hover:bg-black/5 hover:text-black disabled:opacity-40 disabled:cursor-default disabled:hover:bg-transparent focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgb(255,255,255),0_0_0_4px_rgb(0,0,0)]"
					>
						<RotateCcw size={12} strokeWidth={2.25} />
						Reset shifts
					</button>
				</div>
			</Disclosure>
			{swatchData.circleSamples.length > 0 && (
				<motion.button
					onClick={downloadSVGs}
					className="will-change-transform rounded-[15px] text-base medium w-full button cursor-pointer"
					whileHover={{ scale: 1.04 }}
					whileTap={{ scale: 0.98 }}
					transition={{ type: "spring", stiffness: 500, damping: 25 }}
				>
					<div
						className="p-px bg-blue-500 rounded-[15px]"
						style={{
							background: "#ffffff",
							backgroundImage: `linear-gradient(to top, ${swatchData.swatchColorDarkTint40}, ${swatchData.swatchColorDarkTint90}, ${swatchData.swatchColorDarkTint90}, ${swatchData.swatchColorDarkTint40}`,
						}}
					>
						<span
							className="rounded-xl"
							style={{
								// borderTop: "1px solid rgba(255,255,255,.8)",
								// borderBottom: "2px solid rgba(0,0,0,.2)",
								// background: swatchData.swatchColorDarkTint,
								background: `radial-gradient(ellipse at top, ${swatchData.swatchColorDarkTint90} 0%, ${swatchData.swatchColorDarkTint} 100%`,
								//outline: `2px solid ${swatchData.swatchColorDarkTint20}`,
								boxShadow: `0px 2px 3px ${swatchData.swatchColorDarkTint12}, 0px 4px 8px ${swatchData.swatchColorDarkTint11}, 0px 13px 8px ${swatchData.swatchColorDarkTint07}, 0px 24px 9px ${swatchData.swatchColorDarkTint03}, inset 0 3px 4px 0 rgba(255,255,255,.3)`,
							}}
						>
							Download SVGs
						</span>
					</div>
				</motion.button>
			)}
		</>
	);
}
