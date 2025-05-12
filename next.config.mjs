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
      },
      {
        hostname: 'picsum.photos'
      },
      {
        hostname: '*.mypinata.cloud'
      }
    ]
  }
}

export default nextConfig
