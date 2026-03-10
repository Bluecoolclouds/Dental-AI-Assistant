import { Resend } from "resend";

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  const resend = getResend();
  if (!resend) throw new Error("RESEND_API_KEY не настроен");

  const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Подтверждение email — Toothy</title>
</head>
<body style="margin:0;padding:0;background:#F0F4FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F4FA;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#4A90D9,#7AADE6);padding:36px 40px;text-align:center;">
              <div style="display:inline-flex;align-items:center;gap:10px;">
                <div style="width:40px;height:40px;background:rgba(255,255,255,0.2);border-radius:50%;display:inline-block;line-height:40px;text-align:center;font-size:20px;">🦷</div>
                <span style="color:#FFFFFF;font-size:24px;font-weight:700;letter-spacing:0.5px;">Toothy</span>
              </div>
              <div style="color:rgba(255,255,255,0.7);font-size:11px;letter-spacing:2px;margin-top:4px;">DENTAL CARE</div>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 32px;">
              <h2 style="margin:0 0 12px;color:#1A1A2E;font-size:22px;font-weight:700;">Подтверждение регистрации</h2>
              <p style="margin:0 0 28px;color:#64748B;font-size:15px;line-height:1.6;">
                Для завершения регистрации в Toothy введите код подтверждения в приложении:
              </p>
              <div style="background:#F0F4FA;border-radius:16px;padding:28px;text-align:center;margin-bottom:28px;">
                <div style="letter-spacing:14px;font-size:42px;font-weight:800;color:#4A90D9;font-family:'Courier New',monospace;">${code}</div>
                <div style="color:#94A3B8;font-size:13px;margin-top:12px;">Код действителен 10 минут</div>
              </div>
              <p style="margin:0;color:#94A3B8;font-size:13px;line-height:1.6;">
                Если вы не регистрировались в Toothy, просто проигнорируйте это письмо.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#F8FAFC;padding:20px 40px;text-align:center;border-top:1px solid #E2E8F0;">
              <p style="margin:0;color:#CBD5E1;font-size:12px;">© 2026 Toothy. Ваш стоматологический помощник.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const result = await resend.emails.send({
    from: "Toothy <noreply@artificecheat.ru>",
    to,
    subject: `${code} — ваш код подтверждения Toothy`,
    html,
  });

  if (result.error) {
    throw new Error(`Ошибка отправки письма: ${result.error.message}`);
  }
}
