import OpenAI from 'openai';
import { classifyNeed } from './classifyNeed.js';

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 20000,
    maxRetries: 1,
  })
  : null;

const CATEGORIES = [
  'help',
  'share',
  'job',
  'report',
  'donation',
  'accessibility',
];

const SYSTEM_PROMPT = `
Eres NEXO AI, el asistente comunitario de NEXO en Colombia.

Tu objetivo es ayudar a las personas a encontrar soluciones comunitarias
y orientar sus solicitudes de manera clara, respetuosa y práctica.

Puedes orientar sobre:
- Necesidades de ayuda comunitaria.
- Ofertas, intercambios y préstamos.
- Empleo y preparación de hojas de vida.
- Donaciones y recursos comunitarios.
- Reportes de problemas en la comunidad.
- Accesibilidad e inclusión.

Reglas:
1. Responde en español, salvo que te pidan otro idioma.
2. Utiliza un tono respetuoso, claro y breve.
3. Cuando sea útil, ofrece pasos concretos.
4. No inventes ofertas laborales, donaciones disponibles,
   direcciones, teléfonos ni servicios que no hayas verificado.
5. No afirmes que has publicado una solicitud o contactado a alguien.
6. No solicites contraseñas, códigos de verificación ni datos bancarios.
7. Si la persona describe una emergencia, recomiéndale contactar
   los servicios oficiales de emergencia de su localidad.
8. No presentes suposiciones como hechos confirmados.
9. Ayuda a mejorar la redacción de publicaciones cuando sea necesario.
`;

function getLocalAnswer(message) {
  const result = classifyNeed(message);

  const suggestions = {
    help: 'Describa qué ayuda necesita, en qué zona se encuentra y cuándo la necesita.',
    share: 'Indique qué desea ofrecer, prestar o intercambiar y las condiciones.',
    job: 'Especifique el tipo de empleo que busca, su experiencia y su disponibilidad.',
    report: 'Describa el problema, su ubicación aproximada y cuándo ocurrió.',
    donation: 'Indique qué necesita o desea donar y en qué zona puede realizarse la entrega.',
    accessibility: 'Describa la barrera de accesibilidad y el lugar donde se presenta.',
  };

  return {
    answer:
      `Puedo orientarle con esta solicitud. ${suggestions[result.category] || suggestions.help}`,
    category: result.category,
    confidence: result.confidence,
    source: 'local',
  };
}

export async function askAI(message) {
  const cleanMessage = String(message || '').trim();

  if (cleanMessage.length < 3) {
    throw new Error('Escriba una consulta un poco más detallada.');
  }

  if (cleanMessage.length > 4000) {
    throw new Error('La consulta no puede superar los 4000 caracteres.');
  }

  const baseUrl = (
    process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434'
  ).replace(/\/+$/, '');

  const model = process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b';

  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(300000),
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: cleanMessage },
        ],
        options: {
          temperature: 0.3,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama respondió HTTP ${response.status}`);
    }

    const result = await response.json();
    const answer = result.message?.content?.trim();

    if (!answer) {
      throw new Error('Ollama no devolvió una respuesta.');
    }

    const classified = classifyNeed(cleanMessage);

    return {
      answer,
      category: classified.category,
      confidence: classified.confidence,
      source: 'ollama',
    };
  } catch (error) {
    console.error(
      'NEXO AI: Ollama no pudo completar la consulta.',
      error?.cause?.code || error?.name || error?.message || 'Error desconocido',
    );

    return {
      ...getLocalAnswer(cleanMessage),
      source: 'local_fallback',
    };
  }
}

export async function classifyWithAI(message) {
  const cleanMessage = String(message || '').trim();

  if (!client || cleanMessage.length < 3) {
    return classifyNeed(cleanMessage);
  }

  try {
    const result = await client.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-5.6-luna',
      instructions: `
Clasifica la solicitud comunitaria en exactamente una categoría:
help, share, job, report, donation o accessibility.

Devuelve únicamente un objeto JSON con:
- category: una de las categorías permitidas.
- confidence: un número entre 0 y 1.

No incluyas explicaciones adicionales.
      `.trim(),
      input: cleanMessage,
    });

    const output = result.output_text?.trim() || '';
    const jsonText = output
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '');

    const parsed = JSON.parse(jsonText);

    if (
      !CATEGORIES.includes(parsed.category) ||
      typeof parsed.confidence !== 'number' ||
      !Number.isFinite(parsed.confidence)
    ) {
      return classifyNeed(cleanMessage);
    }

    return {
      category: parsed.category,
      confidence: Math.max(
        0,
        Math.min(1, parsed.confidence),
      ),
    };
  } catch (error) {
    console.error(
      'NEXO AI: se utilizará la clasificación local.',
      error?.status || error?.name || 'Error desconocido',
    );

    return classifyNeed(cleanMessage);
  }
}