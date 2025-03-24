import Preview from '@/components/Preview'
import Hero from '@/components/layout/home/hero'

export default function Home() {
  return (
    <main className="h-[calc(100vh-10vh)]">
      <div className="grid xl:grid-cols-2">
        <Hero />
        <Preview />
      </div>
    </main>
  )
}
