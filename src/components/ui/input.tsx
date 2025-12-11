import { forwardRef } from "react";
import { ChangeEventHandler, FocusEventHandler } from "react";
import * as React from "react";

type InputProps = {
	name: string;
	label: string;
	placeholder?: string;
	type: "text" | "number" | "color";
	value: string | number;
	min?: number;
	max?: number;
	error?: string | null;
	required?: boolean;
	onChange: ChangeEventHandler<HTMLInputElement>;
	onBlur?: FocusEventHandler<HTMLInputElement>;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
	({ label, value, type, error, ...props }, ref) => {
		const { name, required } = props;

		return (
			<label
				htmlFor={name}
				className="input-group input-group-layout transition-shadow duration-200 ease focus-within:shadow-[0_0_0_2px_rgba(255,255,255,1),0_0_0_4px_rgba(0,0,0,1)]"
			>
				{label}
				<input
					{...props}
					id={name}
					type={type}
					name={name}
					value={value}
					aria-invalid={!!error}
					aria-errormessage={`${name}-error`}
				/>
			</label>
		);
	}
);
