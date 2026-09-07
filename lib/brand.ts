// lib/brand.ts

export const BRAND = {
  name: "Breeze",

  product: {
    name: "Breeze",
    tagline: "Recover Revenue Faster",
    description:
      "Healthcare claims management platform",
  },

  company: {
    name: "Breeze",
    supportEmail: "support@breeze.com",
  },

  //Not sure which colors to use
  /*
  colors: {
    primary: "#06AE4E",
    secondary: "#132C4D",
    accent: "#9CA8BD",
  },
  */
  colors: {
    primary: "#10B981",
    secondary: "#132C4D",
    accent: "#34D399",
  },

  auth: {
    loginTitle: "Welcome Back",
    loginDescription:
      "Sign in to continue managing claims.",
  },
} as const;