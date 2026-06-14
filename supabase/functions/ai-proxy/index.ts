// Supabase Edge Function: AI Proxy
// Proxies AI API calls with server-side API keys (never exposed to frontend)
// Reads config from system_config table in database

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Cache system config for 5 minutes
let configCache: Record<string, string> = {}
let configCacheTime = 0
const CACHE_TTL = 5 * 60 * 1000

async function getSystemConfig(supabaseUrl: string, supabaseKey: string): Promise<Record<string, string>> {
  const now = Date.now()
  if (now - configCacheTime < CACHE_TTL && Object.keys(configCache).length > 0) {
    return configCache
  }
  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data, error } = await supabase
    .from('system_config')
    .select('key, value')
  if (error || !data) return configCache
  const config: Record<string, string> = {}
  for (const row of data) {
    config[row.key] = row.value
  }
  configCache = config
  configCacheTime = now
  return config
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt, provider, user_api_key, user_base_url, user_model } = await req.json()

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Missing prompt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let apiKey: string
    let baseUrl: string
    let model: string

    if (user_api_key && user_base_url) {
      apiKey = user_api_key
      baseUrl = user_base_url
      model = user_model || 'gpt-4o'
    } else {
      // Read from system_config table
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
      const config = await getSystemConfig(supabaseUrl, supabaseKey)

      apiKey = config['SYSTEM_AI_API_KEY'] || Deno.env.get('SYSTEM_AI_API_KEY') || ''
      baseUrl = config['SYSTEM_AI_BASE_URL'] || Deno.env.get('SYSTEM_AI_BASE_URL') || 'https://api.openai.com/v1'
      model = config['SYSTEM_AI_MODEL'] || Deno.env.get('SYSTEM_AI_MODEL') || 'gpt-4o'

      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: '系统 AI API 未配置。请在 Supabase 的 system_config 表中设置 SYSTEM_AI_API_KEY。' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: `你是一个专业的中泰双语词典编纂专家。请根据用户提供的泰语词语，生成完整的词条数据，包括：\n1. 罗马化拼音（使用皇家泰语转写系统）\n2. 所有义项（每个义项包含：词性、中文释义、语域/使用场景）\n3. 每个义项的例句（泰语原文 + 中文翻译）\n4. 例句的分词标注（每个词的词性和中文释义）\n5. 词频数据（如可获取）\n6. 同义词和反义词\n7. 学习者联想词\n\n请以JSON格式返回，结构如下：\n{\n  "word": "泰语词",\n  "romanization": "拼音",\n  "senses": [\n    {\n      "pos": "词性",\n      "meaning": "中文释义",\n      "register": "使用场景",\n      "examples": [\n        { "th": "泰语例句", "zh": "中文翻译" }\n      ],\n      "segmented": [\n        [\n          { "text": "分词", "pos": "词性", "meaning": "中文" }\n        ]\n      ]\n    }\n  ],\n  "synonyms": [{ "word": "同义词", "zh": "中文" }],\n  "antonyms": [{ "word": "反义词", "zh": "中文" }],\n  "learner_associations": [{ "word": "联想词", "note": "说明" }]\n}`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    })

    if (!aiResponse.ok) {
      const errText = await aiResponse.text()
      console.error('AI API error:', errText)
      return new Response(
        JSON.stringify({ error: 'AI API request failed', details: errText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const aiData = await aiResponse.json()
    const content = aiData.choices?.[0]?.message?.content || ''

    let parsed
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim()
      parsed = JSON.parse(jsonStr)
    } catch (e) {
      parsed = { raw: content, parseError: true }
    }

    return new Response(
      JSON.stringify({ success: true, data: parsed, provider: provider || 'system' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
