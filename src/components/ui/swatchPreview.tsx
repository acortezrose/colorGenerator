import * as React from "react";

interface SwatchPreviewProps {
	color: string;
	className?: string;
}

export function SwatchPreview({ color, className }: SwatchPreviewProps) {
	return (
		<div
			className={className}
			style={{
				width: "100%",
				height: "5.25em",
				borderRadius: "0.5em",
				border: "1px solid rgba(0,0,0,.1)",
				background: color,
				flexShrink: 0,
			}}
		/>
	);
}
