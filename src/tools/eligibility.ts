import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

export const eligibilityCheckTool = createTool({
  id: 'eligibility_check',
  description:
    'Check preliminary home loan eligibility based on income, deposit, employment type, and credit history.',
  inputSchema: z.object({
    grossAnnualIncome: z.number().describe('Gross annual income in AUD'),
    depositAmount: z.number().describe('Available deposit in AUD'),
    propertyValue: z.number().describe('Target property value in AUD'),
    employmentType: z
      .enum(['full_time', 'part_time', 'casual', 'self_employed', 'contract'])
      .describe('Employment type'),
    creditIssues: z
      .boolean()
      .default(false)
      .describe('Whether applicant has known credit issues'),
    isFirstHomeBuyer: z.boolean().default(false),
    australianResident: z.boolean().default(true),
  }),
  execute: async (inputData) => {
    const {
      grossAnnualIncome,
      depositAmount,
      propertyValue,
      employmentType,
      creditIssues,
      isFirstHomeBuyer,
      australianResident,
    } = inputData

    const checks: { rule: string; pass: boolean; note: string }[] = []

    // Minimum income check
    checks.push({
      rule: 'Minimum income',
      pass: grossAnnualIncome >= 40000,
      note: grossAnnualIncome >= 40000 ? 'Meets minimum income threshold' : 'Income below $40k minimum',
    })

    // Deposit check (min 5%)
    const depositPercent = (depositAmount / propertyValue) * 100
    checks.push({
      rule: 'Minimum deposit (5%)',
      pass: depositPercent >= 5,
      note: `Deposit is ${depositPercent.toFixed(1)}% of property value${depositPercent >= 20 ? ' — no LMI required' : depositPercent >= 5 ? ' — LMI will apply' : ' — below minimum'}`,
    })

    // Employment stability
    const stableEmployment = ['full_time', 'part_time'].includes(employmentType)
    checks.push({
      rule: 'Employment stability',
      pass: true,
      note: stableEmployment
        ? 'Standard employment — full documentation required'
        : employmentType === 'self_employed'
          ? 'Self-employed — Low Doc or Alt Doc loan may apply'
          : 'Non-standard employment — lender assessment required',
    })

    // Credit check
    checks.push({
      rule: 'Credit history',
      pass: !creditIssues,
      note: creditIssues
        ? 'Credit issues noted — Bad Credit or Solution Lending products may apply'
        : 'No credit issues flagged',
    })

    // Australian residency
    checks.push({
      rule: 'Residency',
      pass: australianResident,
      note: australianResident ? 'Australian resident' : 'Non-resident lending available with restrictions',
    })

    const hardFails = checks.filter((c) => !c.pass)
    const eligible = hardFails.length === 0 || (hardFails.length === 1 && creditIssues)

    const recommendedProducts: string[] = []
    if (isFirstHomeBuyer) recommendedProducts.push('First Home Buyer Loan', 'FHOG eligible')
    if (employmentType === 'self_employed') recommendedProducts.push('Self-Employed Home Loan', 'Low Doc Loan', 'Alt Doc Loan')
    if (creditIssues) recommendedProducts.push('Bad Credit Home Loan', 'Solution Lending')
    if (depositPercent < 20 && depositPercent >= 5) recommendedProducts.push('LMI-assisted loan', 'Family Pledge Loan')
    if (depositPercent >= 20) recommendedProducts.push('Standard Variable', 'Fixed Rate', 'Blended Plus')

    return {
      eligible,
      checks,
      recommendedProducts,
      requiresHumanReview: creditIssues || employmentType === 'casual' || !australianResident,
      summary: eligible
        ? `Likely eligible. Recommended products: ${recommendedProducts.join(', ')}`
        : `May not qualify for standard loans. ${hardFails.map((f) => f.note).join('; ')}`,
    }
  },
})
