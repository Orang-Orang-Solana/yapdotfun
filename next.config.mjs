/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: 'brown-glamorous-bear-418.mypinata.cloud'
      }
    ]
  }
}

export default nextConfig
