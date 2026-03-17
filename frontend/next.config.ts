import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['neo4j-driver'],
  // Exclude the legacy CRA src/ directory from Next.js compilation
  webpack: (config, { isServer }) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/node_modules', '**/src/**'],
    }
    return config
  },
  // Only compile files in app/ directory
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
}

export default nextConfig
