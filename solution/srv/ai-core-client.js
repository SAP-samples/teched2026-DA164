const { OrchestrationClient } = require('@sap-ai-sdk/orchestration')
const cds = require('@sap/cds')

const MODEL = 'gpt-4o-mini'

function ensureCredentials() {
  if (process.env.VCAP_SERVICES || process.env.AICORE_SERVICE_KEY) return
  const creds = cds.env.requires?.aicore?.credentials
  if (creds) process.env.AICORE_SERVICE_KEY = JSON.stringify(creds)
}

async function chatCompletion(messages) {
  ensureCredentials()
  const response = await new OrchestrationClient({
    promptTemplating: {
      model: { name: MODEL, params: { max_tokens: 500 } },
      prompt: { template: messages }
    }
  }).chatCompletion()
  return response.getContent()
}

module.exports = { chatCompletion }
