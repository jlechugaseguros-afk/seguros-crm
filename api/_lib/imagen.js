// Dibuja un árbol de elementos (estilo React sin JSX) como PNG con satori + resvg.
import fs from "node:fs";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const FUENTE = fs.readFileSync(new URL("./Geist-Regular.ttf", import.meta.url));

export async function dibujarPNG(elemento, width, height) {
  const svg = await satori(elemento, { width, height, fonts: [{ name: "Geist", data: FUENTE, weight: 400, style: "normal" }] });
  return new Resvg(svg).render().asPng();
}
