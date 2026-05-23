import { Mastra } from '@mastra/core'
import { supervisorAgent } from '../agents/supervisor'
import { faqAgent, calculatorAgent, eligibilityAgent, complianceAgent } from '../agents/specialists'
import { loanEnquiryWorkflow } from '../workflows/loanEnquiry'

export const mastra = new Mastra({
  agents: {
    supervisorAgent,
    faqAgent,
    calculatorAgent,
    eligibilityAgent,
    complianceAgent,
  },
  workflows: {
    loanEnquiryWorkflow,
  },
})
