'use client'

import { TrendingUp } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip
} from '@/components/ui/chart'
import { useQuery } from '@tanstack/react-query'

// Chart configuration with enhanced colors
const chartConfig = {
  bettingYES: {
    label: 'Betting YES',
    color: 'hsl(143, 85%, 56%)' // Vibrant green for YES
  },
  bettingNO: {
    label: 'Betting NO',
    color: 'hsl(346, 87%, 61%)' // Vibrant red for NO
  }
} satisfies ChartConfig

// CSS variables for chart colors
const YES_COLOR = chartConfig.bettingYES.color
const NO_COLOR = chartConfig.bettingNO.color

interface ChartDataPoint {
  blockTimestamp: number
  bettingYES: number
  bettingNO: number
}

interface ChartDataResponse {
  chartData: ChartDataPoint[]
  trendPercentage: number
  totalTransactions: number
}

// Function to format numbers in a readable way
function formatNumber(value: number): string {
  // Convert lamports to SOL (1 SOL = 1,000,000,000 lamports)
  const valueInSol = value / 1_000_000_000

  if (valueInSol >= 1000000) return `${(valueInSol / 1000000).toFixed(1)}M SOL`
  if (valueInSol >= 1000) return `${(valueInSol / 1000).toFixed(1)}K SOL`
  if (valueInSol >= 1) return `${valueInSol.toFixed(2)} SOL`
  if (valueInSol >= 0.001) return `${valueInSol.toFixed(3)} SOL`
  return `${valueInSol.toFixed(6)} SOL`
}

// Custom tooltip component
interface TooltipProps {
  active?: boolean
  payload?: Array<{
    value: number
    dataKey: string
    name: string
  }>
  label?: number
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    const yesValue = payload[0]?.value || 0
    const noValue = payload[1]?.value || 0
    const total = yesValue + noValue
    const yesPercentage = total > 0 ? Math.round((yesValue / total) * 100) : 0
    const noPercentage = 100 - yesPercentage

    return (
      <div className="bg-background border rounded-md shadow-lg p-3 text-xs">
        <p className="font-semibold mb-2">
          {label ? new Date(label * 1000).toLocaleDateString() : 'Unknown date'}
        </p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: YES_COLOR }}
              />
              <span>YES</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold">{formatNumber(yesValue)}</span>
              <span className="opacity-70">({yesPercentage}%)</span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: NO_COLOR }}
              />
              <span>NO</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold">{formatNumber(noValue)}</span>
              <span className="opacity-70">({noPercentage}%)</span>
            </div>
          </div>
          <div className="border-t mt-1 pt-1">
            <div className="flex items-center justify-between">
              <span>Total</span>
              <span className="font-semibold">{formatNumber(total)}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }
  return null
}

// Function to fetch chart data from API
async function fetchChartData(marketId: string): Promise<ChartDataResponse> {
  const response = await fetch(`/api/chart-data?marketId=${marketId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch chart data')
  }
  return response.json()
}

export function ChartYapping({
  chanceBetYES,
  chanceBetNO,
  marketPublicKey
}: {
  chanceBetYES: number
  chanceBetNO: number
  marketPublicKey: string
}) {
  const { data, isLoading, error } = useQuery<ChartDataResponse>({
    queryKey: ['chart-data', marketPublicKey],
    queryFn: () => fetchChartData(marketPublicKey),
    enabled: !!marketPublicKey,
    refetchOnWindowFocus: false,
    staleTime: 60000, // Data stays fresh for 1 minute
    retry: 1
  })

  // Format date for footer
  const getDateRange = () => {
    if (!data?.chartData || data.chartData.length < 2) return 'Recent activity'

    const chartData = data.chartData
    const oldest = new Date(chartData[0].blockTimestamp * 1000)
    const newest = new Date(
      chartData[chartData.length - 1].blockTimestamp * 1000
    )

    return `${oldest.toLocaleDateString()} - ${newest.toLocaleDateString()}`
  }

  // Display fallback data if there's an error
  const renderFallbackData = error
    ? [
        {
          blockTimestamp: Math.floor(Date.now() / 1000),
          bettingYES: chanceBetYES * 10,
          bettingNO: chanceBetNO * 10
        }
      ]
    : undefined

  return (
    <Card>
      <CardHeader>
        <section className="flex gap-5 items-center flex-wrap">
          <div className="border-r pr-5">
            <CardTitle>BET Accumulation</CardTitle>
            <CardDescription>Betting trends over time</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: YES_COLOR }}
            />
            <div>
              <p className="text-muted-foreground text-sm">YES Shares</p>
              <span className="font-bold" style={{ color: YES_COLOR }}>
                {chanceBetYES}%
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: NO_COLOR }}
            />
            <div>
              <p className="text-muted-foreground text-sm">NO Shares</p>
              <span className="font-bold" style={{ color: NO_COLOR }}>
                {chanceBetNO}%
              </span>
            </div>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Transactions</p>
            <span className="font-bold">{data?.totalTransactions || 0}</span>
          </div>
        </section>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center">
            <p>Loading chart data...</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig}>
            <AreaChart
              accessibilityLayer
              data={data?.chartData || renderFallbackData}
              margin={{
                left: 12,
                right: 12
              }}
            >
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.1)"
              />
              <XAxis
                dataKey="blockTimestamp"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) =>
                  new Date(value * 1000).toLocaleDateString()
                }
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => {
                  // Convert lamports to SOL (1 SOL = 1,000,000,000 lamports)
                  const valueInSol = value / 1_000_000_000

                  if (valueInSol >= 1000)
                    return `${(valueInSol / 1000).toFixed(1)}K SOL`
                  if (valueInSol >= 1) return `${valueInSol.toFixed(1)} SOL`
                  return `${valueInSol.toFixed(3)} SOL`
                }}
              />
              <ChartTooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
              <defs>
                <linearGradient id="fillBettingYES" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={YES_COLOR} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={YES_COLOR} stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="fillBettingNO" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={NO_COLOR} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={NO_COLOR} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <Area
                dataKey="bettingYES"
                type="monotone"
                fill="url(#fillBettingYES)"
                fillOpacity={0.6}
                stroke={YES_COLOR}
                strokeWidth={2}
                stackId="a"
              />
              <Area
                dataKey="bettingNO"
                type="monotone"
                fill="url(#fillBettingNO)"
                fillOpacity={0.6}
                stroke={NO_COLOR}
                strokeWidth={2}
                stackId="a"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 font-medium leading-none">
              {data?.trendPercentage !== undefined &&
                data.trendPercentage !== 0 && (
                  <>
                    {data.trendPercentage > 0 ? 'Trending up' : 'Trending down'}{' '}
                    by {Math.abs(data.trendPercentage)}%
                    <TrendingUp
                      className={`h-4 w-4 ${data.trendPercentage < 0 ? 'rotate-180' : ''}`}
                      style={{
                        color: data.trendPercentage > 0 ? YES_COLOR : NO_COLOR
                      }}
                    />
                  </>
                )}
              {(!data?.trendPercentage || data.trendPercentage === 0) &&
                'Market activity'}
            </div>
            <div className="flex items-center gap-2 leading-none text-muted-foreground">
              {getDateRange()}
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}
