'use client'

import { Plus } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { useYappingMarketActions } from '@/hooks/use-yapping-market-actions'
import { AnchorError, BN } from '@coral-xyz/anchor'
import { SendTransactionError } from '@solana/web3.js'

import { ClusterUiSelect } from '../cluster/cluster-ui'
import { WalletButton } from '../solana/solana-provider'
import { Button } from '../ui/button'
import { Calendar } from '../ui/calendar'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { useTransactionToast } from '../ui/ui-layout'

const links: { label: string; path: string }[] = [
  { label: 'Yapping', path: '/yapping' },
  { label: 'Leaderbord', path: '/leaderboard' }
]

export default function Header() {
  const pathname = usePathname()
  const [date, setDate] = React.useState<Date>()
  const [image, setImage] = React.useState<File>()
  const [description, setDescription] = React.useState<string>('')
  const [open, setOpen] = React.useState<boolean>(false)
  const { initializeMarket } = useYappingMarketActions()
  const transactionToast = useTransactionToast()
  const [uploading, setUploading] = React.useState<boolean>(false)

  async function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      setImage(file)
    }
  }

  async function uploadFile(file: File) {
    try {
      if (!file) {
        alert('No file selected')
        return
      }

      setUploading(true)
      const data = new FormData()
      data.set('file', file)
      const uploadRequest = await fetch('/api/files', {
        method: 'POST',
        body: data
      })
      const signedUrl = await uploadRequest.json()
      setUploading(false)
      return signedUrl
    } catch (e) {
      console.log(e)
      setUploading(false)
      alert('Trouble uploading file')
    }
  }

  async function CreatePrediction() {
    if (!image || !description || !date) {
      toast.error('Please fill all fields')
      return
    }

    let url = ''

    try {
      url = await uploadFile(image)
      console.log(url, 'url')
    } catch (error) {
      console.log(error)
      toast.error('Failed to upload file, please try again')
      return
    }

    try {
      const signature = await initializeMarket({
        description,
        imageUrl: url,
        endTime: new BN(date.getTime() / 1000)
      })

      toast.success('Prediction created', {
        description: 'Your prediction has been created successfully'
      })

      transactionToast(signature)

      setOpen(false)
      setDescription('')
      setImage(undefined)
      setDate(undefined)
    } catch (error: unknown) {
      console.error(error)
      if (error instanceof AnchorError) {
        toast.error('Failed to create prediction', {
          description: error.error.errorMessage || error.message
        })
        return
      }
      if (error instanceof SendTransactionError) {
        toast.error('Transaction failed', {
          description:
            'There was a problem sending the transaction. Please try again.'
        })
        return
      }
      if (typeof error === 'object' && error !== null && 'message' in error) {
        toast.error('Unknown error', {
          description:
            (error as { message?: string }).message ||
            'An unknown error occurred.'
        })
        return
      }
      toast.error('Unknown error', {
        description: 'An unknown error occurred.'
      })
    }
  }

  return (
    <header className="p-3 xl:px-20 2xl:px-40 grid grid-cols-2 items-center">
      <section className="flex items-center gap-10">
        <Link href={'/'}>
          <h1 className="font-bold uppercase">YAPPING</h1>
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
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant={'outline'}>
                <Plus />
                Create
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create your Yapping Prediction</DialogTitle>
                <DialogDescription>
                  Create a new prediction yapping and start yapping.
                </DialogDescription>
              </DialogHeader>
              <section className="space-y-5">
                <div className="space-y-1">
                  <Label>Image</Label>
                  <Input
                    type="file"
                    onChange={handleImageChange}
                    accept="image/*"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Description</Label>
                  <Input
                    type="text"
                    placeholder="Will Ethereum price exceed $5000 by the end of 2025?"
                    onChange={(e) => setDescription(e.target.value)}
                    value={description}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>End Prediction</Label>
                  <div className="border rounded-md p-1">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(selectedDate) => {
                        if (selectedDate) {
                          setDate(selectedDate)
                        }
                      }}
                      className="w-full"
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </div>
                </div>
              </section>
              <section className="flex justify-end">
                <Button
                  size={'lg'}
                  onClick={CreatePrediction}
                  disabled={!image || !description || !date}
                >
                  Create
                </Button>
              </section>
            </DialogContent>
          </Dialog>
        </ul>
      </section>
      <div className="hidden xl:flex items-center gap-5 place-content-end">
        <ClusterUiSelect />
        <WalletButton />
      </div>
    </header>
  )
}
