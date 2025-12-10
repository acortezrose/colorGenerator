import { motion } from "framer-motion";
import * as React from "react";

interface CircleSampleFormProps {
	allData: any;
	color: any;
	i: number;
}

export function CircleSample({ allData, color, i }: CircleSampleFormProps) {
	return (
		<>
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
									<feFlood floodOpacity="0" result="BackgroundImageFix" />
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
		</>
	);
}
