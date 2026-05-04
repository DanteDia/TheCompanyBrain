/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Allow our trusted brand SVG to be served via next/image. The
    // contentDispositionType + contentSecurityPolicy below are the
    // defaults Next recommends to mitigate SVG-based XSS — fine because
    // we only host our own SVGs in /public.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

module.exports = nextConfig;
