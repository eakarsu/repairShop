import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getRepairGuide } from '@/lib/ai'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { deviceType, brand, model, repairType } = await request.json()

    if (!deviceType || !repairType) {
      return NextResponse.json(
        { success: false, error: 'Device type and repair type are required' },
        { status: 400 }
      )
    }

    const result = await getRepairGuide(
      deviceType,
      brand || 'Unknown',
      model || 'Unknown',
      repairType
    )

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('AI Repair Guide error:', error)
    const errorMessage = error instanceof Error ? error.message : 'AI service unavailable'
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}
