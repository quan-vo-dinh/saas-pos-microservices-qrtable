import { useState } from "react";
import { inputClass } from "../lib/auth-ui";
import { EyeIcon, EyeOffIcon } from "./AuthIcons";

type PasswordFieldProps = {
    id: string;
    name: string;
    label: string;
    autoComplete?: string;
    autoFocus?: boolean;
    errorHtml?: string;
    hasError?: boolean;
    showPasswordLabel?: string;
    hidePasswordLabel?: string;
};

export default function PasswordField(props: PasswordFieldProps) {
    const {
        id,
        name,
        label,
        autoComplete = "new-password",
        autoFocus,
        errorHtml,
        hasError,
        showPasswordLabel = "Hiện mật khẩu",
        hidePasswordLabel = "Ẩn mật khẩu"
    } = props;
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div className="grid gap-1.5">
            <label htmlFor={id} className="text-sm font-medium leading-none">
                {label}
            </label>
            <div className="relative">
                <input
                    id={id}
                    name={name}
                    type={isVisible ? "text" : "password"}
                    autoComplete={autoComplete}
                    autoFocus={autoFocus}
                    aria-invalid={hasError || undefined}
                    className={`${inputClass} pr-9`}
                    placeholder="••••••••"
                />
                <button
                    type="button"
                    onClick={() => setIsVisible(v => !v)}
                    className="absolute right-0 top-0 flex h-full items-center px-3 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                    aria-label={isVisible ? hidePasswordLabel : showPasswordLabel}
                >
                    {isVisible ? <EyeOffIcon /> : <EyeIcon />}
                </button>
            </div>
            {errorHtml && <p className="text-xs text-destructive" dangerouslySetInnerHTML={{ __html: errorHtml }} />}
        </div>
    );
}
