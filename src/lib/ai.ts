interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface OpenRouterResponse {
  choices?: {
    message: {
      content: string
    }
  }[]
  error?: {
    message: string
    code: string
  }
}

async function callOpenRouter(messages: OpenRouterMessage[]): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-haiku'

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured. Check your .env file.')
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'RepairShop Pro',
    },
    body: JSON.stringify({
      model: model,
      messages,
      max_tokens: 2000,
    }),
  })

  const data: OpenRouterResponse = await response.json()

  if (!response.ok) {
    console.error('OpenRouter API error:', response.status, data)
    throw new Error(data.error?.message || `OpenRouter API error: ${response.status}`)
  }

  if (data.error) {
    console.error('OpenRouter returned error:', data.error)
    throw new Error(data.error.message)
  }

  const content = data.choices?.[0]?.message?.content || ''
  return content
}

function extractJSON(text: string): string {
  // Try to find JSON in the response (it might be wrapped in markdown code blocks)
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    return jsonMatch[1].trim()
  }

  // Try to find raw JSON object or array
  const objectMatch = text.match(/\{[\s\S]*\}/)
  if (objectMatch) {
    let jsonStr = objectMatch[0]
    // Clean up common issues
    jsonStr = jsonStr.replace(/,\s*}/g, '}')  // Remove trailing commas before }
    jsonStr = jsonStr.replace(/,\s*]/g, ']')  // Remove trailing commas before ]
    return jsonStr
  }

  return text
}

function safeJSONParse<T>(text: string, fallback: T): T {
  try {
    const jsonStr = extractJSON(text)
    return JSON.parse(jsonStr) as T
  } catch (error) {
    console.error('JSON parse error, using fallback:', error)
    return fallback
  }
}

export interface DiagnosticResult {
  possibleIssues: string[]
  suggestedTests: string[]
  estimatedDifficulty: 'Easy' | 'Medium' | 'Hard'
  estimatedTime: string
  recommendedParts: string[]
  notes: string
}

export interface QuoteEstimate {
  laborCost: number
  estimatedPartsCost: number
  totalEstimate: number
  timeEstimate: string
  confidence: 'Low' | 'Medium' | 'High'
  notes: string
}

export interface PartsRecommendation {
  parts: {
    name: string
    category: string
    estimatedPrice: number
    compatibility: string
    notes: string
  }[]
  alternativeOptions: string[]
}

export interface RepairGuide {
  steps: {
    stepNumber: number
    title: string
    description: string
    warnings: string[]
    tips: string[]
  }[]
  toolsRequired: string[]
  estimatedTime: string
  difficultyLevel: 'Beginner' | 'Intermediate' | 'Advanced'
}

export async function getDiagnosticAssistance(
  deviceType: string,
  brand: string,
  model: string,
  issueDescription: string
): Promise<DiagnosticResult> {
  try {
    const content = await callOpenRouter([
      {
        role: 'system',
        content: `You are an expert repair technician specializing in electronics, phones, laptops, tablets, and general repairs including shoes and accessories. Provide diagnostic assistance based on the device and issue description. Respond with ONLY valid JSON, no explanation or markdown.`,
      },
      {
        role: 'user',
        content: `Device: ${deviceType} - ${brand} ${model}
Issue: ${issueDescription}

Analyze and respond with this exact JSON structure:
{"possibleIssues":["issue1","issue2"],"suggestedTests":["test1","test2"],"estimatedDifficulty":"Easy|Medium|Hard","estimatedTime":"time estimate","recommendedParts":["part1","part2"],"notes":"notes"}`,
      },
    ])

    const jsonStr = extractJSON(content)
    return JSON.parse(jsonStr) as DiagnosticResult
  } catch (error) {
    console.error('AI Diagnostic error:', error)
    throw error // Re-throw to let calling code handle it
  }
}

export async function getQuoteEstimate(
  deviceType: string,
  brand: string,
  model: string,
  issueDescription: string,
  diagnosticNotes?: string
): Promise<QuoteEstimate> {
  try {
    const content = await callOpenRouter([
      {
        role: 'system',
        content: `You are an expert at estimating repair costs for electronics and general repair shops. Base your estimates on typical US market rates. Respond with ONLY valid JSON, no explanation or markdown.`,
      },
      {
        role: 'user',
        content: `Device: ${deviceType} - ${brand} ${model}
Issue: ${issueDescription}
${diagnosticNotes ? `Diagnostic Notes: ${diagnosticNotes}` : ''}

Respond with this exact JSON structure:
{"laborCost":50,"estimatedPartsCost":100,"totalEstimate":150,"timeEstimate":"1-2 hours","confidence":"Medium","notes":"explanation"}`,
      },
    ])

    const jsonStr = extractJSON(content)
    return JSON.parse(jsonStr) as QuoteEstimate
  } catch (error) {
    console.error('AI Quote error:', error)
    throw error
  }
}

