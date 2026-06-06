import { kcSanitize } from "keycloakify/lib/kcSanitize";
import type { KcContext } from "../KcContext";
import type { I18n } from "../i18n";
import AuthSplitLayout from "../components/AuthSplitLayout";
import GlobalMessage from "../components/GlobalMessage";
import PasswordField from "../components/PasswordField";
import { KeyRoundIcon } from "../components/AuthIcons";
import { buttonOutlineClass, buttonPrimaryClass } from "../lib/auth-ui";

type UpdatePasswordContext = Extract<KcContext, { pageId: "login-update-password.ftl" }>;

export default function LoginUpdatePassword(props: { kcContext: UpdatePasswordContext; i18n: I18n }) {
    const { kcContext, i18n } = props;
    const { msg, msgStr } = i18n;
    const { url, messagesPerField, isAppInitiatedAction, message } = kcContext;

    const hasPasswordError = messagesPerField.existsError("password");
    const hasConfirmError = messagesPerField.existsError("password-confirm");
    const showGlobalMessage = message && !messagesPerField.existsError("password", "password-confirm");

    return (
        <AuthSplitLayout
            title={msgStr("updatePasswordTitle")}
            subtitle={msgStr("updatePasswordMessage")}
            footer={
                <p className="text-center text-xs text-muted-foreground">
                    {msgStr("qrTermsPrefix")}{" "}
                    <a href="/terms" className="underline underline-offset-4 hover:text-primary">
                        {msgStr("qrTerms")}
                    </a>{" "}
                    {msgStr("qrAnd")}{" "}
                    <a href="/privacy" className="underline underline-offset-4 hover:text-primary">
                        {msgStr("qrPrivacy")}
                    </a>
                    .
                </p>
            }
        >
            {showGlobalMessage && <GlobalMessage message={message} />}

            <form id="kc-passwd-update-form" action={url.loginAction} method="post" className="flex flex-col gap-3">
                <PasswordField
                    id="password-new"
                    name="password-new"
                    label={msgStr("passwordNew")}
                    autoFocus
                    hasError={hasPasswordError || hasConfirmError}
                    errorHtml={hasPasswordError ? kcSanitize(messagesPerField.get("password")) : undefined}
                />

                <PasswordField
                    id="password-confirm"
                    name="password-confirm"
                    label={msgStr("passwordConfirm")}
                    hasError={hasConfirmError}
                    errorHtml={
                        hasConfirmError ? kcSanitize(messagesPerField.get("password-confirm")) : undefined
                    }
                />

                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="logout-sessions"
                        name="logout-sessions"
                        value="on"
                        defaultChecked
                        className="size-4 rounded border border-input accent-primary"
                    />
                    <label htmlFor="logout-sessions" className="text-sm leading-none text-muted-foreground">
                        {msg("logoutOtherSessions")}
                    </label>
                </div>

                <div className="flex flex-col gap-2">
                    <button type="submit" className={buttonPrimaryClass}>
                        <KeyRoundIcon />
                        {msgStr("doSubmit")}
                    </button>

                    {isAppInitiatedAction && (
                        <button type="submit" name="cancel-aia" value="true" className={buttonOutlineClass}>
                            {msgStr("doCancel")}
                        </button>
                    )}
                </div>
            </form>
        </AuthSplitLayout>
    );
}
