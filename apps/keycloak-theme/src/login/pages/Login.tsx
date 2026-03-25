import { useState } from "react";
import type { KcContext } from "../KcContext";
import type { I18n } from "../i18n";
import loginBg from "../assets/login-bg.png";

type LoginContext = Extract<KcContext, { pageId: "login.ftl" }>;

/* ── Icons ── */

function QRTableLogo({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            className={className ?? "size-6"}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect width="5" height="5" x="3" y="3" rx="1" />
            <rect width="5" height="5" x="16" y="3" rx="1" />
            <rect width="5" height="5" x="3" y="16" rx="1" />
            <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
            <path d="M21 21v.01" />
            <path d="M12 7v3a2 2 0 0 1-2 2H7" />
            <path d="M3 12h.01" />
            <path d="M12 3h.01" />
            <path d="M12 16v.01" />
            <path d="M16 12h1" />
            <path d="M21 12v.01" />
            <path d="M12 21v-1" />
        </svg>
    );
}

function EyeIcon() {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

function EyeOffIcon() {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
            <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
            <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
            <path d="m2 2 20 20" />
        </svg>
    );
}

function LogInIcon() {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" x2="3" y1="12" y2="12" />
        </svg>
    );
}

function GoogleIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
            />
            <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
            />
            <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
            />
            <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
            />
        </svg>
    );
}

function FacebookIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path
                d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                fill="#1877F2"
            />
        </svg>
    );
}

/* ── Feature items for right brand panel ── */

function ShieldIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
        </svg>
    );
}

function UsersIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    );
}

function LayoutDashboardIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect width="7" height="9" x="3" y="3" rx="1" />
            <rect width="7" height="5" x="14" y="3" rx="1" />
            <rect width="7" height="9" x="14" y="12" rx="1" />
            <rect width="7" height="5" x="3" y="16" rx="1" />
        </svg>
    );
}

function QrCodeIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect width="5" height="5" x="3" y="3" rx="1" />
            <rect width="5" height="5" x="16" y="3" rx="1" />
            <rect width="5" height="5" x="3" y="16" rx="1" />
            <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
            <path d="M21 21v.01" />
            <path d="M12 7v3a2 2 0 0 1-2 2H7" />
        </svg>
    );
}

/* ── Utility classes ── */

const inputClass = [
    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors",
    "placeholder:text-muted-foreground",
    "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
    "aria-invalid:border-destructive aria-invalid:ring-destructive/20"
].join(" ");

const buttonPrimaryClass = [
    "mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md",
    "bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs",
    "transition-colors hover:bg-primary/90",
    "disabled:pointer-events-none disabled:opacity-50"
].join(" ");

const buttonOutlineClass = [
    "inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-input",
    "bg-background px-4 py-2 text-sm font-medium shadow-xs transition-colors",
    "hover:bg-accent hover:text-accent-foreground"
].join(" ");

const features = [
    {
        icon: <QrCodeIcon />,
        title: "QR-based Ordering",
        desc: "Guests scan, order, and pay — no app required."
    },
    {
        icon: <LayoutDashboardIcon />,
        title: "Real-time Dashboard",
        desc: "Live KDS, POS, and table management in one view."
    },
    {
        icon: <UsersIcon />,
        title: "Role-based Access",
        desc: "Admin, owner, manager, waiter — each routed correctly."
    },
    {
        icon: <ShieldIcon />,
        title: "Keycloak SSO",
        desc: "Secure, tenant-aware single sign-on powered by Keycloak."
    }
];

/* ── Main Component ── */

