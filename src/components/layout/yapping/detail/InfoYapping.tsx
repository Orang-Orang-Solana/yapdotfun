import Image from 'next/image'

type infoYappingType = {
  image: string
  description: string
  totalBet: string
  startBet: string
  endBet: string
  liquidity: string
}

export default function InfoYapping({
  infoYapping
}: {
  infoYapping: infoYappingType
}) {
  return (
    <div className="flex items-center gap-5">
      <Image
        src={infoYapping.image}
        alt={infoYapping.description}
        width={100}
        height={100}
        priority={true}
      />
      <div className="space-y-5">
        <h1 className="xl:text-xl 2xl:text-2xl">{infoYapping.description}</h1>

        <div className="flex items-center gap-5">
          <div>
            <p className="text-muted-foreground text-sm">Total Bet</p>
            <h1 className="2xl:text-xl">{infoYapping.totalBet}</h1>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Total liquidity</p>
            <h1 className="2xl:text-xl">{infoYapping.liquidity}</h1>
          </div>
        </div>
      </div>
    </div>
  )
}
