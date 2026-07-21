import { NextRequest, NextResponse } from 'next/server'
import { answerCustomerQuestion } from '@/lib/ai'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const { question, ticketNumber } = await request.json()

    if (!question) {
      return NextResponse.json(
        { success: false, error: 'Question is required' },
        { status: 400 }
      )
    }

    let ticketInfo = undefined

    // If ticket number provided, get ticket details
    if (ticketNumber) {
      const ticket = await prisma.repairTicket.findUnique({
        where: { ticketNumber },
        include: { device: true },
      })

      if (ticket) {
        ticketInfo = {
          ticketNumber: ticket.ticketNumber,
          status: ticket.status,
          device: ticket.device
            ? `${ticket.device.brand || ''} ${ticket.device.model || ''}`.trim() || ticket.device.deviceType
            : 'Device',
          estimatedCompletion: ticket.estimatedCompletion?.toISOString(),
        }
      }
    }

    const response = await answerCustomerQuestion(question, ticketInfo)

    return NextResponse.json({ success: true, data: { response } })
  } catch (error) {
    console.error('AI Customer Service error:', error)
    const errorMessage = error instanceof Error ? error.message : 'AI service unavailable'
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}
