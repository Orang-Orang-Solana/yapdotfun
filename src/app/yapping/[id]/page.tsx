import { ChartYapping } from '@/components/layout/yapping/detail/ChartYapping'
import ChatYapping from '@/components/layout/yapping/detail/ChatYapping'
import InfoYapping from '@/components/layout/yapping/detail/InfoYapping'
import TradeYapping from '@/components/layout/yapping/detail/TradeYapping'

export default function page() {
  const chanceBetYES = 25
  const chanceBetNO = 75

  return (
    <main className="grid xl:grid-cols-3 gap-5 ">
      <section className="xl:col-span-2 space-y-5">
        <InfoYapping infoYapping={detailYapping} />
        <ChartYapping chanceBetYES={chanceBetYES} chanceBetNO={chanceBetNO} />
      </section>
      <section className="space-y-5 h-fit">
        <TradeYapping chanceBetYES={chanceBetYES} chanceBetNO={chanceBetNO} />
        <ChatYapping messages={messages} />
      </section>
    </main>
  )
}

const detailYapping = {
  image:
    'https://firebasestorage.googleapis.com/v0/b/jekydatabase.appspot.com/o/yapping%2FScreenshot%202025-03-24%20225938.png?alt=media&token=7d31b80f-d7f7-4c00-aeb2-8af44ffd5924',
  description: 'Will Ethereum price exceed $5000 by the end of 2025?',
  totalBet: '19 SOL',
  startBet: '1735689600',
  endBet: '1766908800',
  liquidity: '$2500'
}

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