export async function getPartsRecommendation(
  deviceType: string,
  brand: string,
  model: string,
  issueDescription: string
): Promise<PartsRecommendation> {
  try {
    const content = await callOpenRouter([
      {
        role: 'system',
        content: `You are an expert at identifying compatible replacement parts for repairs. Recommend specific parts based on the device and issue. Respond with ONLY valid JSON, no explanation or markdown.`,
      },
      {
        role: 'user',
        content: `Device: ${deviceType} - ${brand} ${model}
Issue: ${issueDescription}

Respond with this exact JSON structure:
{"parts":[{"name":"part name","category":"category","estimatedPrice":50,"compatibility":"compatible with model X","notes":"notes"}],"alternativeOptions":["option1","option2"]}`,
      },
    ])

    const jsonStr = extractJSON(content)
    return JSON.parse(jsonStr) as PartsRecommendation
  } catch (error) {
    console.error('AI Parts error:', error)
    throw error
  }
}

export async function getRepairGuide(
  deviceType: string,
  brand: string,
  model: string,
  repairType: string
): Promise<RepairGuide> {
  const fallbackGuide: RepairGuide = {
    steps: [
      { stepNumber: 1, title: 'Prepare workspace', description: 'Gather all necessary tools and ensure a clean, well-lit workspace.', warnings: ['Power off device before starting'], tips: ['Use an anti-static mat'] },
      { stepNumber: 2, title: 'Disassemble device', description: 'Carefully remove the outer casing following manufacturer guidelines.', warnings: ['Keep track of all screws'], tips: ['Take photos during disassembly'] },
      { stepNumber: 3, title: 'Perform repair', description: `Complete the ${repairType} following standard procedures.`, warnings: ['Handle components carefully'], tips: ['Work slowly and methodically'] },
      { stepNumber: 4, title: 'Reassemble and test', description: 'Reassemble the device and verify the repair was successful.', warnings: ['Ensure all connections are secure'], tips: ['Test all functions before returning to customer'] },
    ],
    toolsRequired: ['Screwdriver set', 'Spudger', 'Tweezers', 'Anti-static mat'],
    estimatedTime: '1-2 hours',
    difficultyLevel: 'Intermediate',
  }

  try {
    const content = await callOpenRouter([
      {
        role: 'system',
        content: `You are a repair technician. Provide a brief repair guide with 3-5 steps. Output ONLY valid JSON.`,
      },
      {
        role: 'user',
        content: `Device: ${deviceType} ${brand} ${model}
Repair: ${repairType}

Return JSON: {"steps":[{"stepNumber":1,"title":"title","description":"desc","warnings":[],"tips":[]}],"toolsRequired":["tool1"],"estimatedTime":"1h","difficultyLevel":"Intermediate"}`,
      },
    ])

    return safeJSONParse<RepairGuide>(content, fallbackGuide)
  } catch (error) {
    console.error('AI Guide error:', error)
    return fallbackGuide
  }
}

export async function checkWarranty(
  brand: string,
  model: string,
  purchaseDate?: string,
  serialNumber?: string
): Promise<{ status: string; message: string; details: string }> {
  try {
    const content = await callOpenRouter([
      {
        role: 'system',
        content: `You are a warranty verification assistant. Based on general warranty policies for different brands, provide warranty status estimates. Respond with ONLY valid JSON, no explanation or markdown.`,
      },
      {
        role: 'user',
        content: `Brand: ${brand}
Model: ${model}
${purchaseDate ? `Purchase Date: ${purchaseDate}` : ''}
${serialNumber ? `Serial Number: ${serialNumber}` : ''}

Respond with this exact JSON structure:
{"status":"VALID|EXPIRED|UNKNOWN","message":"brief status message","details":"detailed warranty information"}`,
      },
    ])

    const jsonStr = extractJSON(content)
    return JSON.parse(jsonStr)
  } catch (error) {
    console.error('AI Warranty error:', error)
    throw error
  }
}

export async function generateStatusMessage(
  customerName: string,
  ticketNumber: string,
  status: string,
  deviceInfo: string,
  additionalNotes?: string
): Promise<{ sms: string; email: { subject: string; body: string } }> {
  try {
    const content = await callOpenRouter([
      {
        role: 'system',
        content: `You are a customer service assistant for a repair shop. Generate professional and friendly status update messages. Respond with ONLY valid JSON, no explanation or markdown.`,
      },
      {
        role: 'user',
        content: `Customer: ${customerName}
Ticket: ${ticketNumber}
Status: ${status}
Device: ${deviceInfo}
${additionalNotes ? `Notes: ${additionalNotes}` : ''}

Respond with this exact JSON structure:
{"sms":"brief SMS message (max 160 chars)","email":{"subject":"email subject","body":"full email body"}}`,
      },
    ])

    const jsonStr = extractJSON(content)
    return JSON.parse(jsonStr)
  } catch (error) {
    console.error('AI Message error:', error)
    throw error
  }
}

