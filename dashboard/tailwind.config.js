module.exports = {
  important: true,
  theme: {
    extend: {
      lineHeight: {
        zero: "0",
      },
      flex: {
        full: "0 0 100%",
        flexible: "1 1 0",
      },
    },
    screens: {
      sm: "640px",
      md: "768px",
      "until-lg": { max: "1023px" },
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
  },
  variants: {},
  plugins: [],
};
