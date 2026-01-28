import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getDiagnosticAssistance } from '@/lib/ai'

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

    const result = await getDiagnosticAssistance(
      deviceType,
      brand || 'Unknown',
      model || 'Unknown',
      issueDescription
    )

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('AI Diagnostic error:', error)
    const errorMessage = error instanceof Error ? error.message : 'AI service unavailable'
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}
