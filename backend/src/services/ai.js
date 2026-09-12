import OpenAI from 'openai';
import { classifyNeed } from './classifyNeed.js';
const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
export async function askAI(message){
  if(!client) return {answer:`Modo local: puedo orientarte, pero la IA generativa aún no está configurada. Tu solicitud parece relacionada con ${classifyNeed(message).category}. Configura OPENAI_API_KEY para activar NEXO AI.`,category:classifyNeed(message).category,confidence:classifyNeed(message).confidence,source:'local'};
  const result=await client.responses.create({model:process.env.OPENAI_MODEL||'gpt-5.6-luna',input:[{role:'system',content:'Eres NEXO AI, asistente comunitario de Colombia. Orienta de forma clara, segura y breve. No inventes teléfonos, direcciones ni autoridades. Para emergencias indica que se debe contactar los servicios oficiales. Clasifica la necesidad en una de estas categorías: help, share, job, report, donation, accessibility.'},{role:'user',content:message}]});
  const answer=result.output_text?.trim()||'No pude generar una orientación.';
  const classified=classifyNeed(message);
  return {answer,category:classified.category,confidence:classified.confidence,source:'openai'};
}
export async function classifyWithAI(message){
  if(!client) return classifyNeed(message);
  const result=await client.responses.create({model:process.env.OPENAI_MODEL||'gpt-5.6-luna',input:`Clasifica esta solicitud de NEXO en exactamente una categoría: help, share, job, report, donation, accessibility. Responde solo JSON con category y confidence (0 a 1). Solicitud: ${message}`});
  try{const parsed=JSON.parse(result.output_text);if(['help','share','job','report','donation','accessibility'].includes(parsed.category))return parsed;}catch{} return classifyNeed(message);
}
