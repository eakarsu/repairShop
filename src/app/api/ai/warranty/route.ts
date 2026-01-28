import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { checkWarranty } from '@/lib/ai'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { brand, model, purchaseDate, serialNumber } = await request.json()

    if (!brand || !model) {
      return NextResponse.json(
        { success: false, error: 'Brand and model are required' },
        { status: 400 }
      )
    }

    const result = await checkWarranty(brand, model, purchaseDate, serialNumber)

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('AI Warranty Check error:', error)
    const errorMessage = error instanceof Error ? error.message : 'AI service unavailable'
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}
