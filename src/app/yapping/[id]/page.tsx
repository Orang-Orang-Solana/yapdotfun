'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import { ChartYapping } from '@/components/layout/yapping/detail/ChartYapping'
import ChatYapping from '@/components/layout/yapping/detail/ChatYapping'
import InfoYapping from '@/components/layout/yapping/detail/InfoYapping'
import SellShares from '@/components/layout/yapping/detail/SellShares'
import TradeYapping from '@/components/layout/yapping/detail/TradeYapping'
import WithdrawRewards from '@/components/layout/yapping/detail/WithdrawRewards'
import { useYappingMarketFetchers } from '@/hooks/use-yapping-market-fetchers'
import { useYappingMarketPosition } from '@/hooks/use-yapping-market-position'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'

export default function YappingDetailPage() {
  const params = useParams()
  const marketId = typeof params.id === 'string' ? params.id : ''
  const { marketAccount, marketAccounts } = useYappingMarketFetchers(marketId)
  const { positionData } = useYappingMarketPosition(marketId)

  // Calculate chances based on market data
  const [chanceBetYES, setChanceBetYES] = useState(50)
  const [chanceBetNO, setChanceBetNO] = useState(50)
  const [totalLiquidity, setTotalLiquidity] = useState('0')

  // Update chances only when market data changes
  useEffect(() => {
    // Don't run if we don't have market data yet
    if (!marketAccount?.data || !marketAccounts) return

    // Find the market metadata
    const market = marketAccounts.find(
      (m) => m.publicKey.toBase58() === marketId
    )
    if (
      !market ||
      !market.account.metadata.totalYesAssets ||
      !market.account.metadata.totalNoAssets
    )
      return

    // Calculate YES/NO percentages
    const totalYesAssets = market.account.metadata.totalYesAssets.toNumber()
    const totalNoAssets = market.account.metadata.totalNoAssets.toNumber()
    const totalAssets = totalYesAssets + totalNoAssets

    if (totalAssets > 0) {
      const yesPercentage = Math.round((totalYesAssets / totalAssets) * 100)
      const noPercentage = 100 - yesPercentage

      // Set the total liquidity in SOL
      const liquidityInSol = (totalAssets / LAMPORTS_PER_SOL).toFixed(3)
      setTotalLiquidity(liquidityInSol)

      setChanceBetYES(yesPercentage)
      setChanceBetNO(noPercentage)
    }
  }, [marketAccount?.data, marketAccounts, marketId])

  if (!marketAccount?.data) {
    return <div className="text-center p-10">Loading market data...</div>
  }

  const market = marketAccount.data
  // Check if market status is open (in Solana program it's an enum)
  const isMarketOpen =
    !market.status?.closed || market.status?.open !== undefined

  return (
    <main className="grid xl:grid-cols-3 gap-5">
      <section className="xl:col-span-2 space-y-5">
        <InfoYapping
          infoYapping={{
            image: market.imageUrl,
            description: market.description,
            totalBet: `${(chanceBetYES / 100).toFixed(2)}/${(chanceBetNO / 100).toFixed(2)}`,
            startBet: 'N/A',
            endBet: new Date(Number(market.endTime) * 1000).toISOString(),
            liquidity: `${totalLiquidity} SOL`
          }}
        />
        <ChartYapping
          chanceBetYES={chanceBetYES}
          chanceBetNO={chanceBetNO}
          marketPublicKey={marketId}
        />
      </section>
      <section className="space-y-5 h-fit">
        {isMarketOpen && (
          <TradeYapping
            chanceBetYES={chanceBetYES}
            chanceBetNO={chanceBetNO}
            marketPublicKey={marketId}
          />
        )}

        {positionData && (
          <SellShares
            marketPublicKey={marketId}
            userVote={positionData.bet}
            userShares={positionData.shares}
            userAmount={positionData.amount}
            isMarketOpen={isMarketOpen}
          />
        )}

        {positionData && !isMarketOpen && (
          <WithdrawRewards
            marketPublicKey={marketId}
            marketStatus="closed"
            userVote={positionData.bet}
            marketOutcome={market.result}
          />
        )}

        <ChatYapping messages={messages} />
      </section>
    </main>
  )
}

// Mock data for the chat
const messages = [
  {
    id: '1',
    sender: '0x1234567890abcdef1234567890abcdef12345678',
    content: "Hello! How's it going?",
    timestamp: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
  },
  {
    id: '2',
    sender: '0x9876543210fedcba9876543210fedcba98765432',
    content: 'Just checking out this new dApp. Looks interesting!',
    timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
    isCurrentUser: true
  },
  {
    id: '3',
    sender: '0x1234567890abcdef1234567890abcdef12345678',
    content:
      'Thanks! We just launched it yesterday. Let me know if you have any questions.',
    timestamp: new Date(Date.now() - 900000).toISOString() // 15 minutes ago
  }
]
