import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Spotlight } from '@/components/ui/spotlight'

export default function Hero() {
  return (
    // <div className="grid xl:grid-cols-2 overflow-x-hidden">
    <div className="relative flex h-[calc(100vh-10vh)] overflow-hidden antialiased md:items-center md:justify-center xl:px-20">
      <Spotlight
        className="-top-20 left-20 md:-top-0 md:left-40"
        fill="white"
      />
      <div className="relative z-10 w-full max-w-7xl p-4 pt-20 md:pt-0">
        <h1 className="bg-opacity-50 bg-gradient-to-b from-neutral-50 to-neutral-400 bg-clip-text text-4xl font-bold text-transparent md:text-6xl capitalize">
          the social prediction market powered by influencers
        </h1>
        <p className="mt-4 max-w-lg text-base font-normal text-muted-foreground">
          Trade on the hottest predictions from your favorite X influencer. Turn
          your social insights into real rewards while competing with a global
          community of predictors.
        </p>
        <div className="mt-4 space-x-5">
          <Button size={'lg'} asChild>
            <Link href={'/yapping'}>Start Predicting</Link>
          </Button>
          <Button variant={'link'} size={'lg'}>
            Learn More
          </Button>
        </div>
      </div>
    </div>

    // </div>
  )
}
