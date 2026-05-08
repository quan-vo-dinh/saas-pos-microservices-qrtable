export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 0: disable, 1: warning, 2: error
    // 'always': áp dụng quy tắc này

    // Giới hạn độ dài dòng header commit
    'header-max-length': [2, 'always', 150],

    // Giới hạn độ dài từng dòng trong body commit
    'body-max-line-length': [2, 'always', 200],

    // Nếu muốn footer cũng dài hơn, ví dụ BREAKING CHANGE hoặc issue refs
    'footer-max-line-length': [2, 'always', 200],
  },
};
