import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        kisan: {
          green: "#15803d",
          greenDark: "#166534",
          greenLight: "#dcfce7",
          earth: "#78350f",
          amber: "#d97706",
          red: "#dc2626",
          redDark: "#b91c1c",
          surface: "#f8fafc",
        },
      },
    },
  },
  plugins: [],
};
export default config;
