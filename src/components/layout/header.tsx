'use client'

import { addDays, format } from 'date-fns'
import { CalendarIcon, Plus } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'

import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

import { ClusterUiSelect } from '../cluster/cluster-ui'
import { WalletButton } from '../solana/solana-provider'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

const links: { label: string; path: string }[] = [
  { label: 'Yapping', path: '/yapping' },
  { label: 'Leaderbord', path: '/leaderboard' }
]

export default function Header() {
  const pathname = usePathname()
  const [date, setDate] = React.useState<Date>()
  const [image, setImage] = React.useState<File>()
  const [description, setDescription] = React.useState<string>('')

  async function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      setImage(file)
    }
  }
  // async function handleDescriptionChange(
  //   event: React.ChangeEvent<HTMLInputElement>
  // ) {
  //   const value = event.target.value
  //   setDescription(value)
  // }
  // async function handleDateChange(date: Date) {
  //   setDate(date)
  // }
  async function CreatePrediction() {
    if (!image || !description || !date) {
      toast.error('Please fill all fields')
      return
    }
    const formData = new FormData()
    formData.append('image', image)
    formData.append('description', description)
    formData.append('date', date.toString())
    toast.success('Prediction created', {
      description: 'Your prediction has been created successfully'
    })
    // const response = await fetch('/api/predictions', {
    //   method: 'POST',
    //   body: formData
    // })
    // if (response.ok) {
    //   toast.success('Prediction created')
    // } else {
    //   toast.error('Error creating prediction')
    // }
  }
  return (
    <header className="p-3 xl:px-20 2xl:px-40 grid grid-cols-2 items-center">
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
          <Dialog>
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
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'w-[240px] justify-start text-left font-normal',
                          !date && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon />
                        {date ? format(date, 'PPP') : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className="flex w-auto flex-col space-y-2 p-2"
                    >
                      <Select
                        onValueChange={(value) =>
                          setDate(addDays(new Date(), parseInt(value)))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          <SelectItem value="0">Today</SelectItem>
                          <SelectItem value="1">Tomorrow</SelectItem>
                          <SelectItem value="3">In 3 days</SelectItem>
                          <SelectItem value="7">In a week</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="rounded-md border">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
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
