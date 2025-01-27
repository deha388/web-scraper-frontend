"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon, Play, CircleStopIcon as Stop, RotateCcw } from "lucide-react"
import { cn, isAuthenticated, getAuthToken, removeAuthToken } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { API_CONFIG, OUR_BOATS } from "@/config/api"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

function DatePicker({ date, setDate }: { date: Date | undefined; setDate: (date: Date | undefined) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>Tarih seç</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
      </PopoverContent>
    </Popover>
  )
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = getAuthToken()
  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }

  const response = await fetch(url, { ...options, headers })
  if (!response.ok) {
    throw new Error("Network response was not ok")
  }
  return response.json()
}

interface Competitor {
  _id: string
  competitor_name: string
  yacht_ids: Record<string, string>
  search_text: string
  click_text: string
}

interface CompetitorYacht {
  name: string
  id: string
}

interface PriceData {
  tarih: string
  bizim_konum: string
  rakip_konum: string
  bizim_fiyat: number
  rakip_fiyat: number
  rakip_list_price: number
  discount_type: string
  discount_percentage: string
  commission_percentage: string
  commission: number
  fark: number
  durum: number
}

interface BotState {
  status: "running" | "stopped" | "unknown"
  lastRun: string | null
  nextRun: string | null
  date: Date | undefined
  selectedCompetitor: string | null
  selectedCompetitorBoatId: string | null
  selectedOurBoat: string | null
  priceData: PriceData[]
}

const initialBotState: BotState = {
  status: "unknown",
  lastRun: null,
  nextRun: null,
  date: undefined,
  selectedCompetitor: null,
  selectedCompetitorBoatId: null,
  selectedOurBoat: null,
  priceData: [],
}

