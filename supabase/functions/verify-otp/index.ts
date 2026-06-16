// Supabase Edge Function: Verify OTP
// Verifies email verification code for login and password reset

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, code, type = 'login' } = await req.json()

    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: '请提供邮箱和验证码' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (typeof code !== 'string' || code.length !== 6) {
      return new Response(
        JSON.stringify({ error: '验证码格式不正确' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Find the OTP record
    const { data: otpRecord, error: queryError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('type', type)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (queryError || !otpRecord) {
      return new Response(
        JSON.stringify({ error: '验证码错误或已过期' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if OTP has expired
    const expiresAt = new Date(otpRecord.expires_at)
    if (expiresAt < new Date()) {
      // Mark as used (expired)
      await supabase
        .from('otp_codes')
        .update({ used: true })
        .eq('id', otpRecord.id)

      return new Response(
        JSON.stringify({ error: '验证码已过期，请重新获取' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Mark OTP as used
    await supabase
      .from('otp_codes')
      .update({ used: true })
      .eq('id', otpRecord.id)

    // For login type: verify email exists in Supabase Auth
    if (type === 'login') {
      // Check if user exists (we'll use signInWithOtp or similar approach)
      // For now, just return success - the frontend will handle the actual login
      return new Response(
        JSON.stringify({
          success: true,
          message: '验证成功',
          email: email,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For reset type: return success, frontend will show new password form
    if (type === 'reset') {
      return new Response(
        JSON.stringify({
          success: true,
          message: '验证成功，请设置新密码',
          email: email,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: '未知的验证类型' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Verify OTP error:', error)
    return new Response(
      JSON.stringify({ error: error.message || '验证失败' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
