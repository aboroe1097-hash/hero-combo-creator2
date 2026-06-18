/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './js/**/*.js',
    './css/**/*.css',
  ],
  theme: {
    extend: {},
  },
  corePlugins: {
    preflight: false,
  },
}
