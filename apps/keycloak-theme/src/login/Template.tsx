import { Fragment, type ReactNode } from "react";
import DefaultTemplate from "keycloakify/login/Template";
import type { TemplateProps } from "keycloakify/login/TemplateProps";
import type { KcContext } from "./KcContext";
import type { I18n } from "./i18n";

type PageLabel = {
    title: string;
    subtitle: string;
};

function getPageLabel(pageId: string): PageLabel {
    switch (pageId) {
        case "register.ftl":
            return {
                title: "Create your QRTable account",
                subtitle: "Register staff identity and continue to your workspace."
            };
        case "login-reset-password.ftl":
            return {
                title: "Reset your password",
                subtitle: "Enter your account email to recover access securely."
            };
        case "login-update-password.ftl":
            return {
                title: "Set your new password",
                subtitle: "Choose a secure password to continue to your workspace."
            };
        default:
            return {
                title: "Sign in to QRTable Management",
                subtitle: "Secure POS and dashboard access for your restaurant team."
            };
    }
}

function BrandPanel(props: { pageId: string }): ReactNode {
    const { title, subtitle } = getPageLabel(props.pageId);

    return (
        <div className="qt-brand-panel">
            <span className="qt-brand-badge">QRTable</span>
            <h1>{title}</h1>
            <p>{subtitle}</p>
            <div className="qt-brand-meta">
                <span>Tenant-aware access</span>
                <span>Role-based routing</span>
                <span>Keycloak secured</span>
            </div>
        </div>
    );
}

export default function Template(props: TemplateProps<KcContext, I18n>) {
    const { kcContext } = props;

    return (
        <Fragment>
            <div className="qt-auth-bg" />
            <DefaultTemplate {...props} headerNode={<BrandPanel pageId={kcContext.pageId} />} />
        </Fragment>
    );
}