export async function answerCustomerQuestion(
  question: string,
  ticketInfo?: { ticketNumber: string; status: string; device: string; estimatedCompletion?: string }
): Promise<string> {
  try {
    const content = await callOpenRouter([
      {
        role: 'system',
        content: `You are a helpful customer service bot for a repair shop called TechFix Pro. Answer questions politely and professionally. If you don't have enough information, suggest contacting the shop directly.`,
      },
      {
        role: 'user',
        content: `Customer Question: ${question}
${ticketInfo ? `
Ticket Info:
- Ticket Number: ${ticketInfo.ticketNumber}
- Status: ${ticketInfo.status}
- Device: ${ticketInfo.device}
${ticketInfo.estimatedCompletion ? `- Estimated Completion: ${ticketInfo.estimatedCompletion}` : ''}
` : 'No ticket information available.'}

Provide a helpful response.`,
      },
    ])

    return content || 'I apologize, but I am unable to assist at the moment. Please contact our shop directly.'
  } catch (error) {
    console.error('AI Customer Service error:', error)
    throw error
  }
}

// Timeline Estimation
export interface TimelineEstimate {
  estimatedStartDate: string
  estimatedCompletionDate: string
  estimatedDurationMinutes: number
  milestones: {
    name: string
    estimatedDate: string
    description: string
  }[]
  complexityScore: number // 1-10
  factors: {
    factor: string
    impact: 'positive' | 'negative' | 'neutral'
    description: string
  }[]
  confidence: 'Low' | 'Medium' | 'High'
  notes: string
}

export async function getTimelineEstimate(
  deviceType: string,
  brand: string,
  model: string,
  issueDescription: string,
  priority: string,
  queueSize: number,
  partsAvailable: boolean,
  technicianWorkload: number // number of active tickets
): Promise<TimelineEstimate> {
  try {
    const today = new Date().toISOString().split('T')[0]
    const content = await callOpenRouter([
      {
        role: 'system',
        content: `You are an expert at estimating repair timelines for a repair shop. Consider all factors including queue size, parts availability, complexity, and technician workload. Provide realistic estimates. Today's date is ${today}. Respond with ONLY valid JSON, no explanation or markdown.`,
      },
      {
        role: 'user',
        content: `Device: ${deviceType} - ${brand} ${model}
Issue: ${issueDescription}
Priority: ${priority}
Current Queue Size: ${queueSize} tickets
Parts Available: ${partsAvailable ? 'Yes' : 'No - need to order'}
Technician Active Tickets: ${technicianWorkload}

Estimate the repair timeline. Respond with this exact JSON structure:
{"estimatedStartDate":"YYYY-MM-DD","estimatedCompletionDate":"YYYY-MM-DD","estimatedDurationMinutes":120,"milestones":[{"name":"Diagnosis Complete","estimatedDate":"YYYY-MM-DD","description":"Initial assessment finished"}],"complexityScore":5,"factors":[{"factor":"Parts availability","impact":"positive","description":"All parts in stock"}],"confidence":"Medium","notes":"Additional notes"}`,
      },
    ])

    const jsonStr = extractJSON(content)
    return JSON.parse(jsonStr) as TimelineEstimate
  } catch (error) {
    console.error('AI Timeline error:', error)
    throw error
  }
}

// Conversational Diagnosis (Multi-turn)
export interface ConversationalDiagnosisResponse {
  response: string
  suggestedQuestions: string[]
  possibleIssues: string[]
  suggestedTests: string[]
  confidence: number // 0-100
  needsMoreInfo: boolean
}

export async function getConversationalDiagnosis(
  deviceType: string,
  brand: string,
  model: string,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[],
  newMessage: string
): Promise<ConversationalDiagnosisResponse> {
  try {
    const messages: OpenRouterMessage[] = [
      {
        role: 'system',
        content: `You are an expert repair technician assistant helping diagnose device issues through conversation. Ask clarifying questions to narrow down the problem. Build on previous conversation context. Be helpful and thorough. Respond with ONLY valid JSON, no explanation or markdown.`,
      },
    ]

    // Add conversation history
    for (const msg of conversationHistory) {
      messages.push({
        role: msg.role,
        content: msg.content,
      })
    }

    // Add the new message with context
    messages.push({
      role: 'user',
      content: `Device Context: ${deviceType} - ${brand} ${model}

User Message: ${newMessage}

Respond with this exact JSON structure:
{"response":"your conversational response","suggestedQuestions":["follow-up question 1"],"possibleIssues":["issue1"],"suggestedTests":["test1"],"confidence":50,"needsMoreInfo":true}`,
    })

    const content = await callOpenRouter(messages)
    const jsonStr = extractJSON(content)
    return JSON.parse(jsonStr) as ConversationalDiagnosisResponse
  } catch (error) {
    console.error('AI Conversational Diagnosis error:', error)
    throw error
  }
}

