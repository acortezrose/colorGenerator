import * as React from "react";
import { ChevronDownIcon } from "lucide-react";

interface SelectOption {
	value: string;
	label: string;
}

interface SelectProps {
	name: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	options: SelectOption[];
}

export function Select({ name, label, value, onChange, options }: SelectProps) {
	const selectedLabel =
		options.find((option) => option.value === value)?.label ?? value;

	return (
		<div className="input-group input-group-layout relative focus-within:z-10 transition-shadow duration-200 ease focus-within:shadow-[0_0_0_2px_rgba(255,255,255,1),0_0_0_4px_rgba(0,0,0,1)]">
			<label htmlFor={name}>{label}</label>
			<span className="plex-mono-normal flex items-center gap-1.5">
				{selectedLabel}
				<ChevronDownIcon className="size-3.5 opacity-60" />
			</span>
			{/* The native select is stretched invisibly over the whole row, so
			clicking anywhere in it opens the menu. */}
			<select
				id={name}
				name={name}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none"
			>
				{options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
		</div>
	);
}
