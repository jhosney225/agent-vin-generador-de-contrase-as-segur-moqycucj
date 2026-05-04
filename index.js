
```javascript
const Anthropic = require("@anthropic-ai/sdk");
const crypto = require("crypto");
const readline = require("readline");

const client = new Anthropic();

// Funciones para calcular entropía de contraseñas
function calculateEntropy(password) {
  const charsets = {
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    numbers: /[0-9]/.test(password),
    symbols: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  let poolSize = 0;
  if (charsets.lowercase) poolSize += 26;
  if (charsets.uppercase) poolSize += 26;
  if (charsets.numbers) poolSize += 10;
  if (charsets.symbols) poolSize += 32;

  const entropy = password.length * Math.log2(poolSize);
  return {
    entropy: entropy.toFixed(2),
    poolSize,
    charsets,
  };
}

function getStrengthLevel(entropy) {
  const e = parseFloat(entropy);
  if (e < 30) return "Muy débil";
  if (e < 50) return "Débil";
  if (e < 80) return "Moderada";
  if (e < 128) return "Fuerte";
  return "Muy fuerte";
}

// Función para generar contraseña aleatoria
function generateRandomPassword(length = 16) {
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+-=[]{}';:\"\\|,.<>/?";

  const allChars = lowercase + uppercase + numbers + symbols;
  let password = "";

  // Asegurar al menos un carácter de cada tipo
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Llenar el resto de manera aleatoria
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Mezclar la contraseña
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

async function analyzePasswordWithClaude(password, conversationHistory) {
  conversationHistory.push({
    role: "user",
    content: `Analiza esta contraseña en términos de seguridad: "${password}". Proporciona feedback específico y sugerencias de mejora.`,
  });

  const response = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 500,
    system: `Eres un experto en seguridad de contraseñas. Analizas contraseñas y proporcionas recomendaciones de mejora. 
    Evalúa factores como: longitud, variedad de caracteres, patrones comunes, palabras diccionario, secuencias predecibles.
    Sé conciso pero informativo en tus respuestas.`,
    messages: conversationHistory,
  });

  const assistantMessage =
    response.content[0].type === "text" ? response.content[0].text : "";
  conversationHistory.push({
    role: "assistant",
    content: assistantMessage,
  });

  return assistantMessage;
}

async function generatePasswordWithClaude(
  requirements,
  conversationHistory
) {
  conversationHistory.push({
    role: "user",
    content: `Basándote en estos requerimientos: ${requirements}, sugiere una estrategia para generar una contraseña segura. 
    Considera la entropía, legibilidad y cumplimiento de requisitos.`,
  });

  const response = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 500,
    system: `Eres un experto en criptografía y seguridad de contraseñas. Proporcionas recomendaciones sobre cómo generar contraseñas seguras.
    Explica conceptos como entropía, conjunto de caracteres y por qué ciertos patrones son más seguros que otros.
    Sé conciso pero técnicamente preciso.`,
    messages: conversationHistory,
  });

  const assistantMessage =
    response.content[0].type === "text" ? response.content[0].text : "";
  conversationHistory.push({
    role: "assistant",
    content: assistantMessage,
  });

  return assistantMessage;
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt) =>
    new Promise((resolve) => rl.question(prompt, resolve));

  console.log("\n🔐 === Generador de Contraseñas Seguras con Entropía ===\n");

  let conversationHistory = [];
  let continuar = true;

  while (continuar) {
    console.log("\nOpciones:");
    console.log("1. Generar contraseña aleatoria segura");
    console.log("2. Analizar entropía de una contraseña");
    console.log("3. Obtener recomendaciones de Claude");
    console.log("4. Salir");

    const opcion = await question