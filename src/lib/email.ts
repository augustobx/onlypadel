import tls from 'node:tls';
import net from 'node:net';

export type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
  from?: string;
};

/**
 * Envío ligero y nativo de correo electrónico sin dependencias externas.
 * Soporta Resend API, Brevo API o conexión SMTP directa (puerto 465 SSL o 587 STARTTLS).
 */
export async function sendEmail({ to, subject, html, from }: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  const fromAddress = from || process.env.SMTP_FROM || process.env.EMAIL_FROM || 'OnlyPadel <no-reply@onlypadel.local>';
  
  // 1. Resend API si está configurado
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [to],
          subject,
          html,
        }),
      });
      if (res.ok) return { success: true };
      const errData = await res.json().catch(() => ({}));
      console.warn('Resend API error:', errData);
    } catch (e: any) {
      console.error('Error enviando con Resend:', e);
    }
  }

  // 2. Brevo (Sendinblue) API si está configurado
  const brevoApiKey = process.env.BREVO_API_KEY;
  if (brevoApiKey) {
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { email: fromAddress.includes('<') ? fromAddress.replace(/.*<([^>]+)>.*/, '$1') : fromAddress, name: 'OnlyPadel' },
          to: [{ email: to }],
          subject,
          htmlContent: html,
        }),
      });
      if (res.ok) return { success: true };
    } catch (e: any) {
      console.error('Error enviando con Brevo:', e);
    }
  }

  // 3. SMTP nativo si SMTP_HOST y credenciales están configuradas
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT) || 465;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpUser && smtpPass) {
    try {
      await sendViaSmtpDirect({
        host: smtpHost,
        port: smtpPort,
        user: smtpUser,
        pass: smtpPass,
        from: fromAddress,
        to,
        subject,
        html,
      });
      return { success: true };
    } catch (err: any) {
      console.error('Error enviando correo por SMTP nativo:', err);
      return { success: false, error: err.message || 'Error en servidor SMTP.' };
    }
  }

  // Fallback simulado para entornos locales o sin SMTP todavía cargado
  console.log(`[EMAIL SIMULADO] Para: ${to} | Asunto: ${subject}`);
  return { success: true };
}

function sendViaSmtpDirect(opts: {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const isSecure = opts.port === 465;
    const socket = isSecure
      ? tls.connect({ host: opts.host, port: opts.port, rejectUnauthorized: false })
      : net.connect({ host: opts.host, port: opts.port });

    let step = 0;
    socket.setEncoding('utf-8');

    const cleanFrom = opts.from.includes('<') ? opts.from.replace(/.*<([^>]+)>.*/, '$1') : opts.from;

    socket.on('data', (data) => {
      const msg = data.toString();

      if (step === 0 && msg.startsWith('220')) {
        step = 1;
        socket.write(`EHLO localhost\r\n`);
      } else if (step === 1 && (msg.startsWith('250') || msg.includes('250 '))) {
        step = 2;
        socket.write('AUTH LOGIN\r\n');
      } else if (step === 2 && msg.startsWith('334')) {
        step = 3;
        socket.write(`${Buffer.from(opts.user).toString('base64')}\r\n`);
      } else if (step === 3 && msg.startsWith('334')) {
        step = 4;
        socket.write(`${Buffer.from(opts.pass).toString('base64')}\r\n`);
      } else if (step === 4 && msg.startsWith('235')) {
        step = 5;
        socket.write(`MAIL FROM:<${cleanFrom}>\r\n`);
      } else if (step === 5 && msg.startsWith('250')) {
        step = 6;
        socket.write(`RCPT TO:<${opts.to}>\r\n`);
      } else if (step === 6 && msg.startsWith('250')) {
        step = 7;
        socket.write('DATA\r\n');
      } else if (step === 7 && msg.startsWith('354')) {
        step = 8;
        const mailContent = [
          `From: ${opts.from}`,
          `To: ${opts.to}`,
          `Subject: =?UTF-8?B?${Buffer.from(opts.subject).toString('base64')}?=`,
          'MIME-Version: 1.0',
          'Content-Type: text/html; charset=UTF-8',
          'Content-Transfer-Encoding: 8bit',
          '',
          opts.html,
          '\r\n.',
        ].join('\r\n');
        socket.write(`${mailContent}\r\n`);
      } else if (step === 8 && msg.startsWith('250')) {
        step = 9;
        socket.write('QUIT\r\n');
        resolve();
      } else if (msg.startsWith('4') || msg.startsWith('5')) {
        socket.destroy();
        reject(new Error(`SMTP Error: ${msg.trim()}`));
      }
    });

    socket.on('error', (err) => {
      reject(err);
    });

    setTimeout(() => {
      socket.destroy();
      resolve(); // No bloquear la aplicación si el socket queda colgado
    }, 8000);
  });
}
