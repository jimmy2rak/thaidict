// Supabase Edge Function: Send Reminder Email via Brevo
// Sends daily learning reminder emails with task status

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Send email via Brevo API
async function sendBrevoEmail(
  apiKey: string,
  senderEmail: string,
  senderName: string,
  toEmail: string,
  subject: string,
  htmlContent: string
): Promise<{ ok: boolean; status?: number; error?: string }> {
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

  if (!response.ok) {
    const errText = await response.text()
    return { ok: false, status: response.status, error: errText }
  }
  return { ok: true }
}

// ── Email Templates ──

function generateClassicTemplate(tasks: Array<{ name: string; type: string; done: boolean }>, time: string): string {
  const completed = tasks.filter(t => t.done).length
  const total = tasks.length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  const taskRows = tasks.map(t => `
    <tr>
      <td style="padding: 10px 16px; border-bottom: 1px solid #f0f0f0;">
        <span style="display: inline-block; width: 18px; height: 18px; border-radius: 50%; background: ${t.done ? '#5B8C7E' : '#e0e0e0'}; text-align: center; line-height: 18px; font-size: 11px; color: #fff; vertical-align: middle; margin-right: 10px;">${t.done ? '✓' : ''}</span>
        <span style="font-size: 14px; color: ${t.done ? '#999' : '#333'}; text-decoration: ${t.done ? 'line-through' : 'none'}; vertical-align: middle;">${t.name}</span>
        <span style="display: inline-block; margin-left: 8px; padding: 2px 8px; border-radius: 4px; background: #f5f5f5; font-size: 11px; color: #888;">${t.type}</span>
      </td>
    </tr>
  `).join('')

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 20px; background: #f7f5f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 420px; margin: 0 auto;">
    <div style="background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06);">
      <!-- Header -->
      <div style="background: #5B8C7E; padding: 24px 24px 20px; text-align: center;">
        <div style="font-size: 28px; margin-bottom: 6px;">📚</div>
        <div style="font-size: 20px; font-weight: 700; color: #fff;">词笺 · 每日学习提醒</div>
        <div style="font-size: 13px; color: rgba(255,255,255,0.85); margin-top: 6px;">今天也要坚持学习泰语哦</div>
      </div>

      <!-- Progress -->
      <div style="padding: 20px 24px; text-align: center; border-bottom: 1px solid #f0f0f0;">
        <div style="font-size: 14px; color: #666; margin-bottom: 12px;">今日完成进度</div>
        <div style="height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden; margin-bottom: 10px;">
          <div style="height: 100%; width: ${pct}%; background: #5B8C7E; border-radius: 4px;"></div>
        </div>
        <div style="font-size: 24px; font-weight: 700; color: #5B8C7E;">${completed}/${total}</div>
        <div style="font-size: 12px; color: #999; margin-top: 4px;">项任务已完成</div>
      </div>

      <!-- Task List -->
      ${total > 0 ? `
      <div style="padding: 0;">
        <table style="width: 100%; border-collapse: collapse;">
          ${taskRows}
        </table>
      </div>
      ` : `
      <div style="padding: 30px 24px; text-align: center;">
        <div style="font-size: 32px; margin-bottom: 8px;">🎯</div>
        <div style="font-size: 14px; color: #666;">今天没有安排学习任务</div>
        <div style="font-size: 12px; color: #999; margin-top: 4px;">去设置中添加打卡任务吧</div>
      </div>
      `}

      <!-- Footer -->
      <div style="padding: 16px 24px; background: #fafafa; text-align: center; border-top: 1px solid #f0f0f0;">
        <div style="font-size: 12px; color: #999;">
          设定时间：${time} CST · 此邮件由词笺系统自动发送
        </div>
      </div>
    </div>
  </div>
</body>
</html>`
}

function generateWarmTemplate(tasks: Array<{ name: string; type: string; done: boolean }>, time: string): string {
  const completed = tasks.filter(t => t.done).length
  const total = tasks.length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  const taskItems = tasks.map(t => `
    <div style="display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #f5f0ea;">
      <div style="width: 24px; height: 24px; border-radius: 50%; background: ${t.done ? '#C4993D' : 'transparent'}; border: ${t.done ? 'none' : '2px solid #e0d5c5'}; text-align: center; line-height: 24px; font-size: 12px; color: #fff; margin-right: 12px; flex-shrink: 0;">${t.done ? '✓' : ''}</div>
      <div style="flex: 1;">
        <span style="font-size: 14px; color: ${t.done ? '#aaa' : '#5a4a3a'}; text-decoration: ${t.done ? 'line-through' : 'none'};">${t.name}</span>
        <span style="display: inline-block; margin-left: 8px; padding: 2px 8px; border-radius: 10px; background: #f5f0ea; font-size: 11px; color: #b8956a;">${t.type}</span>
      </div>
    </div>
  `).join('')

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 20px; background: #faf7f3; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 420px; margin: 0 auto;">
    <div style="background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(180,150,100,0.08);">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #C4993D, #e8c97a); padding: 28px 24px 22px; text-align: center;">
        <div style="font-size: 30px; margin-bottom: 8px;">☀️</div>
        <div style="font-size: 19px; font-weight: 700; color: #fff;">早安，泰语学习者</div>
        <div style="font-size: 13px; color: rgba(255,255,255,0.9); margin-top: 6px;">新的一天，从学习泰语开始</div>
      </div>

      <!-- Greeting Card -->
      <div style="padding: 20px 24px; text-align: center; background: linear-gradient(180deg, #fff9f0, #fff);">
        <div style="font-size: 16px; color: #5a4a3a; line-height: 1.8;">
          ${completed === total && total > 0
            ? '🎉 太棒了！今天的任务全部完成，继续保持！'
            : total > 0
              ? `你今天有 <strong style="color: #C4993D;">${total}</strong> 项任务，已完成 <strong style="color: #C4993D;">${completed}</strong> 项`
              : '今天没有安排任务，给自己充充电吧！'
          }
        </div>
        ${total > 0 ? `
        <div style="margin-top: 14px; height: 6px; background: #f5f0ea; border-radius: 3px; overflow: hidden;">
          <div style="height: 100%; width: ${pct}%; background: linear-gradient(90deg, #C4993D, #e8c97a); border-radius: 3px;"></div>
        </div>
        <div style="font-size: 12px; color: #b8956a; margin-top: 6px;">${pct}% 完成</div>
        ` : ''}
      </div>

      <!-- Task List -->
      ${total > 0 ? `
      <div style="padding: 8px 24px 16px;">
        <div style="font-size: 13px; font-weight: 600; color: #8a7a6a; margin-bottom: 8px;">📋 今日任务</div>
        ${taskItems}
      </div>
      ` : ''}

      <!-- Motivation -->
      <div style="padding: 16px 24px; margin: 0 24px 16px; background: #faf7f3; border-radius: 10px; text-align: center;">
        <div style="font-size: 13px; color: #8a7a6a; line-height: 1.6;">
          ${completed === total && total > 0
            ? '「坚持就是胜利，你已经做到了！」'
            : '「每天进步一点点，积累起来就是巨大的飞跃」'
          }
        </div>
      </div>

      <!-- Footer -->
      <div style="padding: 14px 24px; text-align: center; border-top: 1px solid #f5f0ea;">
        <div style="font-size: 12px; color: #ccc0b0;">
          ${time} CST · 词笺 · 你的泰语学习伙伴
        </div>
      </div>
    </div>
  </div>
</body>
</html>`
}

