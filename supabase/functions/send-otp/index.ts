// Supabase Edge Function: Send OTP via Brevo
// Sends email verification code for login and password reset

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Generate 6-digit OTP code
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Send email via Brevo API
async function sendBrevoEmail(
  apiKey: string,
  senderEmail: string,
  senderName: string,
  toEmail: string,
  subject: string,
  htmlContent: string
): Promise<boolean> {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email: toEmail }],
      subject,
      htmlContent,
    }),
  })

  return response.ok
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, type = 'login' } = await req.json()

    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: '请提供有效的邮箱地址' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: '邮箱格式不正确' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Brevo config from environment
    const brevoApiKey = Deno.env.get('BREVO_API_KEY')
    const brevoSenderEmail = Deno.env.get('BREVO_SENDER_EMAIL')
    const brevoSenderName = Deno.env.get('BREVO_SENDER_NAME') || '词笺'

    if (!brevoApiKey || !brevoSenderEmail) {
      console.error('Brevo configuration missing')
      return new Response(
        JSON.stringify({ error: '邮件服务未配置，请联系管理员' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check rate limit (60 seconds between requests)
    const { data: rateCheck } = await supabase
      .rpc('check_otp_rate_limit', { p_email: email })

    if (rateCheck === false) {
      return new Response(
        JSON.stringify({ error: '发送太频繁，请60秒后再试' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate OTP code
    const code = generateOtp()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

    // Delete any existing unused OTPs for this email and type
    await supabase
      .from('otp_codes')
      .delete()
      .eq('email', email)
      .eq('type', type)
      .eq('used', false)

    // Store OTP in database
    const { error: insertError } = await supabase
      .from('otp_codes')
      .insert({
        email,
        code,
        type,
        expires_at: expiresAt.toISOString(),
      })

    if (insertError) {
      console.error('Failed to store OTP:', insertError)
      return new Response(
        JSON.stringify({ error: '验证码生成失败，请重试' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare email content
    const subject = type === 'reset' ? '词笺 - 重置密码验证码' : '词笺 - 登录验证码'
    const actionText = type === 'reset' ? '重置密码' : '登录'

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; color: #333; }
    .container { max-width: 400px; margin: 0 auto; }
    .code { font-size: 32px; font-weight: bold; color: #5B8C7E; letter-spacing: 8px; text-align: center; padding: 20px; background: #f5f5f5; border-radius: 8px; margin: 20px 0; }
    .footer { font-size: 12px; color: #999; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <h2>词笺 - 验证码</h2>
    <p>您正在${actionText}，验证码如下：</p>
    <div class="code">${code}</div>
    <p>验证码有效期为 <strong>5 分钟</strong>，请尽快使用。</p>
    <p>如果这不是您的操作，请忽略此邮件。</p>
    <div class="footer">
      <p>此邮件由词笺系统自动发送，请勿回复。</p>
    </div>
  </div>
</body>
</html>
`

    // Send email via Brevo
    const sent = await sendBrevoEmail(
      brevoApiKey,
      brevoSenderEmail,
      brevoSenderName,
      email,
      subject,
      htmlContent
    )

    if (!sent) {
      console.error('Failed to send email via Brevo')
      return new Response(
        JSON.stringify({ error: '邮件发送失败，请重试' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: '验证码已发送到您的邮箱' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Send OTP error:', error)
    return new Response(
      JSON.stringify({ error: error.message || '发送验证码失败' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
