'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { ClusterUiSelect } from '../cluster/cluster-ui'
import { WalletButton } from '../solana/solana-provider'

const links: { label: string; path: string }[] = [
  { label: 'Yapping', path: '/yapping' },
  { label: 'Leaderbord', path: '/leaderboard' }
]

export default function Header() {
  const pathname = usePathname()

  return (
    <header className="p-3 xl:px-20 grid grid-cols-2 items-center bg-seoondary">
      <section className="flex items-center gap-10">
        <Link href={'/'}>
          <h1 className="font-bold uppercase">YapDotFun</h1>
        </Link>
        <ul className="flex items-center gap-5">
          {links.map(({ label, path }) => (
            <li key={path}>
              <Link
                className={
                  pathname.startsWith(path)
                    ? ''
                    : 'text-muted-foreground hover:text-primary duration-300'
                }
                href={path}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <div className="flex items-center gap-5 place-content-end">
        <ClusterUiSelect />
        <WalletButton />
      </div>
    </header>
  )
}
