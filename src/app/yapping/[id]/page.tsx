'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import { ChartYapping } from '@/components/layout/yapping/detail/ChartYapping'
import ChatYapping from '@/components/layout/yapping/detail/ChatYapping'
import DebugCloseMarket from '@/components/layout/yapping/detail/DebugCloseMarket'
import InfoYapping from '@/components/layout/yapping/detail/InfoYapping'
import SellShares from '@/components/layout/yapping/detail/SellShares'
import TradeYapping from '@/components/layout/yapping/detail/TradeYapping'
import WithdrawRewards from '@/components/layout/yapping/detail/WithdrawRewards'
import { useYappingMarketFetchers } from '@/hooks/use-yapping-market-fetchers'
import { useYappingMarketPosition } from '@/hooks/use-yapping-market-position'
import { useWallet } from '@solana/wallet-adapter-react'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'

// Message type for chat
interface Message {
  id: string
  sender: string
  content: string
  timestamp: string
}

export default function YappingDetailPage() {
  const params = useParams()
  const marketId = typeof params.id === 'string' ? params.id : ''
  const { marketAccount, marketAccounts } = useYappingMarketFetchers(marketId)
  const { positionData, invalidatePositionData } =
    useYappingMarketPosition(marketId)
  const { publicKey } = useWallet()

  // Calculate chances based on market data
  const [chanceBetYES, setChanceBetYES] = useState(50)
  const [chanceBetNO, setChanceBetNO] = useState(50)
  const [totalLiquidity, setTotalLiquidity] = useState('0')

  // Chat messages state
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(true)

  // Fetch chat messages from API
  useEffect(
    function fetchMessages() {
      let isMounted = true
      async function getMessages() {
        setLoadingMessages(true)
        try {
          const res = await fetch(
            `/api/comments?programId=${marketId}&limit=50`
          )
          const data = await res.json()
          if (isMounted && data?.data) {
            setMessages(
              data.data.map(
                (msg: {
                  id: number | string
                  authorAddress: string
                  content: string
                  createdAt: string
                }) => ({
                  id: msg.id.toString(),
                  sender: msg.authorAddress,
                  content: msg.content,
                  timestamp: msg.createdAt
                })
              )
            )
          }
        } catch (e) {
          // Optionally handle error
        } finally {
          if (isMounted) setLoadingMessages(false)
        }
      }
      getMessages()
      // Poll every 5 seconds
      const interval = setInterval(getMessages, 5000)
      return () => {
        isMounted = false
        clearInterval(interval)
      }
    },
    [marketId]
  )

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
          <>
            <TradeYapping
              chanceBetYES={chanceBetYES}
              chanceBetNO={chanceBetNO}
              marketPublicKey={marketId}
            />

            {/* Debug component for closing markets - only visible in development */}
            <DebugCloseMarket
              marketPublicKey={marketId}
              marketStatus={isMarketOpen ? 'Open' : 'Closed'}
            />
          </>
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

        {!isMarketOpen &&
          (positionData ? (
            <WithdrawRewards
              marketPublicKey={marketId}
              marketStatus={isMarketOpen ? 'Open' : 'Closed'}
              userVote={positionData.bet}
              marketOutcome={market.result}
            />
          ) : (
            <div className="space-y-5 border rounded p-5 mt-5">
              <h1 className="font-medium">Market Rewards</h1>
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm">
                  <span className="text-muted-foreground">Market status: </span>
                  <span className="font-medium">Closed</span>
                </p>
                <p className="text-sm mt-1">
                  <span className="text-muted-foreground">Outcome: </span>
                  <span className="font-medium">
                    {market.result ? 'YES' : 'NO'}
                  </span>
                </p>
                <p className="text-sm mt-1 text-green-600">
                  You have no active position in this market. You may have
                  already withdrawn your rewards or did not participate.
                </p>
              </div>
            </div>
          ))}

        <ChatYapping
          messages={messages}
          marketId={marketId}
          userAddress={publicKey?.toBase58() || ''}
          onMessageSent={() => {
            // Refetch messages after sending
            // (optional, can be handled in ChatYapping too)
          }}
        />
      </section>
    </main>
  )
}
