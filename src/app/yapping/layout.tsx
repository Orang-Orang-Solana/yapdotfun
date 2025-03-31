import React from 'react'

export default function layout({ children }: { children: React.ReactNode }) {
  return <main className="xl:px-20 2xl:px-40 xl:py-10">{children}</main>
}
