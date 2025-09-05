import { forwardRef } from "react";
import { ChangeEventHandler, FocusEventHandler, useRef } from "react";

type SelectProps = {
	name: string;
	label: string;
	value: string | number;
	required?: boolean;
	options: [];
	onChange: ChangeEventHandler<HTMLSelectElement>;
	onBlur?: FocusEventHandler<HTMLSelectElement>;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
	({ label, value, ...props }, ref) => {
		const { name, required } = props;

		return (
			<div className="input-group">
				<label htmlFor={name}>{label}</label>
				<select
					{...props}
					id={name}
					name={name}
					value={value}
					className="text-sm medium"
				>
					{props.options.map((option) => (
						<option key={option} value={option}>
							{option}
						</option>
					))}
				</select>
			</div>
		);
	}
);
