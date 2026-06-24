/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './admin.html',
    './tabs/**/*.html',
    './js/**/*.js',
  ],
  theme: {
    extend: {},
  },
  corePlugins: {
    preflight: false,
  },
}
