import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getPartsRecommendation } from '@/lib/ai'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { deviceType, brand, model, issueDescription } = await request.json()

    if (!deviceType || !issueDescription) {
      return NextResponse.json(
        { success: false, error: 'Device type and issue description are required' },
        { status: 400 }
      )
    }

    // Get AI recommendations
    const aiRecommendation = await getPartsRecommendation(
      deviceType,
      brand || 'Unknown',
      model || 'Unknown',
      issueDescription
    )

    // Search inventory for matching parts
    const searchTerms = aiRecommendation.parts.map(p => p.name.toLowerCase())
    const inventoryParts = await prisma.part.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: brand || '', mode: 'insensitive' } },
          { name: { contains: model || '', mode: 'insensitive' } },
          { compatibleWith: { hasSome: [brand || '', model || ''].filter(Boolean) } },
        ],
      },
      include: { category: true, vendor: true },
      take: 10,
    })

    return NextResponse.json({
      success: true,
      data: {
        aiRecommendation,
        inventoryParts,
      },
    })
  } catch (error) {
    console.error('AI Parts Finder error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
