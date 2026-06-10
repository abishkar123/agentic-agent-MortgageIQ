import { Mastra } from '@mastra/core'
import { orchestratorAgent } from '../agents/orchestrator'
import { faqAgent, calculatorAgent, eligibilityAgent, websiteAgent, generalAgent, complianceAgent } from '../agents/specialists'
import { loanEnquiryWorkflow } from '../workflows/loanEnquiry'

export const mastra = new Mastra({
  agents: {
    orchestratorAgent,
    faqAgent,
    calculatorAgent,
    eligibilityAgent,
    websiteAgent,
    generalAgent,
    complianceAgent,
  },
  workflows: {
    loanEnquiryWorkflow,
  },
})
