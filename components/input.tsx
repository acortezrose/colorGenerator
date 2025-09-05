import { forwardRef } from "react";
import { ChangeEventHandler, FocusEventHandler } from "react";

type InputProps = {
	name: string;
	label: string;
	placeholder?: string;
	type: "text" | "number" | "color";
	value: string | number;
	min?: number;
	max?: number;
	error: string | null;
	required?: boolean;
	onChange: ChangeEventHandler<HTMLInputElement>;
	onBlur?: FocusEventHandler<HTMLInputElement>;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
	({ label, value, type, error, ...props }, ref) => {
		const { name, required } = props;

		return (
			<label htmlFor={name} className="input-group">
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
