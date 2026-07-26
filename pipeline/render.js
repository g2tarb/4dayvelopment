// Rendu HTML -> PNG via Puppeteer. Fichier séparé de stages/w2.js : IO bas niveau (comme llm.js/
// email.js), et évite d'importer un navigateur stateful dans le fichier que w2-gates.test.js
// importe pour ses fonctions pures (routeLead, prepareDossier, structureGate, lintGate, diversiteGate).

import puppeteer from 'puppeteer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RENDER_DIR = fileURLToPath(new URL('./data/renders/', import.meta.url));
mkdirSync(RENDER_DIR, { recursive: true });

const VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 2 };

/**
 * Rend une liste de pages HTML en PNG. UN SEUL navigateur pour tout le run (lancé/fermé une fois),
 * rendu SÉQUENTIEL des pages (pas Promise.all) :
 * ponytail: 3 pages Chrome simultanées en deviceScaleFactor:2 peuvent saturer la RAM d'un petit
 * VPS ; passer à Promise.all seulement si la RAM du VPS le permet.
 * @param {{id: string, html: string}[]} items
 * @returns {Promise<{id: string, htmlPath: string, pngPath: string}[]>}
 */
export async function renderDirectionsToPng(items, leadId) {
  const browser = await puppeteer.launch({
    headless: true, // 'new' n'existe plus dans les versions récentes de Puppeteer (type boolean | 'shell')
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const results = [];
    for (const { id, html } of items) {
      const htmlPath = `${RENDER_DIR}${leadId}_${id}.html`;
      const pngPath = `${RENDER_DIR}${leadId}_${id}.png`;
      writeFileSync(htmlPath, html);

      const page = await browser.newPage();
      try {
        await page.setViewport(VIEWPORT);
        await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0', timeout: 15000 });
        await page.evaluate(() => document.fonts.ready);
        await new Promise((r) => setTimeout(r, 2000)); // laisse le temps aux animations/fonts de se stabiliser
        await page.screenshot({ path: pngPath, type: 'png', clip: { x: 0, y: 0, width: 1440, height: 900 } });
      } finally {
        await page.close();
      }
      results.push({ id, htmlPath, pngPath });
    }
    return results;
  } finally {
    await browser.close();
  }
}
