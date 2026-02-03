/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...(config.watchOptions || {}),
        ignored: [
          '**/pagefile.sys',
          '**/hiberfil.sys',
          '**/swapfile.sys',
          '**/$Recycle.Bin/**',
          '**/System Volume Information/**'
        ]
      };
    }
    return config;
  }
}
  
module.exports = nextConfig