export default function Login(props: { kcContext: LoginContext; i18n: I18n }) {
    const { kcContext } = props;
    const { url, realm, login, messagesPerField, social, message } = kcContext;
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const hasUsernameError = messagesPerField.existsError("username");
    const hasPasswordError = messagesPerField.existsError("password");

    return (
        <div className="relative grid min-h-screen lg:grid-cols-2">
            {/* ── LEFT: Background Image ── */}
            <div className="relative hidden overflow-hidden lg:block">
                <img src={loginBg} alt="" className="absolute inset-0 size-full object-cover object-center select-none" />
                {/* Overlay gradient for readability */}
                <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent" />

                {/* Brand watermark on image */}
                <div className="absolute bottom-10 left-10 flex items-center gap-3 text-white">
                    <QRTableLogo className="size-8 text-white" />
                    <span className="text-2xl font-bold tracking-tight">QRTable</span>
                </div>
            </div>

            {/* ── RIGHT: Form + Brand Description ── */}
            <div className="flex flex-col justify-center px-6 py-12 lg:px-12">
                <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
                    {/* Logo + brand (mobile only, hidden on lg) */}
                    <div className="flex items-center justify-center gap-2 lg:hidden">
                        <QRTableLogo />
                        <span className="text-xl font-semibold">QRTable</span>
                    </div>

                    {/* Heading */}
                    <div className="flex flex-col gap-1">
                        <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
                        <p className="text-sm text-muted-foreground">Enter your credentials to access your workspace</p>
                    </div>

                    {/* Global message */}
                    {message && (
                        <div
                            className={[
                                "rounded-md border px-4 py-3 text-sm",
                                message.type === "error" && "border-destructive/50 bg-destructive/10 text-destructive",
                                message.type === "warning" && "border-yellow-500/50 bg-yellow-50 text-yellow-700",
                                message.type === "success" && "border-green-500/50 bg-green-50 text-green-700",
                                message.type === "info" && "border-border bg-muted text-muted-foreground"
                            ]
                                .filter(Boolean)
                                .join(" ")}
                        >
                            <span dangerouslySetInnerHTML={{ __html: message.summary }} />
                        </div>
                    )}

                    {/* ── Social logins: Google + Facebook ── */}
                    <div className="grid grid-cols-2 gap-2">
                        <button type="button" className={buttonOutlineClass} disabled>
                            <GoogleIcon />
                            Google
                        </button>
                        <button type="button" className={buttonOutlineClass} disabled>
                            <FacebookIcon />
                            Facebook
                        </button>
                    </div>

                    {/* Keycloak social providers (if configured) */}
                    {social?.providers && social.providers.length > 0 && (
                        <div className={`grid gap-2 ${social.providers.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                            {social.providers.map(provider => (
                                <a key={provider.alias} href={provider.loginUrl} className={buttonOutlineClass}>
                                    {provider.displayName}
                                </a>
                            ))}
                        </div>
                    )}

                    {/* Divider */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
                        </div>
                    </div>

                    {/* ── Login Form ── */}
                    <form action={url.loginAction} method="post" className="grid gap-3">
                        {/* Username */}
                        <div className="grid gap-1.5">
                            <label htmlFor="username" className="text-sm font-medium leading-none">
                                Email
                            </label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                defaultValue={login.username ?? ""}
                                autoComplete="username"
                                autoFocus
                                aria-invalid={hasUsernameError || undefined}
                                className={inputClass}
                                placeholder="name@example.com"
                            />
                            {hasUsernameError && (
                                <p className="text-xs text-destructive" dangerouslySetInnerHTML={{ __html: messagesPerField.get("username") }} />
                            )}
                        </div>

                        {/* Password */}
                        <div className="relative grid gap-1.5">
                            <div className="flex items-center justify-between">
                                <label htmlFor="password" className="text-sm font-medium leading-none">
                                    Password
                                </label>
                                {realm.resetPasswordAllowed && (
                                    <a href={url.loginResetCredentialsUrl} className="text-sm font-medium text-muted-foreground hover:opacity-75">
                                        Forgot password?
                                    </a>
                                )}
                            </div>
                            <div className="relative">
                                <input
                                    id="password"
                                    name="password"
                                    type={isPasswordVisible ? "text" : "password"}
                                    autoComplete="current-password"
                                    aria-invalid={hasPasswordError || undefined}
                                    className={`${inputClass} pr-9`}
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setIsPasswordVisible(v => !v)}
                                    className="absolute right-0 top-0 flex h-full items-center px-3 text-muted-foreground hover:text-foreground"
                                    tabIndex={-1}
                                    aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                                >
                                    {isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
                                </button>
                            </div>
                            {hasPasswordError && (
                                <p className="text-xs text-destructive" dangerouslySetInnerHTML={{ __html: messagesPerField.get("password") }} />
                            )}
                        </div>

                        {/* Remember me */}
                        {realm.rememberMe && (
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    name="rememberMe"
                                    id="rememberMe"
                                    defaultChecked={login.rememberMe === "on"}
                                    className="size-4 rounded border border-input accent-primary"
                                />
                                <label htmlFor="rememberMe" className="text-sm leading-none text-muted-foreground">
                                    Remember me
                                </label>
                            </div>
                        )}

                        <button type="submit" name="login" className={buttonPrimaryClass}>
                            <LogInIcon />
                            Sign in
                        </button>
                    </form>

                    {/* Registration link */}
                    {realm.registrationAllowed && (
                        <p className="text-center text-sm text-muted-foreground">
                            Don&apos;t have an account?{" "}
                            <a href={url.registrationUrl} className="font-medium text-primary underline underline-offset-4 hover:opacity-75">
                                Sign up
                            </a>
                        </p>
                    )}

                    {/* ── Feature highlights ── */}
                    <div className="mt-2 grid grid-cols-2 gap-3">
                        {features.map(f => (
                            <div key={f.title} className="flex flex-col gap-1.5 rounded-lg border border-border bg-muted/40 p-3">
                                <span className="text-muted-foreground">{f.icon}</span>
                                <span className="text-xs font-semibold leading-tight">{f.title}</span>
                                <span className="text-xs text-muted-foreground leading-snug">{f.desc}</span>
                            </div>
                        ))}
                    </div>

                    <p className="text-center text-xs text-muted-foreground">
                        By signing in, you agree to our{" "}
                        <a href="/terms" className="underline underline-offset-4 hover:text-primary">
                            Terms
                        </a>{" "}
                        and{" "}
                        <a href="/privacy" className="underline underline-offset-4 hover:text-primary">
                            Privacy Policy
                        </a>
                        .
                    </p>
                </div>
            </div>
        </div>
    );
}
