/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    // Google Cloud libraries are server-side only
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        process: false,
        buffer: false,
        util: false,
        events: false,
        child_process: false,
      };
      
      // Ignore Google Cloud packages on client side
      config.externals = config.externals || [];
      config.externals.push({
        '@google-cloud/documentai': 'commonjs @google-cloud/documentai',
        '@google-cloud/vertexai': 'commonjs @google-cloud/vertexai',
        '@grpc/grpc-js': 'commonjs @grpc/grpc-js',
        'google-gax': 'commonjs google-gax',
      });
    }
    
    return config;
  },
}

export default nextConfig