// Damage Assessment from Photo Description
export interface DamageAssessmentResult {
  damageType: string
  severity: 'Minor' | 'Moderate' | 'Severe'
  description: string
  affectedComponents: string[]
  repairRecommendations: string[]
  estimatedRepairCost: {
    min: number
    max: number
  }
  urgency: 'Low' | 'Medium' | 'High'
  notes: string
}

export async function getDamageAssessment(
  deviceType: string,
  brand: string,
  model: string,
  photoDescription: string // User-provided description of what's in the photo
): Promise<DamageAssessmentResult> {
  const fallback: DamageAssessmentResult = {
    damageType: 'Physical Damage',
    severity: 'Moderate',
    description: `Damage observed on ${brand} ${model} ${deviceType}: ${photoDescription}`,
    affectedComponents: ['Unknown - requires physical inspection'],
    repairRecommendations: ['Professional inspection recommended', 'Assess full extent of damage'],
    estimatedRepairCost: { min: 50, max: 300 },
    urgency: 'Medium',
    notes: 'This is an automated assessment. Please verify with physical inspection.'
  }

  try {
    const content = await callOpenRouter([
      {
        role: 'system',
        content: `You are a repair technician analyzing damage. Respond with ONLY valid JSON.`,
      },
      {
        role: 'user',
        content: `Device: ${deviceType} ${brand} ${model}
Damage: ${photoDescription}

Return JSON: {"damageType":"type","severity":"Low|Moderate|Severe","description":"desc","affectedComponents":["comp1"],"repairRecommendations":["rec1"],"estimatedRepairCost":{"min":50,"max":150},"urgency":"Medium","notes":"notes"}`,
      },
    ])

    return safeJSONParse<DamageAssessmentResult>(content, fallback)
  } catch (error) {
    console.error('AI Damage Assessment error:', error)
    return fallback
  }
}

// Predictive Maintenance Recommendations
// Implements audit batch_11 §repairShop suggestion #6.
export interface PredictiveMaintenanceResult {
  riskLevel: 'Low' | 'Medium' | 'High'
  expectedFailureWindow: string // e.g. "3-6 months", "12+ months"
  preventiveActions: {
    action: string
    rationale: string
    estimatedCost: number
    priority: 'Low' | 'Medium' | 'High'
  }[]
  partsToWatch: string[]
  diagnosticChecksRecommended: string[]
  notes: string
}

export async function getPredictiveMaintenance(
  deviceType: string,
  brand: string,
  model: string,
  ageMonths: number,
  pastTicketCount: number,
  pastIssueSummaries: string[]
): Promise<PredictiveMaintenanceResult> {
  const fallback: PredictiveMaintenanceResult = {
    riskLevel: 'Medium',
    expectedFailureWindow: 'Unknown — insufficient signal',
    preventiveActions: [
      {
        action: 'General inspection and cleaning',
        rationale: 'Routine preventive maintenance for any device of this age',
        estimatedCost: 30,
        priority: 'Medium',
      },
    ],
    partsToWatch: ['Battery', 'Cooling fans', 'Connectors'],
    diagnosticChecksRecommended: ['Run vendor diagnostic suite', 'Visual inspection'],
    notes: 'Automated fallback — verify with hands-on inspection.',
  }

  try {
    const issuesBlock = pastIssueSummaries.length > 0
      ? pastIssueSummaries.map((s, i) => `${i + 1}. ${s}`).join('\n')
      : '(no prior tickets recorded)'

    const content = await callOpenRouter([
      {
        role: 'system',
        content: `You are an expert repair technician assessing predictive maintenance needs based on device age and prior repair history. Respond with ONLY valid JSON.`,
      },
      {
        role: 'user',
        content: `Device: ${deviceType} ${brand} ${model}
Age: ${ageMonths} months
Number of prior repair tickets: ${pastTicketCount}
Past issues:
${issuesBlock}

Return JSON: {"riskLevel":"Low|Medium|High","expectedFailureWindow":"3-6 months","preventiveActions":[{"action":"...","rationale":"...","estimatedCost":50,"priority":"Medium"}],"partsToWatch":["..."],"diagnosticChecksRecommended":["..."],"notes":"..."}`,
      },
    ])

    return safeJSONParse<PredictiveMaintenanceResult>(content, fallback)
  } catch (error) {
    console.error('AI Predictive Maintenance error:', error)
    return fallback
  }
}
