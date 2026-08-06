import "server-only";
import crypto from "node:crypto";

// AES-256-GCM para campos sensibles a nivel de aplicación (RUT, tokens de
// integraciones — sección 11 del blueprint). La clave nunca se expone al
// cliente; vive solo como FIELD_ENCRYPTION_KEY server-side.
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  const raw = process.env.FIELD_ENCRYPTION_KEY;
  if (!raw) throw new Error("FIELD_ENCRYPTION_KEY no está configurada.");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("FIELD_ENCRYPTION_KEY debe ser una clave de 32 bytes en base64.");
  return key;
}

// Empaqueta iv + authTag + ciphertext en un solo buffer para guardar en una
// columna `bytea` — no hace falta una columna separada por cada parte.
export function encryptField(plaintext: string): Buffer {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]);
}

export function decryptField(packed: Buffer): string {
  const iv = packed.subarray(0, IV_LENGTH);
  const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + 16);
  const ciphertext = packed.subarray(IV_LENGTH + 16);
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

// PostgREST (la API que usa supabase-js) representa `bytea` como texto en
// formato hex de Postgres ("\x1a2b...") tanto al escribir como al leer — un
// Buffer de Node no se serializa así solo con JSON.stringify (usaría su
// toJSON por defecto, {type:"Buffer",data:[...]}, que Postgres no entiende
// como bytea). Estos wrappers son el único punto de conversión.
export function encryptFieldForStorage(plaintext: string): string {
  return `\\x${encryptField(plaintext).toString("hex")}`;
}

export function decryptFieldFromStorage(pgBytea: string): string {
  const hex = pgBytea.startsWith("\\x") ? pgBytea.slice(2) : pgBytea;
  return decryptField(Buffer.from(hex, "hex"));
}
