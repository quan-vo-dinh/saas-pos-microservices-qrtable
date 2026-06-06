/* eslint-disable @typescript-eslint/no-unused-vars */
import { i18nBuilder } from "keycloakify/login";
import type { ThemeName } from "../kc.gen";

/** Bản dịch tiếng Việt — ghi đè cả `en` để UI luôn hiển thị VI khi realm chưa bật locale. */
const viMessages = {
    doLogIn: "Đăng nhập",
    doSubmit: "Xác nhận",
    doCancel: "Hủy",
    doRegister: "Đăng ký",
    doForgotPassword: "Quên mật khẩu?",
    rememberMe: "Ghi nhớ đăng nhập",
    username: "Email",
    password: "Mật khẩu",
    passwordNew: "Mật khẩu mới",
    passwordConfirm: "Xác nhận mật khẩu",
    loginAccountTitle: "Đăng nhập",
    updatePasswordTitle: "Đặt mật khẩu mới",
    updatePasswordMessage:
        "Tài khoản đang dùng mật khẩu tạm. Chọn mật khẩu mới để tiếp tục vào QRTable.",
    logoutOtherSessions: "Đăng xuất các phiên đăng nhập khác",
    noAccount: "Chưa có tài khoản?",
    emailForgotTitle: "Khôi phục mật khẩu",
    invalidUserMessage: "Email hoặc mật khẩu không đúng.",
    invalidUsernameMessage: "Email hoặc mật khẩu không đúng.",
    invalidUsernameOrEmailMessage: "Email hoặc mật khẩu không đúng.",
    accountDisabledMessage: "Tài khoản đã bị vô hiệu hóa.",
    accountTemporarilyDisabledMessage:
        "Tài khoản tạm khóa. Thử lại sau hoặc liên hệ quản trị.",
    expiredCodeMessage: "Phiên đăng nhập hết hạn. Vui lòng thử lại.",
    expiredActionMessage: "Hành động đã hết hạn. Vui lòng bắt đầu lại.",
    missingUsernameMessage: "Vui lòng nhập email.",
    missingPasswordMessage: "Vui lòng nhập mật khẩu.",
    notMatchPasswordMessage: "Mật khẩu xác nhận không khớp.",
    invalidPasswordExistingMessage: "Mật khẩu hiện tại không đúng.",
    invalidPasswordConfirmMessage: "Mật khẩu xác nhận không khớp.",
    invalidPasswordMinLengthMessage: "Mật khẩu quá ngắn.",
    invalidPasswordMaxLengthMessage: "Mật khẩu quá dài.",
    invalidPasswordMinDigitsMessage: "Mật khẩu cần thêm chữ số.",
    invalidPasswordMinLowerCaseCharsMessage: "Mật khẩu cần thêm chữ thường.",
    invalidPasswordMinUpperCaseCharsMessage: "Mật khẩu cần thêm chữ hoa.",
    invalidPasswordMinSpecialCharsMessage: "Mật khẩu cần thêm ký tự đặc biệt.",
    invalidPasswordNotUsernameMessage: "Mật khẩu không được trùng với tên đăng nhập.",
    invalidPasswordHistoryMessage: "Mật khẩu trùng với mật khẩu cũ.",
    qrSignInSubtitle: "Nhập thông tin đăng nhập để vào không gian làm việc",
    qrOrContinueEmail: "Hoặc tiếp tục bằng email",
    qrTermsPrefix: "Khi đăng nhập, bạn đồng ý với",
    qrTerms: "Điều khoản",
    qrAnd: "và",
    qrPrivacy: "Chính sách bảo mật",
    qrShowPassword: "Hiện mật khẩu",
    qrHidePassword: "Ẩn mật khẩu"
} as const;

/** @see: https://docs.keycloakify.dev/features/i18n */
const { useI18n, ofTypeI18n } = i18nBuilder
    .withThemeName<ThemeName>()
    .withCustomTranslations({
        /** Ghi đè locale `en` — Keycloakify chỉ cho phép custom trên locale có sẵn; realm `defaultLocale=vi` vẫn dùng bundle server. */
        en: { ...viMessages }
    })
    .build();

type I18n = typeof ofTypeI18n;

export { useI18n, type I18n };
