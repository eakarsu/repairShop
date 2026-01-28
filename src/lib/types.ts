import { Prisma } from '@prisma/client'

export type CustomerWithDevices = Prisma.CustomerGetPayload<{
  include: { devices: true; tickets: true }
}>

export type TicketWithRelations = Prisma.RepairTicketGetPayload<{
  include: {
    customer: true
    device: true
    technician: true
    createdBy: true
    partsUsed: { include: { part: true } }
    statusHistory: true
    quotes: true
  }
}>

export type PartWithCategory = Prisma.PartGetPayload<{
  include: { category: true; vendor: true }
}>

export type OrderWithItems = Prisma.OrderGetPayload<{
  include: { vendor: true; items: { include: { part: true } } }
}>

export type QuoteWithItems = Prisma.QuoteGetPayload<{
  include: { customer: true; ticket: true; items: true; createdBy: true }
}>

export type SaleWithItems = Prisma.SaleGetPayload<{
  include: { customer: true; ticket: true; items: true; user: true }
}>

export interface DashboardStats {
  totalTickets: number
  openTickets: number
  completedToday: number
  revenue: number
  ticketsByStatus: { status: string; count: number }[]
  recentTickets: TicketWithRelations[]
  lowStockParts: PartWithCategory[]
}

export interface ReportData {
  period: string
  totalRevenue: number
  ticketCount: number
  averageTicketValue: number
  partsRevenue: number
  laborRevenue: number
  topServices: { name: string; count: number; revenue: number }[]
  topParts: { name: string; quantity: number; revenue: number }[]
  turnaroundTime: number
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}
