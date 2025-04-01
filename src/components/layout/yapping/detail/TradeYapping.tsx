'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function TradeYapping({
  chanceBetYES,
  chanceBetNO
}: {
  chanceBetYES: number
  chanceBetNO: number
}) {
  const [amount, setAmount] = useState<string>('')
  const [betting, setBetting] = useState<number | null>(null)
  const [accumulativePayout, setAccumulativePayout] = useState<number | null>(
    null
  )

  // Update accumulative payouts whenever amount or betting changes
  useEffect(() => {
    if (betting !== null && amount) {
      const payout =
        betting === 1
          ? (parseFloat(amount) * chanceBetYES) / 100 + parseFloat(amount)
          : (parseFloat(amount) * chanceBetNO) / 100 + parseFloat(amount)
      setAccumulativePayout(payout)
    } else {
      setAccumulativePayout(null)
    }
  }, [amount, betting, chanceBetYES, chanceBetNO])

  async function chooseBetting(bet: number) {
    setBetting(bet)
    console.log(`You chose: ${bet === 1 ? 'YES' : 'NO'}`)
  }

  async function submitBetting() {
    console.log(amount)
    console.log('Betting:', betting)
    toast(`Success Betting ${betting === 1 ? 'YES' : 'NO'} with ${amount} SOL`)
  }

  return (
    <div className="space-y-5 border rounded p-5">
      <h1 className="font-medium">Select Your BET</h1>
      <div className="grid grid-cols-2 gap-5">
        <Button
          variant={betting === 1 ? 'default' : 'outline'}
          onClick={() => chooseBetting(1)}
        >
          YES
        </Button>
        <Button
          variant={betting === 2 ? 'default' : 'outline'}
          onClick={() => chooseBetting(2)}
        >
          NO
        </Button>
      </div>
      <section className="space-y-5">
        <div className="flex items-center relative">
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
        <Button onClick={submitBetting} disabled={!amount || betting === null}>
          Confirm
        </Button>
      </section>
      <p className="text-sm">
        <span className="text-muted-foreground">Accumulative payouts: </span>
        {accumulativePayout !== null
          ? `${accumulativePayout.toFixed(2)} SOL`
          : 'N/A'}
      </p>
    </div>
  )
}
