import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { convertColor, convertFromOklch } from "@/utils/colors.jsx";
import * as JSZip from "jszip";
import { saveAs } from "file-saver";
import * as culori from "culori";
import * as React from "react";

interface CircleSampleFormProps {
	allData: any;
	setAllData: any;
	swatchData: any;
}

export function CircleSampleForm({
	allData,
	setAllData,
	swatchData,
}: CircleSampleFormProps) {
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
		<>
			{/* TODO: rename? */}
			<div>
				<h1>Okavatar</h1>
				<p className="text-base mt-1">
					By{" "}
					<a
						target="_blank"
						href="https://www.alexandracortez.com/"
						className="text-black border border-0 border-b-1 border-dotted border-neutral-400 hover:border-black"
					>
						Alexandra Cortez
					</a>
				</p>
			</div>
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
							className="select focus-visible:ring-[${swatchData.swatchColorDarkTint03}]"
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
							className="select focus-visible:ring-[${swatchData.swatchColorDarkTint03}]"
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
							className="select focus-visible:ring-[${swatchData.swatchColorDarkTint03}]"
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
					className="will-change-transform rounded-[15px] text-base medium w-full button cursor-pointer hover:scale-[1.03] active:scale-[0.98] transition"
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
				</button>
			)}
		</>
	);
}
