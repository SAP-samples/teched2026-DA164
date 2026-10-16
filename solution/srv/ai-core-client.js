const { readFileSync } = require('fs')

let _cfg = null
function cfg() {
  if (!_cfg) _cfg = JSON.parse(readFileSync('.aicore/config.json'))
  return _cfg
}

let _token = null
let _tokenExpiry = 0

async function getToken() {
  if (_token && Date.now() < _tokenExpiry) return _token
  const res = await fetch(`${cfg().url}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     cfg().clientid,
      client_secret: cfg().clientsecret
    })
  })
  const data = await res.json()
  _token = data.access_token
  _tokenExpiry = Date.now() + (data.expires_in - 60) * 1000
  return _token
}

async function getEmbedding(text) {
  const token = await getToken()
  const res = await fetch(
    `${cfg().serviceurls.AI_API_URL}/v2/inference/deployments/${cfg().embedDeploymentId}/v1/embeddings`,
    {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'AI-Resource-Group': cfg().resourceGroup ?? 'default',
        Authorization:       `Bearer ${token}`
      },
      body: JSON.stringify({ input: text })
    }
  )
  const data = await res.json()
  return data.data[0].embedding
}

async function chatCompletion(messages) {
  const token = await getToken()
  const res = await fetch(
    `${cfg().serviceurls.AI_API_URL}/v2/inference/deployments/${cfg().deploymentId}/completion`,
    {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'AI-Resource-Group': cfg().resourceGroup ?? 'default',
        Authorization:       `Bearer ${token}`
      },
      body: JSON.stringify({
        orchestration_config: {
          module_configurations: {
            llm_module_config: {
              model_name:   cfg().model_chat,
              model_params: { max_tokens: 500 }
            },
            templating_module_config: { template: messages }
          }
        }
      })
    }
  )
  const data = await res.json()
  return data.orchestration_result.choices[0].message.content
}

module.exports = { getEmbedding, chatCompletion }
