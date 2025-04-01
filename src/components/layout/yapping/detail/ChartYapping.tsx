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
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart'

const chartData = [
  {
    blockTimestamp: 1711965600, // 2025-04-01T10:00:00Z
    bettingYES: 120,
    bettingNO: 80
  },
  {
    blockTimestamp: 1711965900, // 2025-04-01T10:05:00Z
    bettingYES: 150,
    bettingNO: 100
  },
  {
    blockTimestamp: 1711966200, // 2025-04-01T10:10:00Z
    bettingYES: 180,
    bettingNO: 130
  },
  {
    blockTimestamp: 1711966500, // 2025-04-01T10:15:00Z
    bettingYES: 200,
    bettingNO: 150
  },
  {
    blockTimestamp: 1711966800, // 2025-04-01T10:20:00Z
    bettingYES: 220,
    bettingNO: 170
  },
  {
    blockTimestamp: 1711967100, // 2025-04-01T10:25:00Z
    bettingYES: 250,
    bettingNO: 190
  },
  {
    blockTimestamp: 1711967400, // 2025-04-01T10:30:00Z
    bettingYES: 270,
    bettingNO: 210
  },
  {
    blockTimestamp: 1711967700, // 2025-04-01T10:35:00Z
    bettingYES: 300,
    bettingNO: 230
  },
  {
    blockTimestamp: 1711968000, // 2025-04-01T10:40:00Z
    bettingYES: 320,
    bettingNO: 250
  },
  {
    blockTimestamp: 1711968300, // 2025-04-01T10:45:00Z
    bettingYES: 350,
    bettingNO: 270
  }
]

const chartConfig = {
  bettingYES: {
    label: 'Betting YES',
    color: 'hsl(var(--chart-1))'
  },
  bettingNO: {
    label: 'Betting NO',
    color: 'hsl(var(--chart-2))'
  }
} satisfies ChartConfig

export function ChartYapping({
  chanceBetYES,
  chanceBetNO
}: {
  chanceBetYES: number
  chanceBetNO: number
}) {
  return (
    <Card>
      <CardHeader>
        <section className="flex gap-5 items-center">
          <div className="border-r pr-5">
            <CardTitle>BET Accumulation</CardTitle>
            <CardDescription>Betting trends over time</CardDescription>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Chance Shares YES</p>
            <span className="font-bold">{chanceBetYES}%</span>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Chance Shares NO</p>
            <span className="font-bold">{chanceBetNO}%</span>
          </div>
        </section>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="blockTimestamp"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) =>
                new Date(value * 1000).toLocaleTimeString()
              }
            />
            <YAxis />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <defs>
              <linearGradient id="fillBettingYES" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-bettingYES)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-bettingYES)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillBettingNO" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-bettingNO)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-bettingNO)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <Area
              dataKey="bettingYES"
              type="natural"
              fill="url(#fillBettingYES)"
              fillOpacity={0.4}
              stroke="var(--color-bettingYES)"
              stackId="a"
            />
            <Area
              dataKey="bettingNO"
              type="natural"
              fill="url(#fillBettingNO)"
              fillOpacity={0.4}
              stroke="var(--color-bettingNO)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 font-medium leading-none">
              Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 leading-none text-muted-foreground">
              Data from April 2025
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}
