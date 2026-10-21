// Desbloqueo con Face ID / huella mediante WebAuthn (autenticador de la plataforma).
// Es un bloqueo en este dispositivo: protege la sesión ya iniciada; la contraseña sigue siendo el respaldo.
const KEY = "jl_portal_bio";
const NO = "jl_portal_bio_no";
const rnd = (n = 32) => crypto.getRandomValues(new Uint8Array(n));
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const leer = () => { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } };

export async function bioDisponible() {
  try {
    if (!window.PublicKeyCredential || !navigator.credentials?.create) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch (e) { return false; }
}
export const bioActivaPara = (uid) => { const b = leer(); return !!(b && b.uid === uid && b.cid); };
export const bioRechazada = () => { try { return localStorage.getItem(NO) === "1"; } catch (e) { return false; } };
export const bioRechazar = () => { try { localStorage.setItem(NO, "1"); } catch (e) { /* sin almacenamiento */ } };
export const bioDesactivar = () => { try { localStorage.removeItem(KEY); } catch (e) { /* sin almacenamiento */ } };

export async function bioActivar(uid, email) {
  try {
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge: rnd(),
        rp: { name: "Portal de clientes", id: window.location.hostname },
        user: { id: new TextEncoder().encode(uid).slice(0, 64), name: email, displayName: email },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" },
        timeout: 60000,
      },
    });
    if (!cred) return false;
    localStorage.setItem(KEY, JSON.stringify({ uid, cid: b64(cred.rawId) }));
    try { localStorage.removeItem(NO); } catch (e) { /* sin almacenamiento */ }
    return true;
  } catch (e) { return false; }
}
export async function bioVerificar(uid) {
  const b = leer();
  if (!b || b.uid !== uid) return false;
  try {
    const r = await navigator.credentials.get({
      publicKey: { challenge: rnd(), allowCredentials: [{ type: "public-key", id: unb64(b.cid) }], userVerification: "required", timeout: 60000, rpId: window.location.hostname },
    });
    return !!r;
  } catch (e) { return false; }
}
