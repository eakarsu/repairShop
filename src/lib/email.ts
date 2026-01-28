// Email simulation - in production, this would use a real email service like SendGrid, Mailgun, etc.

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

interface EmailResult {
  success: boolean
  messageId: string
  preview?: string
}

// Simulated email sending - logs to console and returns success
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Log the email for development/testing
  console.log('='.repeat(60))
  console.log('EMAIL SIMULATION')
  console.log('='.repeat(60))
  console.log(`To: ${options.to}`)
  console.log(`Subject: ${options.subject}`)
  console.log(`Message ID: ${messageId}`)
  console.log('-'.repeat(60))
  console.log('HTML Content:')
  console.log(options.html)
  console.log('='.repeat(60))

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100))

  return {
    success: true,
    messageId,
    preview: `Email logged to console (simulation mode)`
  }
}

export function generateQuoteApprovalEmail(
  customerName: string,
  quoteNumber: string,
  total: number,
  approvalLink: string,
  shopName: string,
  validUntil: Date
): { subject: string; html: string; text: string } {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(date)

  const subject = `Quote ${quoteNumber} Ready for Your Approval - ${shopName}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .footer { background: #f3f4f6; padding: 15px; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280; }
    .btn { display: inline-block; background: #2563eb; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 10px 0; }
    .btn:hover { background: #1d4ed8; }
    .total { font-size: 24px; font-weight: bold; color: #2563eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">${shopName}</h1>
      <p style="margin: 5px 0 0 0; opacity: 0.9;">Quote Approval Request</p>
    </div>
    <div class="content">
      <p>Hi ${customerName},</p>
      <p>Your repair quote is ready for review. Please review the details and let us know if you'd like to proceed.</p>

      <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0;"><strong>Quote Number:</strong> ${quoteNumber}</p>
        <p style="margin: 0 0 10px 0;"><strong>Total Amount:</strong> <span class="total">${formatCurrency(total)}</span></p>
        <p style="margin: 0;"><strong>Valid Until:</strong> ${formatDate(validUntil)}</p>
      </div>

      <p>Click the button below to view the full quote details and approve or decline:</p>

      <p style="text-align: center;">
        <a href="${approvalLink}" class="btn">Review & Approve Quote</a>
      </p>

      <p style="font-size: 14px; color: #6b7280;">
        Or copy and paste this link into your browser:<br>
        <a href="${approvalLink}" style="color: #2563eb;">${approvalLink}</a>
      </p>
    </div>
    <div class="footer">
      <p>This is an automated message from ${shopName}. If you have any questions, please contact us directly.</p>
      <p>This link will expire on ${formatDate(validUntil)}.</p>
    </div>
  </div>
</body>
</html>
  `

  const text = `
${shopName} - Quote Approval Request

Hi ${customerName},

Your repair quote is ready for review.

Quote Number: ${quoteNumber}
Total Amount: ${formatCurrency(total)}
Valid Until: ${formatDate(validUntil)}

Click the link below to review and approve or decline:
${approvalLink}

This link will expire on ${formatDate(validUntil)}.

If you have any questions, please contact us directly.
  `

  return { subject, html, text }
}
