interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

interface EmailResult {
  success: boolean
  messageId: string
}

export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const endpoint = process.env.EMAIL_WEBHOOK_URL
  const token = process.env.EMAIL_WEBHOOK_TOKEN
  if (!endpoint || !token) throw new Error('Email provider is not configured')
  const url = new URL(endpoint)
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('EMAIL_WEBHOOK_URL must be credential-free HTTPS')

  const response = await fetch(url, {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(5000),
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(options),
  })
  if (!response.ok) throw new Error(`Email provider returned HTTP ${response.status}`)
  const data = await response.json().catch(() => ({})) as { id?: unknown }
  return { success: true, messageId: String(data.id || '') }
}

export function generateQuoteApprovalEmail(customerName: string, quoteNumber: string, total: number, approvalLink: string, shopName: string, validUntil: Date) {
  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(total)
  const date = new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(validUntil)
  const subject = `Quote ${quoteNumber} Ready for Your Approval - ${shopName}`
  const text = `${customerName}, review quote ${quoteNumber} for ${money}, valid until ${date}: ${approvalLink}`
  const html = `<p>Hi ${customerName},</p><p>Review quote <strong>${quoteNumber}</strong> for <strong>${money}</strong>, valid until ${date}.</p><p><a href="${approvalLink}">Review quote</a></p>`
  return { subject, html, text }
}

export function generatePasswordResetEmail(firstName: string, resetLink: string) {
  return { subject: 'Password Reset Request - RepairShop Pro', html: `<p>Hi ${firstName},</p><p><a href="${resetLink}">Reset your password</a>. This link expires in one hour.</p>` }
}

export function generateVerificationEmail(firstName: string, verifyLink: string) {
  return { subject: 'Verify Your Email - RepairShop Pro', html: `<p>Hi ${firstName},</p><p><a href="${verifyLink}">Verify your email</a>.</p>` }
}
