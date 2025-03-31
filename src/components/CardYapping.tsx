'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'

import { Button } from './ui/button'
import { Input } from './ui/input'

type BetType = {
  image: string
  description: string
  totalBet: string
  startBet: string
  endBet: string
}

export default function CardYapping() {
  const [amount, setAmount] = useState<string>('')
  const [betting, setBetting] = useState<number | null>(null)
  async function chooseBetting(bet: number) {
    setBetting(bet)
    console.log(`You chose: ${bet === 1 ? 'YES' : 'NO'}`)
  }

  async function submitBetting() {
    console.log(amount)
    console.log('Betting:', betting)
    toast(`Success Betting ${betting === 1 ? 'YES' : 'NO'} with ${amount} SOL`)
  }

  if (!dummyBets)
    return <p className="text-center text-muted-foreground my-10">Loading...</p>

  return (
    <div className="grid xl:grid-cols-3 2xl:grid-cols-4 gap-5">
      {dummyBets?.map((data: BetType, index: number) => {
        const endBet = new Date(Number(data.endBet) * 1000)
        return (
          <Card key={index}>
            <CardHeader>
              <CardTitle>
                <Link href={'/'}>
                  <Image
                    src={data.image}
                    alt={data.description}
                    width={1080}
                    height={1080}
                    priority={true}
                    className="aspect-square w-full object-cover border rounded-xl"
                  />
                </Link>
              </CardTitle>
              <CardDescription className="h-12 line-clamp-2 overflow-auto">
                {data.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-5 flex-grow">
              <Dialog>
                <DialogTrigger asChild>
                  <Button onClick={() => chooseBetting(1)}>YES</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Place Your Bet - YES</DialogTitle>
                    <DialogDescription>
                      Remember that all bets are final once confirmed on the
                      blockchain.
                    </DialogDescription>
                  </DialogHeader>
                  <section className="space-y-5">
                    <div className="flex items-center relative w-1/2">
                      <Input
                        placeholder="Amount"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                      <span className="bg-black border p-1 px-3 font-semibold rounded-md absolute right-0">
                        SOL
                      </span>
                    </div>
                    <Button onClick={submitBetting} disabled={!amount}>
                      Confirm
                    </Button>
                  </section>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant={'secondary'}
                    onClick={() => chooseBetting(0)}
                  >
                    NO
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Place Your Bet - NO</DialogTitle>
                    <DialogDescription>
                      Remember that all bets are final once confirmed on the
                      blockchain.
                    </DialogDescription>
                  </DialogHeader>
                  <section className="space-y-5">
                    <div className="flex items-center relative w-1/2">
                      <Input
                        type="number"
                        placeholder="Amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                      <span className="bg-black border p-1 px-3 font-semibold rounded-md absolute right-0">
                        SOL
                      </span>
                    </div>
                    <Button onClick={submitBetting} disabled={!amount}>
                      Confirm
                    </Button>
                  </section>
                </DialogContent>
              </Dialog>
            </CardContent>
            <CardFooter className="grid grid-cols-2 items-start text-xs">
              <p className="font-medium">
                <span className="text-muted-foreground font-normal">
                  Total Bets
                </span>{' '}
                {data.totalBet}
              </p>
              <p className="text-right font-medium">
                <span className="text-muted-foreground font-normal">
                  End Bet
                </span>{' '}
                {endBet.toUTCString()}
              </p>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}

const dummyBets = [
  {
    image:
      'https://firebasestorage.googleapis.com/v0/b/jekydatabase.appspot.com/o/yapping%2FScreenshot%202025-03-24%20225938.png?alt=media&token=7d31b80f-d7f7-4c00-aeb2-8af44ffd5924',
    description: 'Will Ethereum price exceed $5000 by the end of 2025?',
    totalBet: '19 SOL',
    startBet: '1735689600',
    endBet: '1766908800'
  },
  {
    image:
      'https://firebasestorage.googleapis.com/v0/b/jekydatabase.appspot.com/o/yapping%2FScreenshot%202025-03-24%20225945.png?alt=media&token=5ff0d9d3-48e5-4151-881e-cb1ad15bb24d',

    description: 'Will Brazil win the 2026 FIFA World Cup?',
    totalBet: '19 SOL',
    startBet: '1762992000',
    endBet: '1784649600'
  },
  {
    image:
      'https://firebasestorage.googleapis.com/v0/b/jekydatabase.appspot.com/o/yapping%2FScreenshot%202025-03-24%20225954.png?alt=media&token=7c9eef81-d097-4d8c-bbae-62d5a6c91451',

    description: 'Will Apple release a foldable iPhone in 2025?',
    totalBet: '19 SOL',
    startBet: '1735689600',
    endBet: '1765699200'
  },
  {
    image:
      'https://firebasestorage.googleapis.com/v0/b/jekydatabase.appspot.com/o/yapping%2FScreenshot%202025-03-24%20230136.png?alt=media&token=1a6d1d77-342e-49ce-8065-717b2ebbac25',

    description:
      'Will the incumbent party win the 2028 US presidential election?',
    totalBet: '119 SOL',
    startBet: '1798761600',
    endBet: '1857609600'
  },
  {
    image:
      'https://firebasestorage.googleapis.com/v0/b/jekydatabase.appspot.com/o/yapping%2FScreenshot%202025-03-24%20230145.png?alt=media&token=5d5beffe-c0ba-4cbd-88eb-00c96663eea5',

    description: 'Will SpaceX successfully land humans on Mars before 2030?',
    totalBet: '19 SOL',
    startBet: '1735689600',
    endBet: '1893456000'
  },
  {
    image:
      'https://firebasestorage.googleapis.com/v0/b/jekydatabase.appspot.com/o/yapping%2FScreenshot%202025-03-24%20225954.png?alt=media&token=7c9eef81-d097-4d8c-bbae-62d5a6c91451',

    description:
      'Will the movie "Dune: Part Three" win Best Picture at the 2026 Oscars?',
    totalBet: '19 SOL',
    startBet: '1743608400',
    endBet: '1772172000'
  },
  {
    image:
      'https://firebasestorage.googleapis.com/v0/b/jekydatabase.appspot.com/o/yapping%2FScreenshot%202025-03-24%20225945.png?alt=media&token=5ff0d9d3-48e5-4151-881e-cb1ad15bb24d',

    description:
      'Will Bitcoin reach $100,000 within 6 months after the 2024 halving?',
    totalBet: '219 SOL',
    startBet: '1713686400',
    endBet: '1729296000'
  },
  {
    image:
      'https://firebasestorage.googleapis.com/v0/b/jekydatabase.appspot.com/o/yapping%2FScreenshot%202025-03-24%20230150.png?alt=media&token=bd1510f2-ab1d-41f3-bd55-c29145f8dd8f',

    description:
      'Will any AI system pass a comprehensive Turing test by the end of 2025?',
    totalBet: '19 SOL',
    startBet: '1735689600',
    endBet: '1766908800'
  },
  {
    image:
      'https://firebasestorage.googleapis.com/v0/b/jekydatabase.appspot.com/o/yapping%2FScreenshot%202025-03-24%20230150.png?alt=media&token=bd1510f2-ab1d-41f3-bd55-c29145f8dd8f',

    description:
      'Will the USA win the most gold medals at the 2028 Summer Olympics?',
    totalBet: '19 SOL',
    startBet: '1798761600',
    endBet: '1848960000'
  },
  {
    image:
      'https://firebasestorage.googleapis.com/v0/b/jekydatabase.appspot.com/o/yapping%2FScreenshot%202025-03-24%20230159.png?alt=media&token=56e2a4e6-b1de-4999-af47-a218eeb33755',

    description:
      'Will global average temperature increase by more than 1.5°C by 2026 compared to pre-industrial levels?',
    totalBet: '19 SOL',
    startBet: '1735689600',
    endBet: '1798761600'
  }
]
