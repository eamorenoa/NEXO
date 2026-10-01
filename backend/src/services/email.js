import nodemailer from 'nodemailer';

const MAIL_USER = process.env.MAIL_USER;
const MAIL_PASSWORD = process.env.MAIL_PASSWORD;
const MAIL_FROM = process.env.MAIL_FROM || MAIL_USER;


if (!MAIL_USER) {
  console.warn(
    'ADVERTENCIA: MAIL_USER no está configurado.'
  );
}

if (!MAIL_PASSWORD) {
  console.warn(
    'ADVERTENCIA: MAIL_PASSWORD no está configurado.'
  );
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



async function sendEmail({
  to,
  subject,
  text,
  html,
}) {

  if (!MAIL_USER) {
    throw new Error(
      'MAIL_USER no está configurado.'
    );
  }

  if (!MAIL_PASSWORD) {
    throw new Error(
      'MAIL_PASSWORD no está configurado.'
    );
  }


  try {

    const info =
      await transporter.sendMail({
        from: MAIL_FROM,
        to,
        subject,
        text,
        html,
      });


    console.log(
      `Correo enviado a ${to}. Message ID: ${info.messageId}`
    );


    return info;


  } catch (error) {

    console.error(
      'Error enviando correo mediante Gmail:',
      error
    );


    throw new Error(
      'No fue posible enviar el correo.'
    );
  }
}




export async function sendVerificationEmail({
  to,
  name,
  code,
}) {


  const safeName =
    escapeHtml(name);



  return sendEmail({

    to,

    subject:
      'Código de verificación - NEXO',


    text:
      `
Hola ${name}.

Su código de verificación de NEXO es:

${code}

Este código vence en 10 minutos.

Si usted no creó esta cuenta, puede ignorar este mensaje.

NEXO
`.trim(),



    html:
      `
<!DOCTYPE html>
<html lang="es">

<body style="
margin:0;
padding:0;
background:#f4f7fb;
font-family:Arial,sans-serif;
">

<div style="
max-width:600px;
margin:40px auto;
background:white;
border-radius:16px;
padding:32px;
border:1px solid #e5e7eb;
">


<h1 style="
color:#2563eb;
text-align:center;
">
NEXO
</h1>


<h2>
Verificación de correo
</h2>


<p>
Hola ${safeName}.
</p>


<p>
Utilice este código para verificar su cuenta:
</p>


<div style="
background:#f3f6ff;
padding:20px;
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


<p>
Este código vence en 10 minutos.
</p>


<p>
NEXO — Tu barrio, conectado.
</p>


</div>

</body>
</html>
`.trim()

  });

}






export async function sendPasswordResetEmail(
  email,
  name,
  code
) {


  const safeName =
    escapeHtml(name);



  return sendEmail({

    to: email,

    subject:
      'Recuperación de contraseña - NEXO',


    text:
      `
Hola ${name}.

Recibimos una solicitud para cambiar la contraseña de su cuenta NEXO.

Su código de recuperación es:

${code}

Este código vence en 10 minutos.

Si usted no solicitó este cambio, ignore este mensaje.

NEXO
`.trim(),



    html:
      `
<!DOCTYPE html>
<html lang="es">

<body style="
margin:0;
padding:0;
background:#f4f7fb;
font-family:Arial,sans-serif;
">


<div style="
max-width:600px;
margin:40px auto;
background:white;
border-radius:16px;
padding:32px;
border:1px solid #e5e7eb;
">


<h1 style="
color:#2563eb;
text-align:center;
">
NEXO
</h1>


<h2>
Recuperación de contraseña
</h2>


<p>
Hola ${safeName}.
</p>


<p>
Use el siguiente código para crear una nueva contraseña:
</p>


<div style="
background:#f3f6ff;
padding:20px;
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


<p>
Este código vence en 10 minutos.
</p>


<p>
Si usted no solicitó recuperar la contraseña, ignore este mensaje.
</p>


<p>
NEXO — Tu barrio, conectado.
</p>


</div>


</body>
</html>
`.trim()

  });

}






function escapeHtml(value) {

  return String(value)

    .replaceAll('&', '&amp;')

    .replaceAll('<', '&lt;')

    .replaceAll('>', '&gt;')

    .replaceAll('"', '&quot;')

    .replaceAll("'", '&#039;');

}