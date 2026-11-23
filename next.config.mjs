/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow LAN devices to load /_next/* assets in `next dev`.
  // Hostname only (no scheme/port). Add new device/host IPs here as needed.
  allowedDevOrigins: [
    "192.168.1.17", // this PC (Wi-Fi) — use from phones on the same LAN
  ],
};

export default nextConfig;
