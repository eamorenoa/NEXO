import nodemailer from 'nodemailer';

const MAIL_USER = process.env.MAIL_USER;
const MAIL_PASSWORD = process.env.MAIL_PASSWORD;
const MAIL_FROM = process.env.MAIL_FROM || MAIL_USER;

if (!MAIL_USER) {
    console.warn('ADVERTENCIA: MAIL_USER no está configurado.');
}

if (!MAIL_PASSWORD) {
    console.warn('ADVERTENCIA: MAIL_PASSWORD no está configurado.');
}

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: MAIL_USER,
        pass: MAIL_PASSWORD,
    },
});

export async function sendVerificationEmail({
    to,
    name,
    code,
}) {
    if (!MAIL_USER) {
        throw new Error(
            'MAIL_USER no está configurado.',
        );
    }

    if (!MAIL_PASSWORD) {
        throw new Error(
            'MAIL_PASSWORD no está configurado.',
        );
    }

    const safeName = escapeHtml(name);

    try {
        const info = await transporter.sendMail({
            from: MAIL_FROM,
            to,
            subject: 'Código de verificación - NEXO',
            text: `
Hola ${name}.

Su código de verificación de NEXO es:

${code}

Este código vence en 10 minutos.

Si usted no creó esta cuenta, puede ignorar este mensaje.

NEXO
      `.trim(),

            html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verificación NEXO</title>
</head>

<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;">

  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e5e7eb;">

    <h1 style="margin:0 0 8px;color:#2563eb;text-align:center;">
      NEXO
    </h1>

    <p style="text-align:center;color:#6b7280;">
      Tu barrio, conectado.
    </p>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">

    <h2 style="color:#111827;">
      Verificación de correo
    </h2>

    <p style="color:#374151;">
      Hola ${safeName}.
    </p>

    <p style="color:#374151;">
      Utilice el siguiente código para verificar su cuenta de NEXO:
    </p>

    <div style="
      margin:28px 0;
      padding:20px;
      background:#f3f6ff;
      border-radius:12px;
      text-align:center;
    ">
      <span style="
        font-size:36px;
        font-weight:bold;
        letter-spacing:8px;
        color:#2563eb;
      ">
        ${code}
      </span>
    </div>

    <p style="color:#6b7280;font-size:14px;">
      Este código vence en <strong>10 minutos</strong>.
    </p>

    <p style="color:#6b7280;font-size:14px;">
      Si usted no creó esta cuenta, puede ignorar este mensaje.
    </p>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">

    <p style="text-align:center;color:#9ca3af;font-size:12px;">
      NEXO — Tu barrio, conectado.
    </p>

  </div>

</body>
</html>
      `.trim(),
        });

        console.log(
            `Correo de verificación enviado a ${to}. Message ID: ${info.messageId}`,
        );

        return info;
    } catch (error) {
        console.error(
            'Error enviando correo mediante Gmail:',
            error,
        );

        throw new Error(
            'No fue posible enviar el correo de verificación.',
        );
    }
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}
