import type { ReactNode } from "react";
import loginBg from "../assets/login-bg.png";
import { QRTableLogo } from "./AuthIcons";

type AuthSplitLayoutProps = {
    title: string;
    subtitle: string;
    children: ReactNode;
    footer?: ReactNode;
};

export default function AuthSplitLayout(props: AuthSplitLayoutProps) {
    const { title, subtitle, children, footer } = props;

    return (
        <div className="relative grid min-h-screen lg:grid-cols-2">
            <div className="relative hidden overflow-hidden lg:block">
                <img src={loginBg} alt="" className="absolute inset-0 size-full object-cover object-center select-none" />
                <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent" />
                <div className="absolute bottom-10 left-10 flex items-center gap-3 text-white">
                    <QRTableLogo className="size-8 text-white" />
                    <span className="text-2xl font-bold tracking-tight">QRTable</span>
                </div>
            </div>

            <div className="flex flex-col justify-center px-6 py-12 lg:px-12">
                <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
                    <div className="flex items-center justify-center gap-2 lg:hidden">
                        <QRTableLogo />
                        <span className="text-xl font-semibold">QRTable</span>
                    </div>

                    <div className="flex flex-col gap-1">
                        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
                        <p className="text-sm text-muted-foreground">{subtitle}</p>
                    </div>

                    {children}

                    {footer}
                </div>
            </div>
        </div>
    );
}
