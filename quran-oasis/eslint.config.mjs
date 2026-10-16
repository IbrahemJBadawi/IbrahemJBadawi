import next from "eslint-config-next";

const config = [
  ...next,
  {
    rules: {
      // نقرأ عمدًا حالة المتصفح (localStorage، window، Service Worker) عند التحميل داخل useEffect
      // لأنها غير متاحة أثناء العرض على الخادم؛ نُبقي القاعدة تحذيرًا لا خطأً.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  { ignores: [".next/**", "node_modules/**", "public/**", "playwright-report/**", "test-results/**"] },
];
export default config;
