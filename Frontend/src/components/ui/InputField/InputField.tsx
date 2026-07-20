import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import "./InputField.css";

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: ReactNode;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  onClickIconRight?: () => void;
}

const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, error, hint, iconLeft, iconRight, onClickIconRight, className = "", id, ...props }, ref) => {
    return (
      <div className={`sf-field ${error ? "sf-field--error" : ""} ${className}`}>
        {label && (
          <div className="sf-field__label-row">
            <label htmlFor={id} className="sf-field__label">
              {label}
            </label>
            {hint && <span className="sf-field__hint">{hint}</span>}
          </div>
        )}
        <div className="sf-field__wrapper">
          {iconLeft && <span className="sf-field__icon sf-field__icon--left">{iconLeft}</span>}
          <input
            ref={ref}
            id={id}
            className={`sf-field__input ${iconLeft ? "sf-field__input--pl" : ""} ${iconRight ? "sf-field__input--pr" : ""}`}
            {...props}
          />
          {iconRight && (
            <button
              type="button"
              className="sf-field__icon sf-field__icon--right sf-field__icon--btn"
              onClick={onClickIconRight}
              tabIndex={-1}
            >
              {iconRight}
            </button>
          )}
        </div>
        {error && <p className="sf-field__error">{error}</p>}
      </div>
    );
  }
);

InputField.displayName = "InputField";
export default InputField;
