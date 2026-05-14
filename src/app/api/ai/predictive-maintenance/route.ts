import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getPredictiveMaintenance } from '@/lib/ai'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/ai/predictive-maintenance
 *
 * Body either:
 *   { deviceId: string }                   → look up device + history from DB
 * OR
 *   { deviceType, brand, model, ageMonths, pastTicketCount?, pastIssues? }
 *                                           → ad-hoc prediction
 *
 * Implements audit batch_11.md §repairShop recommendation #6
 * ("Predictive Maintenance Recommendations").
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))

    let deviceType: string | undefined = body.deviceType
    let brand: string | undefined = body.brand
    let model: string | undefined = body.model
    let ageMonths: number = typeof body.ageMonths === 'number' ? body.ageMonths : 0
    let pastTicketCount: number =
      typeof body.pastTicketCount === 'number' ? body.pastTicketCount : 0
    let pastIssues: string[] = Array.isArray(body.pastIssues) ? body.pastIssues : []

    // If deviceId is provided, hydrate from DB
    if (body.deviceId) {
      const device = await prisma.device.findUnique({
        where: { id: body.deviceId },
        include: {
          tickets: {
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: { issueDescription: true, createdAt: true },
          },
        },
      })

      if (!device) {
        return NextResponse.json(
          { success: false, error: 'Device not found' },
          { status: 404 }
        )
      }

      deviceType = device.deviceType
      brand = device.brand || 'Unknown'
      model = device.model || 'Unknown'

      // Device model has no purchaseDate; use createdAt as a coarse proxy
      // unless caller provided ageMonths explicitly.
      if (typeof body.ageMonths !== 'number') {
        const ms = Date.now() - new Date(device.createdAt).getTime()
        ageMonths = Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24 * 30)))
      }

      pastTicketCount = device.tickets.length
      pastIssues = device.tickets.map((t) => t.issueDescription).filter(Boolean)
    }

    if (!deviceType) {
      return NextResponse.json(
        { success: false, error: 'deviceType (or deviceId) is required' },
        { status: 400 }
      )
    }

    const result = await getPredictiveMaintenance(
      deviceType,
      brand || 'Unknown',
      model || 'Unknown',
      ageMonths,
      pastTicketCount,
      pastIssues
    )

    return NextResponse.json({
      success: true,
      data: result,
      context: {
        deviceType,
        brand,
        model,
        ageMonths,
        pastTicketCount,
      },
    })
  } catch (error) {
    console.error('AI Predictive Maintenance error:', error)
    const errorMessage = error instanceof Error ? error.message : 'AI service unavailable'
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}
