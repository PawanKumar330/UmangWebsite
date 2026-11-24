import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        festive: {
          maroon: {
            50: "#fdf2f4",
            100: "#fbe4e8",
            200: "#f8cbd3",
            300: "#f2a4b2",
            400: "#e87087",
            500: "#d94262",
            600: "#bd2446",
            700: "#9e1937",
            800: "#831830",
            900: "#6e192c",
            950: "#3d0814",
          },
          gold: {
            50: "#faf8f2",
            100: "#f4eedf",
            200: "#ebdec1",
            300: "#dec79a",
            400: "#cfae70",
            500: "#bc934d",
            600: "#a37a3c",
            700: "#835f32",
            800: "#6b4d2d",
            900: "#583f27",
          },
          saffron: {
            50: "#fdf7f2",
            100: "#faeee2",
            200: "#f5dbc3",
            300: "#ecc09c",
            400: "#df9d71",
            500: "#d07d4d",
            600: "#b56138",
            700: "#954a2e",
            800: "#7a3e29",
            900: "#653424",
          },
        },
      },
    },
  },
  plugins: [],
};
export default config;
