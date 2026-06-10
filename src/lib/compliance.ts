import { complianceAgent } from '../agents/specialists'

// Deterministic compliance gate shared by the orchestrator path (app/api/chat)
// and the workflow path (src/workflows/loanEnquiry). Always calls complianceAgent
// directly — never the orchestrator — to avoid malformed function calls.
export async function reviewCompliance(
  responseText: string
): Promise<{ finalResponse: string; compliancePass: boolean }> {
  const review = await complianceAgent.generateLegacy(
    `Review this response for NCCP, APRA, responsible lending, and DDO compliance:\n\n${responseText}`
  )

  // First line must be exactly "COMPLIANT" — "NON-COMPLIANT".includes("COMPLIANT") is true,
  // so substring search is not safe here.
  const lines = review.text.split('\n')
  const firstLine = lines[0].trim()
  const compliancePass = /^COMPLIANT$/i.test(firstLine)

  // Extract only the response body — skip the COMPLIANT/NON-COMPLIANT marker line and
  // drop any trailing "Note:" explanation the model may have appended.
  const bodyLines = lines.slice(1)
  const noteStart = bodyLines.findIndex((l) => /^note:/i.test(l.trim()))
  const cleanLines = noteStart >= 0 ? bodyLines.slice(0, noteStart) : bodyLines
  const cleanedResponse = cleanLines.join('\n').trim()

  if (!compliancePass) {
    console.warn('[compliance] Agent did not return COMPLIANT — falling back to original response')
  }

  return {
    finalResponse: cleanedResponse || responseText,
    compliancePass,
  }
}
