/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
<<<<<<< HEAD
  experimental: {
    serverComponentsExternalPackages: ['xlsx'],
=======
  typescript: {
    ignoreBuildErrors: true,   // skips tsc — prevents OOM kill on small VPS
  },
  eslint: {
    ignoreDuringBuilds: true,  // skips eslint during build
>>>>>>> faaa2a595a51abb69a922cfa0c32b5b1cf1e5447
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
    const legacyOrigin = process.env.MOVESBOOK_LEGACY_ORIGIN || 'https://movesbook.com';
    return [
      {
        source: '/country-flags/:path*',
        destination: 'https://flagcdn.com/:path*',
      },
      {
        source: '/img/flags/:path*',
        destination: `${legacyOrigin}/img/flags/:path*`,
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