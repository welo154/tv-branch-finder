import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./data/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        tvBlue: "#129AF3",
        tvDark: "#101318",
        tvMuted: "#667085",
      },
      boxShadow: {
        card: "0 18px 50px rgba(16, 19, 24, 0.08)",
      },
    },
  },
  plugins: [],
};
export default config;
