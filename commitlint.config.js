export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 0: disable, 1: warning, 2: error
    // 'always': áp dụng quy tắc này
    // 150: giới hạn ký tự mới
    'header-max-length': [2, 'always', 150],
  },
};
