// Supabase Edge Function: AI Proxy
// Proxies AI API calls with server-side API keys (never exposed to frontend)
// Supports: system-provided free API + user-configured APIs

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
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

    // Determine which API to use
    let apiKey: string
    let baseUrl: string
    let model: string

    if (user_api_key && user_base_url) {
      // Use user-provided API
      apiKey = user_api_key
      baseUrl = user_base_url
      model = user_model || 'gpt-4o'
    } else {
      // Use system-provided API (stored as Supabase secrets)
      apiKey = Deno.env.get('SYSTEM_AI_API_KEY') || ''
      baseUrl = Deno.env.get('SYSTEM_AI_BASE_URL') || 'https://api.openai.com/v1'
      model = Deno.env.get('SYSTEM_AI_MODEL') || 'gpt-4o'

      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: 'System AI API not configured. Please set SYSTEM_AI_API_KEY secret.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Call the AI API
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
            content: `你是一个专业的中泰双语词典编纂专家。请根据用户提供的泰语词语，生成完整的词条数据，包括：
1. 罗马化拼音（使用皇家泰语转写系统）
2. 所有义项（每个义项包含：词性、中文释义、语域/使用场景）
3. 每个义项的例句（泰语原文 + 中文翻译）
4. 例句的分词标注（每个词的词性和中文释义）
5. 词频数据（如可获取）
6. 同义词和反义词
7. 学习者联想词

请以JSON格式返回，结构如下：
{
  "word": "泰语词",
  "romanization": "拼音",
  "senses": [
    {
      "pos": "词性",
      "meaning": "中文释义",
      "register": "使用场景",
      "examples": [
        { "th": "泰语例句", "zh": "中文翻译" }
      ],
      "segmented": [
        [
          { "text": "分词", "pos": "词性", "meaning": "中文" }
        ]
      ]
    }
  ],
  "synonyms": [{ "word": "同义词", "zh": "中文" }],
  "antonyms": [{ "word": "反义词", "zh": "中文" }],
  "learner_associations": [{ "word": "联想词", "note": "说明" }]
}`
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

    // Try to parse JSON from the response
    let parsed
    try {
      // Extract JSON from markdown code blocks if present
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
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
