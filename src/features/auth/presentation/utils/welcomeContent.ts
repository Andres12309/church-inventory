type WelcomeContentInput = {
  userId: string;
  displayName: string;
  roleName: string | null;
};

/** 50 frases: fe católica, servicio parroquial y motivación personal */
export const MOTIVATIONAL_QUOTES = [
  // Fe y servicio católico
  "Servir a los demás es servir a Cristo en lo más pequeño.",
  "La fe mueve montañas; la constancia las mantiene firmes.",
  "Donde hay amor y servicio, Dios siempre está presente.",
  "Confía en el Señor: Él bendice la obra hecha con corazón limpio.",
  "Cada día es una nueva oportunidad para ser luz en tu comunidad.",
  "La oración fortalece el alma; el trabajo bien hecho dignifica la fe.",
  "María intercede por quienes sirven con humildad y dedicación.",
  "Lo pequeño hecho con grande amor transforma vidas enteras.",
  "El Señor no mira la cantidad, sino la entrega del corazón.",
  "En la parroquia, tu esfuerzo silencioso edifica la Iglesia entera.",
  "La esperanza cristiana convierte el servicio en vocación.",
  "Bendito quien administra fielmente lo que Dios ha confiado.",
  "Cuidar el patrimonio eclesiástico es custodiar la memoria viva de la fe.",
  "San José nos enseña: el trabajo honesto es oración con las manos.",
  "La paz de Cristo acompaña a quien actúa con verdad y responsabilidad.",
  "Tu vocación de servicio es un regalo para la comunidad de fieles.",
  "La caridad comienza en los gestos concretos del día a día.",
  "El evangelio se anuncia también con orden, transparencia y amor.",
  "Confía: Dios multiplica el fruto de quien siembra con paciencia.",
  "La fe sin obras está muerta; tu labor da vida al compromiso parroquial.",
  "Jesús camina contigo en cada tarea, por sencilla que parezca.",
  "La humildad abre las puertas de la gracia en el servicio apostólico.",
  "Custodiar los bienes de la Iglesia es un acto de amor comunitario.",
  "El Reino de Dios se construye con pasos firmes de quien no se renuncia.",
  "Ser fiel en lo poco prepara el camino para la grandeza del alma.",
  "La fe se refleja también en cómo cuidamos lo que Dios nos ha confiado.",
  "Gracias por ser parte de quienes custodian el tesoro de la Iglesia.",
  // Motivación personal y servicio
  "Hoy eres más fuerte de lo que crees y más capaz de lo que imaginas.",
  "Cada paso constante te acerca a la versión más plena de ti mismo.",
  "Tu disciplina de hoy es la libertad de mañana.",
  "No compares tu inicio con el final de otros; avanza a tu ritmo con valor.",
  "Los grandes logros nacen de pequeñas decisiones repetidas cada día.",
  "Eres protagonista de un servicio que deja huella en quienes te rodean.",
  "La excelencia no es un acto, es un hábito que puedes cultivar hoy.",
  "Tu energía positiva contagia y fortalece a todo el equipo.",
  "Mereces reconocer tu esfuerzo: estás construyendo algo que trasciende.",
  "Cuando dudes, recuerda por qué empezaste y sigue adelante.",
  "La claridad en tu trabajo impulsa la confianza de toda la comunidad.",
  "Hoy tienes la oportunidad de dejar las cosas mejor de como las encontraste.",
  "Tu dedicación silenciosa habla más fuerte que mil palabras.",
  "El progreso importa más que la perfección: sigue avanzando.",
  "Eres pieza clave en la misión de cuidar lo sagrado y lo valioso.",
  "Tu actitud determina el tono de toda jornada: elige servir con alegría.",
  "Lo que haces con amor nunca es en vano.",
  "Cada reto es entrenamiento para una versión más sabia de ti.",
  "Tu constancia inspira a otros a dar lo mejor de sí.",
  "Empieza donde estás, usa lo que tienes, haz lo que puedas hoy.",
  "La gratitud convierte lo ordinario en extraordinario.",
  "Tu compromiso diario es la base de un legado duradero.",
  "Respira, organízate y avanza: ya has superado días más difíciles.",
  "Cree en tu capacidad de resolver, aprender y servir mejor cada día.",
  "El mejor momento para actuar con propósito es ahora.",
  "Cada bien que registras es un legado que cuidamos con amor y responsabilidad.",
  "Servir con excelencia es transformar el patrimonio en bendición para todos.",
  "Pequeños gestos de diligencia generan un impacto profundo en la parroquia.",
  "La constancia en el servicio es una forma silenciosa de liderazgo.",
  "Hoy puedes hacer la diferencia: un dato bien guardado es un futuro más claro.",
] as const;

export function getRandomMotivationalQuote(): string {
  return (
    MOTIVATIONAL_QUOTES[
      Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)
    ] ?? MOTIVATIONAL_QUOTES[0]
  );
}

export function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) {
    return "Buenos días";
  }
  if (hour < 19) {
    return "Buenas tardes";
  }
  return "Buenas noches";
}

export function getFirstName(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) {
    return "servidor fiel";
  }
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

export function buildWelcomeContent({
  displayName,
  roleName,
}: WelcomeContentInput) {
  const firstName = getFirstName(displayName);
  const greeting = getTimeGreeting();

  return {
    greeting,
    headline: `${greeting}, ${firstName}`,
    subline: roleName
      ? `Como ${roleName}, tu labor importa.`
      : "Tu labor en Fieles Bienes importa.",
    quote: getRandomMotivationalQuote(),
  };
}

export const WELCOME_MIN_DURATION_MS = 4000;
