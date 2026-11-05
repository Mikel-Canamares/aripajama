import type { ProfileId } from './profiles.ts'

// Transcribed from the six supplied references. Keep one editable content registry.
export const EMAIL_PROFILES: Record<ProfileId, { title: string; description: string }> = {
  explorador: { title: 'El Explorador', description: 'Siempre con ganas de descubrir. Te atraen los lugares auténticos, la naturaleza y las experiencias diferentes. Buscas viajes que te sorprendan, te saquen de la rutina y te permitan conectar con la esencia de cada destino.' },
  cultural: { title: 'El Cultural', description: 'Te apasiona la historia, la arquitectura y las tradiciones. Disfrutas conociendo la esencia de cada destino, sus costumbres y su gente. Te atraen los lugares con significado y las experiencias auténticas que te conectan con la cultura local.' },
  aventurero: { title: 'El Aventurero', description: 'Te motiva la acción y los retos. Buscas experiencias activas, contacto con la naturaleza y salir de la zona de confort. Disfrutas explorando, descubriendo paisajes impresionantes y viviendo experiencias que te hagan sentir libre y en movimiento.' },
  contemplativo: { title: 'El Contemplativo', description: 'Prefieres un ritmo tranquilo y consciente. Valoras disfrutar del momento, la calma y los lugares con alma. Te atraen los paisajes que inspiran, la naturaleza, los espacios auténticos y las experiencias que te permitan desconectar y recargar energías.' },
  espiritu_libre: { title: 'El Espíritu Libre', description: 'Te gusta la flexibilidad y dejarte llevar. Disfrutas de la improvisación, los encuentros inesperados y todo lo que no está planeado.' },
  gastronomico: { title: 'El Gastronómico', description: 'Viajar también es un placer en la mesa. Te gusta descubrir sabores locales, mercados y la cultura a través de su gastronomía.' },
}
export const EMAIL_STEPS = [
  { title: 'Confirmación', text: 'Has completado tu perfil viajero.' },
  { title: 'Análisis', text: 'Reviso tus respuestas y preparo una propuesta personalizada.' },
  { title: 'Propuesta y presupuesto', text: 'En un plazo de 24–48h recibirás una propuesta con la cual podremos comenzar a trabajar y el presupuesto total de todo el proceso.' },
  { title: 'Hablemos', text: 'Si tienes cualquier duda, podremos resolverla por WhatsApp antes de continuar.' },
]
export const EMAIL_INTRO = 'Gracias por completar el cuestionario y compartir tu forma de viajar. Con tus respuestas he podido conocer mejor qué te inspira, qué disfrutas y cómo te gusta descubrir el mundo.'
export const EMAIL_FAREWELL = 'Gracias por confiar en mí. Estoy deseando diseñar contigo tu próxima historia.'