function generateModernTemplate(tasks: Array<{ name: string; type: string; done: boolean }>, time: string): string {
  const completed = tasks.filter(t => t.done).length
  const total = tasks.length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  const taskItems = tasks.map(t => `
    <div style="display: flex; align-items: center; padding: 11px 0; border-bottom: 1px solid #2a2a2a;">
      <div style="width: 20px; height: 20px; border-radius: 6px; background: ${t.done ? '#5B8C7E' : 'transparent'}; border: ${t.done ? 'none' : '1.5px solid #555'}; text-align: center; line-height: 20px; font-size: 11px; color: #fff; margin-right: 12px; flex-shrink: 0;">${t.done ? '✓' : ''}</div>
      <div style="flex: 1;">
        <span style="font-size: 14px; color: ${t.done ? '#666' : '#e0e0e0'}; text-decoration: ${t.done ? 'line-through' : 'none'};">${t.name}</span>
      </div>
      <span style="padding: 3px 10px; border-radius: 12px; background: #2a2a2a; font-size: 11px; color: #888;">${t.type}</span>
    </div>
  `).join('')

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 20px; background: #111; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 420px; margin: 0 auto;">
    <div style="background: #1a1a1a; border-radius: 14px; overflow: hidden; border: 1px solid #2a2a2a;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #2d2d2d, #1a1a1a); padding: 28px 24px 22px; text-align: center; border-bottom: 1px solid #333;">
        <div style="display: inline-block; padding: 6px 14px; border-radius: 20px; background: rgba(91,140,126,0.15); margin-bottom: 10px;">
          <span style="font-size: 13px; color: #5B8C7E; font-weight: 600;">DAILY REMINDER</span>
        </div>
        <div style="font-size: 19px; font-weight: 700; color: #e0e0e0;">词笺 · 学习提醒</div>
      </div>

      <!-- Stats -->
      <div style="padding: 20px 24px; display: flex; gap: 12px;">
        <div style="flex: 1; background: #222; border-radius: 10px; padding: 14px; text-align: center;">
          <div style="font-size: 24px; font-weight: 700; color: #5B8C7E;">${completed}</div>
          <div style="font-size: 11px; color: #888; margin-top: 2px;">已完成</div>
        </div>
        <div style="flex: 1; background: #222; border-radius: 10px; padding: 14px; text-align: center;">
          <div style="font-size: 24px; font-weight: 700; color: #e0e0e0;">${total - completed}</div>
          <div style="font-size: 11px; color: #888; margin-top: 2px;">待完成</div>
        </div>
        <div style="flex: 1; background: #222; border-radius: 10px; padding: 14px; text-align: center;">
          <div style="font-size: 24px; font-weight: 700; color: #C4993D;">${pct}%</div>
          <div style="font-size: 11px; color: #888; margin-top: 2px;">进度</div>
        </div>
      </div>

      <!-- Progress Bar -->
      <div style="padding: 0 24px 16px;">
        <div style="height: 4px; background: #333; border-radius: 2px; overflow: hidden;">
          <div style="height: 100%; width: ${pct}%; background: linear-gradient(90deg, #5B8C7E, #7ab39f); border-radius: 2px;"></div>
        </div>
      </div>

      <!-- Task List -->
      ${total > 0 ? `
      <div style="padding: 0 24px 16px;">
        <div style="font-size: 12px; font-weight: 600; color: #888; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;">Today's Tasks</div>
        ${taskItems}
      </div>
      ` : `
      <div style="padding: 30px 24px; text-align: center;">
        <div style="font-size: 28px; margin-bottom: 8px;">🎯</div>
        <div style="font-size: 14px; color: #888;">今天没有安排任务</div>
      </div>
      `}

      <!-- Footer -->
      <div style="padding: 14px 24px; border-top: 1px solid #2a2a2a; text-align: center;">
        <div style="font-size: 12px; color: #555;">
          ${time} CST · 词笺 · ThaiDict
        </div>
      </div>
    </div>
  </div>
</body>
</html>`
}

function getTemplateHtml(template: string, tasks: Array<{ name: string; type: string; done: boolean }>, time: string): string {
  switch (template) {
    case 'warm': return generateWarmTemplate(tasks, time)
    case 'modern': return generateModernTemplate(tasks, time)
    default: return generateClassicTemplate(tasks, time)
  }
}

function getSubjectLine(template: string, completed: number, total: number): string {
  if (total === 0) return '词笺 · 今日学习提醒'
  if (completed === total) return `词笺 · 🎉 今日 ${total} 项任务已全部完成！`
  return `词笺 · 今日 ${total} 项学习任务待完成`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, template = 'classic', tasks = [], time = '08:00' } = await req.json()

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

    const completed = tasks.filter((t: any) => t.done).length
    const total = tasks.length

    const subject = getSubjectLine(template, completed, total)
    const htmlContent = getTemplateHtml(template, tasks, time)

    // Send email via Brevo
    const result = await sendBrevoEmail(
      brevoApiKey,
      brevoSenderEmail,
      brevoSenderName,
      email,
      subject,
      htmlContent
    )

    if (!result.ok) {
      console.error('Failed to send reminder email via Brevo:', result.error)
      return new Response(
        JSON.stringify({ error: `邮件发送失败 (${result.status})` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: '提醒邮件已发送' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Send reminder error:', error)
    return new Response(
      JSON.stringify({ error: error.message || '发送提醒邮件失败' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