function BotSection({ botName }: { botName: string }) {
  const [state, setState] = React.useState<BotState>(() => {
    if (typeof window !== "undefined") {
      const savedState = localStorage.getItem(`botState_${botName}`)
      return savedState ? JSON.parse(savedState) : initialBotState
    }
    return initialBotState
  })
  const [competitors, setCompetitors] = React.useState<Competitor[]>([])
  const [competitorYachts, setCompetitorYachts] = React.useState<CompetitorYacht[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const { toast } = useToast()

  React.useEffect(() => {
    fetchCompetitors()
    fetchBotStatus()
    const intervalId = setInterval(fetchBotStatus, 60000) // Check status every minute
    return () => clearInterval(intervalId)
  }, [])

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`botState_${botName}`, JSON.stringify(state))
    }
  }, [state, botName])

  const fetchCompetitors = async () => {
    try {
      const data = await fetchWithAuth(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.COMPETITORS}`)
      setCompetitors(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch competitors",
        variant: "destructive",
      })
    }
  }

  const fetchBotStatus = async () => {
    try {
      const data = await fetchWithAuth(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BOT_STATUS}`)
      setState((prev) => ({
        ...prev,
        status: data.status,
        lastRun: data.last_run,
        nextRun: data.next_run,
      }))
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch bot status",
        variant: "destructive",
      })
    }
  }

  const fetchCompetitorYachts = async (competitorName: string) => {
    try {
      const data = await fetchWithAuth(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.COMPETITOR_YACHTS}?competitor_name=${competitorName}`,
      )
      // Parse the yachts array from the response
      const yachts = data.yachts || []
      setCompetitorYachts(yachts)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch competitor yachts",
        variant: "destructive",
      })
      setCompetitorYachts([]) // Set to empty array on error
    }
  }

  const toggleBot = async () => {
    try {
      const action = state.status === "running" ? "stop" : "start"
      const data = await fetchWithAuth(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS[`BOT_${action.toUpperCase()}`]}`, {
        method: "POST",
      })
      setState((prev) => ({
        ...prev,
        status: data.status,
        lastRun: data.last_run,
        nextRun: data.next_run,
      }))
      toast({
        title: `Bot ${action === "start" ? "Started" : "Stopped"}`,
        description: data.message,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${state.status === "running" ? "stop" : "start"} bot`,
        variant: "destructive",
      })
    }
  }

  const fetchPriceData = async () => {
    if (!state.date || !state.selectedCompetitor || !state.selectedCompetitorBoatId || !state.selectedOurBoat) {
      toast({
        title: "Error",
        description: "Please select all required fields",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const formattedDate = format(state.date, "dd.MM.yyyy")
      const url = `${API_CONFIG.BASE_URL}/api/v1/prices/compare?date_str=${formattedDate}&competitor_name=${state.selectedCompetitor}&yacht_id=${state.selectedCompetitorBoatId}&yacht_id_sailamor=${state.selectedOurBoat}`
      const data = await fetchWithAuth(url)
      setState((prev) => ({ ...prev, priceData: data }))
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch price data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const resetSelections = () => {
    setState(initialBotState)
    setCompetitorYachts([])
    toast({
      title: "Reset",
      description: "All selections have been reset",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Bot Kontrolü</h2>
          <div className="flex items-center mt-2">
            <Badge variant={state.status === "running" ? "default" : "secondary"}>
              {state.status === "running" ? "Çalışıyor" : "Durdu"}
            </Badge>
            {state.lastRun && (
              <span className="text-sm text-muted-foreground ml-2">
                Son çalışma: {format(new Date(state.lastRun), "dd.MM.yyyy HH:mm")}
              </span>
            )}
          </div>
        </div>
        <Button variant={state.status === "running" ? "destructive" : "default"} onClick={toggleBot}>
          {state.status === "running" ? (
            <>
              <Stop className="mr-2 h-4 w-4" />
              {botName}'ı Durdur
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              {botName}'ı Başlat
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tarih</CardTitle>
          </CardHeader>
          <CardContent>
            <DatePicker date={state.date} setDate={(date) => setState((prev) => ({ ...prev, date }))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rakip Firma</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={state.selectedCompetitor || ""}
              onValueChange={(value) => {
                setState((prev) => ({ ...prev, selectedCompetitor: value, selectedCompetitorBoatId: null }))
                fetchCompetitorYachts(value)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Rakip firma seç" />
              </SelectTrigger>
              <SelectContent>
                {competitors.map((competitor) => (
                  <SelectItem key={competitor._id} value={competitor.competitor_name}>
                    {competitor.click_text}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rakip Tekne</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={state.selectedCompetitorBoatId || ""}
              onValueChange={(value) => setState((prev) => ({ ...prev, selectedCompetitorBoatId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Rakip tekne seç" />
              </SelectTrigger>
              <SelectContent>
                {competitorYachts.map((yacht) => (
                  <SelectItem key={yacht.id} value={yacht.id}>
                    {yacht.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bizim Tekne</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={state.selectedOurBoat || ""}
              onValueChange={(value) => setState((prev) => ({ ...prev, selectedOurBoat: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Bizim tekne seç" />
              </SelectTrigger>
              <SelectContent>
                {OUR_BOATS.map((boat) => (
                  <SelectItem key={boat.id} value={boat.id}>
                    {boat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between">
        <Button onClick={fetchPriceData} disabled={isLoading}>
          {isLoading ? "Yükleniyor..." : "Fiyatları Getir"}
        </Button>
        <Button variant="outline" onClick={resetSelections}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Sıfırla
        </Button>
      </div>

      <Card className="mt-6 overflow-hidden">
        <CardHeader>
          <CardTitle>Fiyat Karşılaştırması</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Bizim Konum</TableHead>
                  <TableHead>Rakip Konum</TableHead>
                  <TableHead className="text-right">Bizim Fiyat</TableHead>
                  <TableHead className="text-right">Rakip Fiyat</TableHead>
                  <TableHead className="text-right">Rakip Liste Fiyatı</TableHead>
                  <TableHead>İndirim Tipi</TableHead>
                  <TableHead>İndirim Yüzdesi</TableHead>
                  <TableHead>Komisyon Yüzdesi</TableHead>
                  <TableHead className="text-right">Komisyon</TableHead>
                  <TableHead className="text-right">Fark</TableHead>
                  <TableHead className="text-center">Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.priceData.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell>{item.tarih}</TableCell>
                    <TableCell>{item.bizim_konum}</TableCell>
                    <TableCell>{item.rakip_konum}</TableCell>
                    <TableCell className="text-right">{item.bizim_fiyat}</TableCell>
                    <TableCell className="text-right">{item.rakip_fiyat}</TableCell>
                    <TableCell className="text-right">{item.rakip_list_price}</TableCell>
                    <TableCell>{item.discount_type}</TableCell>
                    <TableCell>{item.discount_percentage}</TableCell>
                    <TableCell>{item.commission_percentage}</TableCell>
                    <TableCell className="text-right">{item.commission}</TableCell>
                    <TableCell className="text-right">{item.fark}</TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`inline-flex h-2 w-2 rounded-full ${
                          item.durum === 0 ? "bg-green-500" : item.durum === 1 ? "bg-red-500" : "bg-yellow-500"
                        }`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuth, setIsAuth] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const auth = isAuthenticated()
      setIsAuth(auth)
      if (!auth) {
        router.push("/login")
      }
      setIsLoading(false)
    }
    checkAuth()
  }, [router])

  const handleLogout = () => {
    removeAuthToken()
    router.push("/login")
  }

  if (isLoading) {
    return <div>Yükleniyor...</div>
  }

  if (!isAuth) {
    return null
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl sm:text-3xl font-bold">Fiyat Takip Sistemi</h1>
          <Button onClick={handleLogout} variant="outline">
            Çıkış Yap
          </Button>
        </div>

        <Tabs defaultValue="nausys" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="nausys">Nausys</TabsTrigger>
            <TabsTrigger value="mmk">MMK</TabsTrigger>
          </TabsList>
          <TabsContent value="nausys">
            <BotSection botName="Nausys" />
          </TabsContent>
          <TabsContent value="mmk">
            <BotSection botName="MMK" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

