const rules=[
  {category:'help',words:['ayuda','acompa','diligencia','caja','mercado','adulto mayor']},
  {category:'job',words:['empleo','trabajo','trabajar','vacante','hoja de vida']},
  {category:'donation',words:['donación','donar','regalar','ropa','alimento']},
  {category:'share',words:['prestar','compartir','vendo','intercambio','objeto']},
  {category:'report',words:['reporte','problema','daño','basura','seguridad','ruido','luz']},
  {category:'accessibility',words:['accesibilidad','silla de ruedas','rampa','discapacidad']}
];
export function classifyNeed(text=''){const t=text.toLowerCase();let best={category:'help',score:0};for(const r of rules){const score=r.words.reduce((n,w)=>n+(t.includes(w)?1:0),0);if(score>best.score)best={category:r.category,score};}return {category:best.category,confidence:best.score?Math.min(.55+best.score*.12,.95):.35};}
