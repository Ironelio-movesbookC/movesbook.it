/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async redirects() {
    return [
      {
        source: '/operators/operator_coadmin_settings/:operatorId/:coadminId',
        destination: '/operators/super-admin-settings/:operatorId',
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/country-flags/:path*',
        destination: 'https://flagcdn.com/:path*',
      },
    ];
  },
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
  
module.exports = nextConfig;