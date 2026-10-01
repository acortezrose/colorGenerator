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
				boxShadow: "var(--surface-shadow)",
				background: color,
				flexShrink: 0,
			}}
		/>
	);
}
