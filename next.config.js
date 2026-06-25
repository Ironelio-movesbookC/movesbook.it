/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,   // skips tsc — prevents OOM kill on small VPS
  },
  eslint: {
    ignoreDuringBuilds: true,  // skips eslint during build
  },
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
      {
        source: '/outcome_messages/:path*',
        destination: '/api/outcome-messages/:path*',
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