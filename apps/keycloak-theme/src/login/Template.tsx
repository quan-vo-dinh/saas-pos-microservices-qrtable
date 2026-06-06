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
                title: "Tạo tài khoản QRTable",
                subtitle: "Đăng ký danh tính nhân viên và tiếp tục vào không gian làm việc."
            };
        case "login-reset-password.ftl":
            return {
                title: "Khôi phục mật khẩu",
                subtitle: "Nhập email tài khoản để nhận hướng dẫn đặt lại mật khẩu."
            };
        case "login-update-password.ftl":
            return {
                title: "Đặt mật khẩu mới",
                subtitle: "Chọn mật khẩu mạnh để tiếp tục vào QRTable."
            };
        default:
            return {
                title: "Đăng nhập QRTable Management",
                subtitle: "Truy cập POS và bảng điều khiển an toàn cho đội ngũ nhà hàng."
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
                <span>Phân tách tenant</span>
                <span>Phân quyền theo vai trò</span>
                <span>Bảo mật Keycloak</span>
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
