import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getDamageAssessment } from '@/lib/ai'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { photoId, description, ticketId } = await request.json()

    if (!description) {
      return NextResponse.json(
        { success: false, error: 'Photo description is required' },
        { status: 400 }
      )
    }

    // Get device info if ticketId provided
    let deviceType = 'Unknown Device'
    let brand = 'Unknown'
    let model = 'Unknown'

    if (ticketId) {
      const ticket = await prisma.repairTicket.findUnique({
        where: { id: ticketId },
        include: { device: true }
      })
      if (ticket?.device) {
        deviceType = ticket.device.deviceType
        brand = ticket.device.brand || 'Unknown'
        model = ticket.device.model || 'Unknown'
      }
    }

    // Get AI damage assessment
    const result = await getDamageAssessment(
      deviceType,
      brand,
      model,
      description
    )

    // If photoId provided, update the photo record with AI analysis
    if (photoId) {
      await prisma.ticketPhoto.update({
        where: { id: photoId },
        data: {
          aiAnalysis: JSON.stringify(result)
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('AI Damage Assessment error:', error)
    const errorMessage = error instanceof Error ? error.message : 'AI service unavailable'
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}
