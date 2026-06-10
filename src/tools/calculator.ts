import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

export const repaymentCalculatorTool = createTool({
  id: 'repayment_calculator',
  description:
    'Calculate monthly mortgage repayments given principal, annual interest rate, and loan term.',
  inputSchema: z.object({
    principal: z.number().describe('Loan amount in AUD'),
    annualRate: z.number().describe('Annual interest rate as a percentage e.g. 6.5'),
    termYears: z.number().describe('Loan term in years e.g. 30'),
    type: z.enum(['principal_and_interest', 'interest_only']).default('principal_and_interest'),
  }),
  execute: async (inputData) => {
    const { principal, annualRate, termYears, type } = inputData
    const r = annualRate / 100 / 12
    const n = termYears * 12
    const monthly =
      type === 'interest_only'
        ? principal * r
        : (principal * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1)
    return {
      monthlyPayment: Math.round(monthly),
      totalRepaid: Math.round(monthly * n),
      totalInterest: Math.round(monthly * n - principal),
      summary: `$${Math.round(monthly).toLocaleString()}/month over ${termYears}yrs at ${annualRate}%`,
    }
  },
})

export const lvrCalculatorTool = createTool({
  id: 'lvr_calculator',
  description: 'Calculate Loan-to-Value Ratio and whether LMI applies.',
  inputSchema: z.object({
    propertyValue: z.number().describe('Property value in AUD'),
    depositAmount: z.number().describe('Deposit amount in AUD'),
  }),
  execute: async (inputData) => {
    const { propertyValue, depositAmount } = inputData
    const loan = propertyValue - depositAmount
    const lvr = (loan / propertyValue) * 100
    return {
      loanAmount: Math.round(loan),
      lvr: parseFloat(lvr.toFixed(1)),
      depositPercent: parseFloat(((depositAmount / propertyValue) * 100).toFixed(1)),
      lmiRequired: lvr > 80,
      summary: `LVR: ${lvr.toFixed(1)}% — LMI ${lvr > 80 ? 'required' : 'not required'}`,
    }
  },
})

export const borrowingCapacityTool = createTool({
  id: 'borrowing_capacity',
  description: 'Estimate maximum borrowing capacity based on income and expenses.',
  inputSchema: z.object({
    grossAnnualIncome: z.number().describe('Gross annual income in AUD'),
    monthlyDebts: z.number().describe('Existing monthly debt repayments in AUD'),
    monthlyLivingExpenses: z.number().describe('Monthly living expenses in AUD'),
    annualRate: z.number().default(6.5).describe('Indicative interest rate'),
    termYears: z.number().default(30),
  }),
  execute: async (inputData) => {
    // Mastra types inputData as the schema's input shape, where .default() fields are
    // optional — mirror the zod defaults here to satisfy the type checker
    const { grossAnnualIncome, monthlyDebts, monthlyLivingExpenses, annualRate = 6.5, termYears = 30 } = inputData
    // APRA serviceability buffer: assess at rate + 3%
    const assessRate = annualRate + 3
    const r = assessRate / 100 / 12
    const n = termYears * 12
    const monthlyIncome = grossAnnualIncome / 12
    const maxRepayment = monthlyIncome * 0.28 - monthlyDebts - monthlyLivingExpenses * 0.1
    const maxLoan = maxRepayment > 0
      ? (maxLoan => Math.round(maxLoan))(
          (maxRepayment * (Math.pow(1 + r, n) - 1)) / (r * Math.pow(1 + r, n))
        )
      : 0
    return {
      estimatedMaxLoan: Math.max(0, maxLoan),
      assessmentRate: assessRate,
      summary: `Estimated max borrowing: $${Math.max(0, maxLoan).toLocaleString()} (assessed at ${assessRate}% incl. APRA buffer)`,
    }
  },
})
