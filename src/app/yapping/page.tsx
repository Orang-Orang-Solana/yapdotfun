import CardYapping from '@/components/CardYapping'
import Hero from '@/components/layout/yapping/hero'

export default function page() {
  return (
    <div className="2xl:space-y-12">
      <Hero />
      <CardYapping />
    </div>
  )
}
