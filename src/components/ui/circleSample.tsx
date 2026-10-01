import { AnimatePresence, motion } from "framer-motion";
import * as React from "react";
import { useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import { GRADIENT_STYLE_GEOMETRY } from "@/generated/gradientArchetypes.js";

interface CircleSampleFormProps {
	style: string;
	color: any;
	i: number;
}

// Memoized on (style, color, i) rather than the whole allData object: allData
// changes on every keystroke/slider drag, most of which are
// irrelevant to this swatch's own SVG (colorSpace, numberInput, hueShift,
// etc.). Without this, each of those unrelated updates forces React to
// re-render and diff every visible swatch's full filtered-SVG subtree for
// nothing — that reconciliation cost is real for a live SVG (unlike a single
// <img> leaf).
export const CircleSample = React.memo(function CircleSample({
	style,
	color,
	i,
}: CircleSampleFormProps) {
	const gradientGeometry = GRADIENT_STYLE_GEOMETRY[style];
	// https://stackoverflow.com/questions/39501289/in-reactjs-how-to-copy-text-to-clipboard
	const textAreaRef = useRef(null);
	const copyString = "Copied!";
	// const splitCopy = copyString.split("");
	const message = <span className="relative">{copyString}</span>;
	const [hasMessage, setHasMessage] = useState(false);

	function sampleKeyDown(e) {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			copyToClipboard(e);
		}
	}

	async function copyToClipboard(e) {
		try {
			const html = new XMLSerializer().serializeToString(textAreaRef.current);
			navigator.clipboard.writeText(html);
			e.target.focus();
			setHasMessage(true);
			setTimeout(() => {
				setHasMessage(false);
			}, 2500);
		} catch (err) {
			{
				toast(err.message);
			}
		}
	}

	return (
		<>
			<motion.div
				key={i}
				className="relative rounded-[24px] overflow-hidden sample will-change-transform cursor-pointer focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgb(255,255,255),0_0_0_4px_rgb(0,0,0)]"
				role="button"
				tabIndex={0}
				onClick={copyToClipboard}
				onKeyDown={sampleKeyDown}
				aria-label={`Copy SVG ${i + 1}`}
				aria-live="assertive"
				whileHover={{ scale: 1.05 }}
				whileTap={{ scale: 0.98 }}
				transition={{ type: "spring", stiffness: 500, damping: 25 }}
			>
				<AnimatePresence>
					{hasMessage && (
						<div
							key={i + "-message"}
							id="message"
							className="absolute inset-0 flex items-center justify-center top-0 left-0 text-white z-10 transition ease duration-150 text-sm font-medium"
						>
							<motion.div
								className="bg-black/40 rounded py-0.5 px-1.5"
								transition={{
									type: "spring",
									stiffness: 200,
									damping: 20,
								}}
								initial={{ opacity: 0, filter: "blur(6px)", scale: 0.98 }}
								animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
								exit={{ opacity: 0, filter: "blur(8px)", scale: 0.7 }}
							>
								<p className="relative">{message}</p>
							</motion.div>
						</div>
					)}
				</AnimatePresence>

				<div className="relative w-full h-full">
					<div className="z-1 absolute w-full h-full rounded-[24px] shadow-[inset_0_0_0_1px_rgba(0,0,0,.08)]"></div>

					<svg
						ref={textAreaRef}
						width="88"
						height="88"
						viewBox="0 0 88 88"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
						className="w-full h-full"
					>
						<title>Avatar {i + 1}</title>
						<g clipPath="url(#clip0_4740_1055) ">
							<rect width="88" height="88" fill={color.css} />
							{gradientGeometry &&
								gradientGeometry.groups.map((group) => (
									// mask and filter deliberately live on the same <g> (not
									// nested in separate wrapper groups) — Safari has a known
									// bug where feGaussianBlur silently fails to apply to an
									// element nested inside a masked group.
									<g
										key={group.filterId}
										filter={`url(#${group.filterId})`}
										mask={group.maskId ? `url(#${group.maskId})` : undefined}
									>
										{group.shapes.map((shape) =>
											shape.type === "rect" ? (
												<rect
													key={shape.colorKey}
													x={shape.x}
													y={shape.y}
													width={shape.width}
													height={shape.height}
													rx={shape.rx || undefined}
													fill={color[shape.colorKey]}
													transform={
														shape.rotate
															? `rotate(${shape.rotate.angle} ${shape.rotate.pivotX} ${shape.rotate.pivotY})`
															: undefined
													}
												/>
											) : (
												<path
													key={shape.colorKey}
													d={shape.d}
													fill={color[shape.colorKey]}
												/>
											)
										)}
									</g>
								))}
						</g>
						<defs>
							{gradientGeometry &&
								gradientGeometry.masks.map((m) => (
									<mask
										key={m.id}
										id={m.id}
										style={{ maskType: m.maskType }}
										maskUnits="userSpaceOnUse"
										x={m.x}
										y={m.y}
										width={m.width}
										height={m.height}
									>
										{m.shape === "rect" ? (
											<rect
												width={m.rectWidth}
												height={m.rectHeight}
												rx={m.rectRx}
												fill="white"
												transform={`matrix(${m.matrix.join(" ")})`}
											/>
										) : (
											<ellipse
												cx={m.cx}
												cy={m.cy}
												rx={m.rx}
												ry={m.ry}
												fill="white"
												transform={
													m.rotate
														? `rotate(${m.rotate.angle} ${m.rotate.pivotX} ${m.rotate.pivotY})`
														: undefined
												}
											/>
										)}
									</mask>
								))}
							{gradientGeometry &&
								gradientGeometry.filters.map((f) =>
									f.type === "innerShadow" ? (
										<filter
											key={f.id}
											id={f.id}
											x={f.x}
											y={f.y}
											width={f.width}
											height={f.height}
											filterUnits="userSpaceOnUse"
											colorInterpolationFilters="sRGB"
										>
											<feFlood floodOpacity="0" result="BackgroundImageFix" />
											<feBlend
												mode="normal"
												in="SourceGraphic"
												in2="BackgroundImageFix"
												result="shape"
											/>
											<feColorMatrix
												in="SourceAlpha"
												type="matrix"
												values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
												result="hardAlpha"
											/>
											<feOffset dx={f.dx} dy={f.dy} />
											<feGaussianBlur stdDeviation={f.stdDeviation} />
											<feComposite
												in2="hardAlpha"
												operator="arithmetic"
												k2="-1"
												k3="1"
											/>
											<feColorMatrix type="matrix" values={f.colorMatrix} />
											<feBlend
												mode="normal"
												in2="shape"
												result={`effect1_innerShadow_${f.id}`}
											/>
										</filter>
									) : (
										<filter
											key={f.id}
											id={f.id}
											x={f.x}
											y={f.y}
											width={f.width}
											height={f.height}
											filterUnits="userSpaceOnUse"
											colorInterpolationFilters="sRGB"
										>
											<feFlood floodOpacity="0" result="BackgroundImageFix" />
											<feBlend
												mode="normal"
												in="SourceGraphic"
												in2="BackgroundImageFix"
												result="shape"
											/>
											<feGaussianBlur
												stdDeviation={f.stdDeviation}
												result={`effect1_foregroundBlur_${f.id}`}
											/>
										</filter>
									)
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
								<rect width="88" height="88" fill="white" />
							</clipPath>
						</defs>
					</svg>
				</div>
			</motion.div>
		</>
	);
});
