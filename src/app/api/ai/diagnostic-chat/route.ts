import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getConversationalDiagnosis } from '@/lib/ai'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { ticketId, message, sessionId } = await request.json()

    if (!ticketId || !message) {
      return NextResponse.json(
        { success: false, error: 'Ticket ID and message are required' },
        { status: 400 }
      )
    }

    // Get ticket with device info
    const ticket = await prisma.repairTicket.findUnique({
      where: { id: ticketId },
      include: { device: true }
    })

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Get or create session
    let session = sessionId
      ? await prisma.aiDiagnosticSession.findUnique({
          where: { id: sessionId },
          include: { messages: { orderBy: { createdAt: 'asc' } } }
        })
      : null

    if (!session) {
      session = await prisma.aiDiagnosticSession.create({
        data: {
          ticketId,
        },
        include: { messages: true }
      })
    }

    // Convert stored messages to conversation history
    const conversationHistory = session.messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    }))

    // Get AI response
    const result = await getConversationalDiagnosis(
      ticket.device?.deviceType || 'Unknown Device',
      ticket.device?.brand || 'Unknown',
      ticket.device?.model || 'Unknown',
      conversationHistory,
      message
    )

    // Save user message and AI response
    await prisma.aiDiagnosticMessage.createMany({
      data: [
        { sessionId: session.id, role: 'user', content: message },
        { sessionId: session.id, role: 'assistant', content: result.response }
      ]
    })

    // Update session with current analysis
    await prisma.aiDiagnosticSession.update({
      where: { id: session.id },
      data: {
        suggestedIssues: JSON.stringify(result.possibleIssues),
        suggestedTests: JSON.stringify(result.suggestedTests),
        confidence: result.confidence / 100 // Convert to 0-1 scale
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.id,
        response: result.response,
        suggestedQuestions: result.suggestedQuestions,
        possibleIssues: result.possibleIssues,
        suggestedTests: result.suggestedTests,
        confidence: result.confidence,
        needsMoreInfo: result.needsMoreInfo
      }
    })
  } catch (error) {
    console.error('AI Diagnostic Chat error:', error)
    const errorMessage = error instanceof Error ? error.message : 'AI service unavailable'
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}

// GET - Retrieve session history
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const ticketId = searchParams.get('ticketId')
    const sessionId = searchParams.get('sessionId')

    if (sessionId) {
      const session = await prisma.aiDiagnosticSession.findUnique({
        where: { id: sessionId },
        include: { messages: { orderBy: { createdAt: 'asc' } } }
      })
      return NextResponse.json({ success: true, data: session })
    }

    if (ticketId) {
      const sessions = await prisma.aiDiagnosticSession.findMany({
        where: { ticketId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
        orderBy: { createdAt: 'desc' }
      })
      return NextResponse.json({ success: true, data: sessions })
    }

    return NextResponse.json(
      { success: false, error: 'ticketId or sessionId required' },
      { status: 400 }
    )
  } catch (error) {
    console.error('AI Diagnostic Chat GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch sessions' }, { status: 500 })
  }
}
