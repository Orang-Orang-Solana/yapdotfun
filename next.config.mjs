/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: 'brown-glamorous-bear-418.mypinata.cloud'
      },
      {
        hostname: 'example.com'
      },
      {
        hostname: 'firebasestorage.googleapis.com'
      }
    ]
  }
}

export default nextConfig
