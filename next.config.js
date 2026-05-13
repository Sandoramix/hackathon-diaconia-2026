import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  transpilePackages: ["next-auth", "calendarkit-pro", "rrule"],
};

export default config;
