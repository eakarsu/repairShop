export const TICKET_TRANSITIONS: Record<string, readonly string[]> = Object.freeze({
  RECEIVED: ['DIAGNOSING', 'CANCELLED'],
  DIAGNOSING: ['WAITING_APPROVAL', 'IN_REPAIR', 'CANCELLED'],
  WAITING_APPROVAL: ['WAITING_PARTS', 'IN_REPAIR', 'CANCELLED'],
  WAITING_PARTS: ['IN_REPAIR', 'CANCELLED'],
  IN_REPAIR: ['WAITING_PARTS', 'QUALITY_CHECK', 'CANCELLED'],
  QUALITY_CHECK: ['IN_REPAIR', 'READY_PICKUP'],
  READY_PICKUP: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
})

export function canTransitionTicket(from: string, to: string): boolean {
  return from === to || (TICKET_TRANSITIONS[from] || []).includes(to)
}

export function assertTicketTransition(from: string, to: string): void {
  if (!canTransitionTicket(from, to)) throw new Error(`Invalid ticket transition: ${from} -> ${to}`)
}
