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
import { useYappingMarketActions } from '@/hooks/use-yapping-market-actions'
import { useYappingMarketFetchers } from '@/hooks/use-yapping-market-fetchers'
import { useYappingMarketPosition } from '@/hooks/use-yapping-market-position'
import { BN } from '@coral-xyz/anchor'
import { useWallet } from '@solana/wallet-adapter-react'
import { LAMPORTS_PER_SOL, type PublicKey } from '@solana/web3.js'
import { useQueryClient } from '@tanstack/react-query'

import { useCluster } from './cluster/cluster-data-access'
import { Button } from './ui/button'
import { Input } from './ui/input'

export default function CardYapping() {
  const { marketAccounts } = useYappingMarketFetchers()
  const { cluster } = useCluster()
  const queryClient = useQueryClient()
  const { buy } = useYappingMarketActions()
  const { connected } = useWallet()

  const [amount, setAmount] = useState<string>('')
  const [betting, setBetting] = useState<number | null>(null)
  const [selectedMarket, setSelectedMarket] = useState<PublicKey | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [dialogOpen, setDialogOpen] = useState<boolean>(false)
  const { invalidatePositionData } = useYappingMarketPosition(
    selectedMarket?.toBase58() ?? undefined
  )

  function chooseBetting(bet: number, marketPublicKey: PublicKey) {
    setBetting(bet)
    setSelectedMarket(marketPublicKey)
    setDialogOpen(true)
    console.log(
      `You chose: ${bet === 1 ? 'YES' : 'NO'} for market ${marketPublicKey.toBase58()}`
    )
  }

  async function submitBetting() {
    if (!amount || !connected || !selectedMarket) {
      toast.error('Please connect your wallet and enter an amount')
      return
    }

    try {
      setIsLoading(true)
      // Convert amount from SOL to lamports
      const lamports = new BN(Number.parseFloat(amount) * LAMPORTS_PER_SOL)

      // Call the buy function from our hook
      await buy({
        marketPDA: selectedMarket,
        bet: betting === 1, // true for YES, false for NO
        amount: lamports
      })

      // Close the dialog
      setDialogOpen(false)

      // Reset form
      setAmount('')
      setBetting(null)
      setSelectedMarket(null)

      // Refresh market data
      await queryClient.invalidateQueries({
        queryKey: ['get-market-accounts', { cluster }]
      })

      invalidatePositionData()
    } catch (error) {
      console.error('Betting error:', error)
      toast.error('Failed to place bet. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!marketAccounts)
    return <p className="text-center text-muted-foreground my-10">Loading...</p>

  return (
    <div className="grid xl:grid-cols-3 2xl:grid-cols-4 gap-5">
      {marketAccounts?.map((data) => {
        const endBet = new Date(Number(data.account.endTime) * 1000)
        return (
          <Card key={data.publicKey.toBase58()}>
            <CardHeader>
              <CardTitle>
                <Link href={`/yapping/${data.publicKey.toBase58()}`}>
                  <Image
                    src={
                      data.account.imageUrl ?? 'https://picsum.photos/200/300'
                    }
                    alt={data.account.description}
                    width={1080}
                    height={1080}
                    priority={true}
                    className="aspect-square w-full object-cover border rounded-xl"
                  />
                </Link>
              </CardTitle>
              <CardDescription className="h-12 line-clamp-2 overflow-auto">
                {data.account.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-5 flex-grow">
              <Dialog
                open={dialogOpen && betting === 1}
                onOpenChange={setDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    onClick={() => chooseBetting(1, data.publicKey)}
                    disabled={!connected}
                  >
                    YES
                  </Button>
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
                        disabled={isLoading}
                      />
                      <span className="bg-black border p-1 px-3 font-semibold rounded-md absolute right-0">
                        SOL
                      </span>
                    </div>
                    <Button
                      onClick={submitBetting}
                      disabled={!amount || isLoading || !connected}
                    >
                      {isLoading ? 'Confirming...' : 'Confirm'}
                    </Button>
                  </section>
                </DialogContent>
              </Dialog>

              <Dialog
                open={dialogOpen && betting === 0}
                onOpenChange={setDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    variant={'secondary'}
                    onClick={() => chooseBetting(0, data.publicKey)}
                    disabled={!connected}
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
                        disabled={isLoading}
                      />
                      <span className="bg-black border p-1 px-3 font-semibold rounded-md absolute right-0">
                        SOL
                      </span>
                    </div>
                    <Button
                      onClick={submitBetting}
                      disabled={!amount || isLoading || !connected}
                    >
                      {isLoading ? 'Confirming...' : 'Confirm'}
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
                {(
                  (data.account.metadata.totalYesAssets.toNumber() +
                    data.account.metadata.totalNoAssets.toNumber()) /
                  LAMPORTS_PER_SOL
                ).toFixed(3)}{' '}
                SOL
              </p>
              <p className="text-right font-medium">
                <span className="text-muted-foreground font-normal">
                  End Bet
                </span>{' '}
                {endBet.toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
