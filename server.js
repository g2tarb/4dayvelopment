/**
 * 4DAYVELOPMENT — Serveur Node.js
 * Express · Nodemailer · Zod · Pino · Helmet CSP
 */

require('dotenv').config();

const express    = require('express');
const nodemailer = require('nodemailer');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const helmet      = require('helmet');
const compression = require('compression');
const path        = require('path');
const fs          = require('fs');
const { z }      = require('zod');
const pino       = require('pino');

/* ── Logger Pino ──────────────────────────────────────── */
const logger = pino(
  process.env.NODE_ENV === 'production'
    ? {}
    : { transport: { target: 'pino-pretty', options: { colorize: true } } }
);

/* ── Bootstrap : variables critiques ─────────────────── */
function bootstrap() {
  const required = ['MAIL_USER', 'MAIL_PASS', 'ALLOWED_ORIGIN'];
  const missing  = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    logger.warn({ missing }, 'Variables d\'environnement manquantes : ' + missing.join(', '));
  }

  const placeholders = { MAIL_USER: 'ton-email', MAIL_PASS: '' };
  for (const [key, placeholder] of Object.entries(placeholders)) {
    if (process.env[key] && (process.env[key].includes(placeholder) || process.env[key] === '')) {
      logger.warn(`⚠ ${key} contient un placeholder — l'envoi d'emails sera désactivé.`);
    }
  }

  if (!process.env.N8N_WEBHOOK_URL) {
    logger.warn('⚠ N8N_WEBHOOK_URL non défini — le webhook CRM sera désactivé.');
  }
}
bootstrap();

/* ── Persistance locale des leads ────────────────────── */
const LEADS_DIR  = path.join(__dirname, 'data');
const LEADS_FILE = path.join(LEADS_DIR, 'leads.json');

function ensureLeadsFile() {
  if (!fs.existsSync(LEADS_DIR)) fs.mkdirSync(LEADS_DIR, { recursive: true });
  if (!fs.existsSync(LEADS_FILE)) fs.writeFileSync(LEADS_FILE, '[]', 'utf-8');
}
ensureLeadsFile();

function saveLead(data) {
  try {
    const leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf-8'));
    const record = {
      ...data,
      receivedAt: new Date().toISOString(),
      id: `lead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };
    leads.push(record);
    fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), 'utf-8');
    logger.info({ name: data.prenom }, 'Lead sauvegardé localement');
    return record.id;
  } catch (err) {
    logger.error({ err: err.message }, 'Échec sauvegarde locale du lead');
    return null;
  }
}

function markLeadForwarded(id) {
  if (!id) return;
  try {
    const leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf-8'));
    const lead = leads.find((l) => l.id === id);
    if (lead) {
      lead.pipelineSentAt = new Date().toISOString();
      fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), 'utf-8');
    }
  } catch (err) {
    logger.warn({ err: err.message }, 'Échec marquage lead transmis');
  }
}

/* ── Rejeu automatique : leads jamais transmis au pipeline (VPS injoignable au moment T).
   Toutes les 10 min, on retente ceux sans pipelineSentAt. Filet anti-perte, zéro doublon. ── */
if (process.env.PIPELINE_INTAKE_URL) {
  setInterval(async () => {
    let pending = [];
    try {
      pending = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf-8')).filter((l) => !l.pipelineSentAt).slice(0, 10);
    } catch { return; }
    for (const lead of pending) {
      try {
        const res = await fetch(process.env.PIPELINE_INTAKE_URL, {
          method:  'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(process.env.PIPELINE_INTAKE_TOKEN ? { 'x-pipeline-token': process.env.PIPELINE_INTAKE_TOKEN } : {}),
          },
          body:    JSON.stringify(lead),
          signal:  AbortSignal.timeout(8000),
        });
        if (res.ok) {
          markLeadForwarded(lead.id);
          logger.info({ id: lead.id, name: lead.prenom }, 'Lead rejoué vers le pipeline');
        }
      } catch { /* pipeline toujours injoignable, on retentera */ }
    }
  }, 10 * 60 * 1000).unref();
}

/* ── App ──────────────────────────────────────────────── */
const app  = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

/* ── Redirection HTTPS en production ──────────────────── */
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.hostname}${req.originalUrl}`);
    }
    next();
  });
}

/* ── SEO : URLs canoniques (301) ───────────────────────────
   .html et slash final -> version propre. DOIT précéder express.static,
   qui sinon sert les .html en 200 (duplication de contenu indexable). */
const HTML_RENAMES = { '/lead.html': '/devis' };
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  const p = req.path;
  const qs = req.originalUrl.slice(p.length);
  if (HTML_RENAMES[p]) return res.redirect(301, HTML_RENAMES[p] + qs);
  if (p.endsWith('.html')) {
    let clean = p.slice(0, -5);
    if (clean.endsWith('/index')) clean = clean.slice(0, -6) || '/';
    return res.redirect(301, (clean || '/') + qs);
  }
  if (p.length > 1 && p.endsWith('/')) return res.redirect(301, p.slice(0, -1) + qs);
  next();
});

/* ── Helmet avec CSP explicite ────────────────────────── */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'"],
      styleSrc:    ["'self'", "'unsafe-inline'"],
      fontSrc:     ["'self'"],
      imgSrc:      ["'self'", 'data:', 'blob:'],
      connectSrc:  ["'self'", 'https://n8n.srv1263084.hstgr.cloud'],
      frameSrc:    ["'none'"],
      objectSrc:   ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
}));

/* ── Middlewares ──────────────────────────────────────── */
app.use(compression());
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

app.use(cors({
  origin:  process.env.ALLOWED_ORIGIN,
  methods: ['GET', 'POST'],
}));

app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0,
  etag: true,
  redirect: false, // pas de 301 /dir -> /dir/ : /blog et /portfolio servis directement par leurs routes propres
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
    if (/\.(js|css|svg|png|jpg|webp|woff2?)$/.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    }
  },
}));

/* ── Rate limiting ────────────────────────────────────── */
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Trop de tentatives. Réessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders:   false,
});

/* ── Transporteur Nodemailer ──────────────────────────── */
const transporter = nodemailer.createTransport({
  host:   process.env.MAIL_HOST || 'smtp.gmail.com',
  port:   parseInt(process.env.MAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

/* ── Schéma Zod ───────────────────────────────────────── */
const contactSchema = z.object({
  prenom: z.string()
    .trim()
    .min(2, 'Le nom doit contenir au moins 2 caractères.')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères.'),

  email: z.string()
    .trim()
    .email('Adresse email invalide.')
    .max(254, 'Email trop long.'),

  telephone: z.string()
    .trim()
    .max(30, 'Numéro trop long.')
    .optional()
    .or(z.literal('')),

  secteur: z.string()
    .trim()
    .max(200, 'Secteur trop long.')
    .optional()
    .or(z.literal('')),

  message: z.string()
    .trim()
    .min(10, 'Le message doit contenir au moins 10 caractères.')
    .max(5000, 'Le message ne peut pas dépasser 5000 caractères.'),

  // Honeypot — doit rester vide
  website: z.literal('').optional(),
});

/* ── Middleware de validation Zod ─────────────────────── */
function validateWith(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map(e => ({
        field:   e.path.join('.'),
        message: e.message,
      }));
      logger.warn({ errors, ip: req.ip }, 'Validation échouée');
      return res.status(400).json({ success: false, errors });
    }
    req.validatedBody = result.data;
    next();
  };
}

/* ── Utilitaire HTML ──────────────────────────────────── */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/* ── Template email HTML ──────────────────────────────── */
function buildEmailHTML(data) {
  const { prenom, email, telephone, secteur, message } = data;
  return `
  <!DOCTYPE html>
  <html lang="fr">
  <head>
    <meta charset="UTF-8">
    <style>
      body { font-family: 'Helvetica Neue', sans-serif; background: #0a0a0a; margin: 0; padding: 32px; }
      .card { max-width: 600px; margin: 0 auto; background: #141414; border: 1px solid #222; border-radius: 20px; overflow: hidden; }
      .header { background: linear-gradient(135deg, #DA5426, #f2b13b, #884083); padding: 32px; text-align: center; color: #fff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
      .body { padding: 32px; }
      .field { margin-bottom: 20px; }
      .label { font-size: 11px; font-weight: 700; color: #666; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 6px; }
      .value { font-size: 15px; color: #f0f0f0; line-height: 1.6; }
      .message-box { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; padding: 20px; font-size: 15px; color: #d0d0d0; line-height: 1.7; white-space: pre-wrap; }
      .badge { display: inline-block; background: rgba(218,84,38,0.2); border: 1px solid rgba(218,84,38,0.4); color: #f2b13b; padding: 4px 12px; border-radius: 100px; font-size: 12px; font-weight: 700; }
      .footer { padding: 20px 32px; border-top: 1px solid #1a1a1a; text-align: center; }
      .footer p { font-size: 12px; color: #444; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="header">🚀 Nouveau message | 4dayvelopment</div>
      <div class="body">
        <div class="field"><div class="label">Prénom</div><div class="value">${escapeHtml(prenom)}</div></div>
        <div class="field"><div class="label">Email</div><div class="value"><a href="mailto:${escapeHtml(email)}" style="color:#f2b13b">${escapeHtml(email)}</a></div></div>
        ${telephone ? `<div class="field"><div class="label">Téléphone</div><div class="value">${escapeHtml(telephone)}</div></div>` : ''}
        ${secteur   ? `<div class="field"><div class="label">Secteur</div><div class="value"><span class="badge">${escapeHtml(secteur)}</span></div></div>` : ''}
        <div class="field"><div class="label">Message</div><div class="message-box">${escapeHtml(message)}</div></div>
      </div>
      <div class="footer">
        <p>Reçu le ${new Date().toLocaleDateString('fr-FR', { weekday:'long', year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' })}</p>
      </div>
    </div>
  </body>
  </html>
  `;
}

/* ═══════════════════════════════════════════════════════
   ROUTES API
═══════════════════════════════════════════════════════ */

/* ── POST /api/contact ────────────────────────────────── */
app.post('/api/contact', contactLimiter, validateWith(contactSchema), async (req, res) => {
  const data = req.validatedBody;

  if (data.website) {
    logger.warn({ ip: req.ip }, 'Honeypot déclenché');
    return res.status(400).json({ success: false, message: 'Bot détecté.' });
  }

  // Sauvegarde locale systématique (filet de sécurité, anti-perte de lead)
  const localId = saveLead(data);

  // Émission du lead : nouveau pipeline en priorité (PIPELINE_INTAKE_URL + token),
  // fallback n8n (N8N_WEBHOOK_URL) tant que la bascule n'est pas finie. Non bloquant.
  const target = process.env.PIPELINE_INTAKE_URL || process.env.N8N_WEBHOOK_URL;
  if (target) {
    const isPipeline = Boolean(process.env.PIPELINE_INTAKE_URL);
    try {
      const webhookRes = await fetch(target, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(isPipeline && process.env.PIPELINE_INTAKE_TOKEN ? { 'x-pipeline-token': process.env.PIPELINE_INTAKE_TOKEN } : {}),
        },
        body:    JSON.stringify(data),
        signal:  AbortSignal.timeout(8000),
      });
      if (webhookRes.ok) {
        if (isPipeline) markLeadForwarded(localId);
        logger.info({ name: data.prenom, status: webhookRes.status, target: isPipeline ? 'pipeline' : 'n8n' }, 'Lead émis');
      } else {
        const detail = await webhookRes.text().catch(() => '');
        logger.warn({ name: data.prenom, status: webhookRes.status, detail: detail.slice(0, 200) }, 'Cible lead a répondu en erreur (non bloquant)');
      }
    } catch (webhookErr) {
      const reason = webhookErr.name === 'TimeoutError' ? 'timeout (8s)' : webhookErr.message;
      logger.warn({ name: data.prenom, err: reason }, 'Cible lead injoignable (non bloquant) — le lead reste dans data/leads.json');
    }
  } else {
    logger.warn({ name: data.prenom }, 'Aucune cible lead (ni PIPELINE_INTAKE_URL ni N8N_WEBHOOK_URL)');
  }

  const mailConfigured = process.env.MAIL_USER && !process.env.MAIL_USER.includes('ton-email');

  if (mailConfigured) {
    try {
      await transporter.sendMail({
        from:    `"4dayvelopment" <${process.env.MAIL_USER}>`,
        to:      process.env.MAIL_TO || process.env.MAIL_USER,
        replyTo: data.email,
        subject: `[Contact] ${data.secteur || 'Nouveau message'} · ${data.prenom}`,
        html:    buildEmailHTML(data),
      });

      await transporter.sendMail({
        from:    `"4dayvelopment" <${process.env.MAIL_USER}>`,
        to:      data.email,
        subject: '✅ On a bien reçu votre message !',
        html: `
          <div style="font-family:sans-serif;background:#0a0a0a;padding:32px;">
            <div style="max-width:500px;margin:0 auto;background:#141414;border-radius:20px;padding:40px;border:1px solid #222;">
              <h2 style="color:#f2b13b;font-size:22px;margin-bottom:16px;">Bonjour ${escapeHtml(data.prenom)} 👋</h2>
              <p style="color:#aaa;line-height:1.7;margin-bottom:24px;">
                Merci pour votre message ! Notre équipe l'a bien reçu et vous répondra <strong style="color:#f0f0f0">sous 24h</strong>.
              </p>
              <div style="background:rgba(218,84,38,0.1);border:1px solid rgba(218,84,38,0.2);border-radius:12px;padding:20px;margin-bottom:28px;">
                <p style="color:#f2b13b;font-size:13px;font-weight:700;margin-bottom:8px;">📋 VOTRE MESSAGE</p>
                <p style="color:#d0d0d0;font-size:14px;line-height:1.6;">${escapeHtml(data.message)}</p>
              </div>
              <p style="color:#555;font-size:13px;">En attendant, vous pouvez nous joindre directement sur WhatsApp ou consulter notre site.</p>
            </div>
          </div>
        `,
      });

      logger.info({ name: data.prenom, email: data.email }, 'Email envoyé avec succès');
    } catch (err) {
      logger.warn({ err: err.message }, 'Envoi email échoué (non bloquant)');
    }
  } else {
    logger.info({ name: data.prenom }, 'Email non configuré — skipped');
  }

  return res.json({ success: true, message: 'Message envoyé avec succès ! Nous vous répondons sous 24h.' });
});

/* ═══════════════════════════════════════════════════════
   BLOG — Publication depuis n8n
═══════════════════════════════════════════════════════ */

const BLOG_DIR    = path.join(__dirname, 'public', 'blog');
const SITEMAP_PATH = path.join(__dirname, 'public', 'sitemap.xml');
const BLOG_TOKEN  = process.env.N8N_BLOG_TOKEN || '';

const articleSchema = z.object({
  title:       z.string().trim().min(10).max(200),
  slug:        z.string().trim().min(3).max(120).regex(/^[a-z0-9-]+$/, 'Slug invalide (minuscules, chiffres, tirets uniquement)'),
  description: z.string().trim().min(20).max(300),
  category:    z.string().trim().max(50).optional().default('Guide'),
  content:     z.string().trim().min(100),
  readTime:    z.string().trim().max(20).optional().default('5 min de lecture'),
  faq:         z.array(z.object({
    question: z.string().trim().min(3).max(300),
    answer:   z.string().trim().min(3).max(2000),
  })).max(20).optional(),
});

function buildArticleHTML(data) {
  const { title, slug, description, category, content, readTime, faq } = data;
  const date     = new Date().toISOString().split('T')[0];
  const dateFR   = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const url      = `https://4dayvelopment.fr/blog/${slug}`;

  const faqHtml = (faq && faq.length) ? `
        <section style="margin-top:50px;">
          <h2 style="color:#e8e8e8;font-size:1.8rem;margin-bottom:24px;">Questions fréquentes</h2>
          ${faq.map(f => `<div style="margin-bottom:22px;">
            <h3 style="color:#e8e8e8;font-size:1.2rem;margin-bottom:8px;">${escapeHtml(f.question)}</h3>
            <p style="color:#bbb;line-height:1.8;">${escapeHtml(f.answer)}</p>
          </div>`).join('')}
        </section>` : '';

  const faqJsonLd = (faq && faq.length) ? `
  <script type="application/ld+json">
  ${JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(f => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })) })}
  </script>` : '';

  return `<!DOCTYPE html>
<html lang="fr" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>${escapeHtml(title)} | 4dayvelopment</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
  <meta name="theme-color" content="#DA5426">
  <link rel="canonical" href="${url}">

  <meta property="og:type" content="article">
  <meta property="og:site_name" content="4dayvelopment">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="https://4dayvelopment.fr/og-image.jpg">
  <meta property="og:locale" content="fr_FR">
  <meta property="article:published_time" content="${date}">
  <meta property="article:modified_time" content="${date}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="https://4dayvelopment.fr/og-image.jpg">

  <link rel="icon" href="/favicon.ico" sizes="32x32">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="manifest" href="/manifest.json">
  <link rel="preload" as="font" type="font/woff2" href="/fonts/syne-var.woff2" crossorigin>
  <link rel="preload" as="font" type="font/woff2" href="/fonts/inter-var.woff2" crossorigin>
  <link rel="stylesheet" href="/style.css">
</head>
<body>

  <nav id="navbar">
    <a href="/" class="nav-logo">
      <img src="/logo/logo4day.webp" alt="4dayvelopment" class="logo-img" width="160" height="40">
    </a>
    <ul class="nav-links">
      <li><a href="https://4dayvelopment.fr/services/site-vitrine">Site Vitrine</a></li>
      <li><a href="https://4dayvelopment.fr/services/e-commerce">E-commerce</a></li>
      <li><a href="https://4dayvelopment.fr/services/referencement-seo">SEO</a></li>
      <li><a href="https://4dayvelopment.fr/portfolio">Portfolio</a></li>
      <li><a href="https://4dayvelopment.fr/#tarifs">Tarifs</a></li>
      <li><a href="https://4dayvelopment.fr/blog" class="active">Blog</a></li>
    </ul>
    <div class="nav-right">
      <a href="https://4dayvelopment.fr/#contact" class="nav-cta">Devis gratuit →</a>
    </div>
    <button class="hamburger" id="hamburger" aria-label="Menu"><span></span><span></span><span></span></button>
  </nav>

  <main>

  <section class="hero" style="min-height:auto;padding:140px 24px 60px;">
    <div class="container" style="max-width:800px;">

      <nav aria-label="Fil d'Ariane" class="breadcrumb" style="margin-top:24px;">
        <ol itemscope itemtype="https://schema.org/BreadcrumbList" style="display:flex;flex-wrap:wrap;gap:8px;list-style:none;padding:0;font-size:14px;color:#666;">
          <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
            <a itemprop="item" href="/" style="color:#888;text-decoration:none;"><span itemprop="name">Accueil</span></a>
            <meta itemprop="position" content="1"><span style="margin-left:8px;color:#444;">›</span>
          </li>
          <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
            <a itemprop="item" href="/blog" style="color:#888;text-decoration:none;"><span itemprop="name">Blog</span></a>
            <meta itemprop="position" content="2"><span style="margin-left:8px;color:#444;">›</span>
          </li>
          <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
            <span itemprop="name" style="color:#f2b13b;">${escapeHtml(title)}</span>
            <meta itemprop="position" content="3">
          </li>
        </ol>
      </nav>

      <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-top:20px;margin-bottom:20px;">
        <span style="background:rgba(218,84,38,0.15);color:#f2b13b;padding:4px 12px;border-radius:100px;font-size:12px;font-weight:600;">${escapeHtml(category)}</span>
        <time datetime="${date}" style="font-size:13px;color:#666;">${dateFR}</time>
        <span style="font-size:13px;color:#666;">· ${escapeHtml(readTime)}</span>
      </div>

      <h1 class="hero-title reveal" style="font-size:clamp(2rem,5vw,3.2rem);margin-top:0;line-height:1.2;">${escapeHtml(title)}</h1>
      <p class="hero-desc reveal" style="max-width:700px;">${escapeHtml(description)}</p>
    </div>
  </section>

  <article style="padding:20px 0 80px;">
    <div class="container" style="max-width:800px;">
      <div style="color:#bbb;line-height:1.9;font-size:16px;">
        ${content}
      </div>
${faqHtml}
      <div style="background:rgba(218,84,38,0.08);border:1px solid rgba(218,84,38,0.2);border-radius:14px;padding:28px;margin:40px 0;text-align:center;">
        <p style="font-size:18px;color:#e8e8e8;font-weight:700;margin-bottom:12px;">Un projet en tête ?</p>
        <p style="font-size:14px;color:#888;margin-bottom:20px;">Devis gratuit sous 24h · Livraison en 4 jours · Sans engagement</p>
        <a href="/#contact" class="btn-primary magnetic" style="display:inline-flex;">Demander mon devis gratuit →</a>
      </div>

      <a href="/blog" style="color:#f2b13b;font-weight:600;font-size:14px;text-decoration:none;">← Retour au blog</a>
    </div>
  </article>

  </main>

  <footer>
    <div class="footer-inner">
      <div class="footer-brand">
        <a href="/" class="footer-logo"><img src="/logo/logo4day.webp" alt="4dayvelopment" class="logo-img" width="160" height="40"></a>
        <p>Un site qui vend, livré en 4 jours.</p>
      </div>
      <div class="footer-links-group">
        <p class="footer-col-h">Services</p>
        <ul>
          <li><a href="/services/site-vitrine">Site Vitrine</a></li>
          <li><a href="/services/e-commerce">E-commerce</a></li>
          <li><a href="/services/referencement-seo">SEO</a></li>
        </ul>
      </div>
      <div class="footer-links-group">
        <p class="footer-col-h">Agence</p>
        <ul>
          <li><a href="/#process">Processus</a></li>
          <li><a href="/#tarifs">Tarifs</a></li>
          <li><a href="/blog">Blog</a></li>
        </ul>
      </div>
      <div class="footer-links-group">
        <p class="footer-col-h">Contact</p>
        <ul>
          <li><a href="/#contact">Prendre RDV</a></li>
          <li><a href="mailto:contact@4dayvelopment.fr">contact@4dayvelopment.fr</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; 2026 4dayvelopment. Tous droits réservés.</p>
    </div>
  </footer>

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "${escapeHtml(title)}",
    "description": "${escapeHtml(description)}",
    "datePublished": "${date}",
    "dateModified": "${date}",
    "author": { "@type": "Organization", "name": "4dayvelopment", "url": "https://4dayvelopment.fr/" },
    "publisher": {
      "@type": "Organization",
      "name": "4dayvelopment",
      "logo": { "@type": "ImageObject", "url": "https://4dayvelopment.fr/logo/logo4day.png" }
    },
    "mainEntityOfPage": { "@type": "WebPage", "@id": "${url}" }
  }
  </script>
${faqJsonLd}

  <script src="/js/vendor/three-loader.js" defer></script>
  <script type="module" src="/js/main.js"></script>
</body>
</html>`;
}

function addToSitemap(slug) {
  try {
    let sitemap = fs.readFileSync(SITEMAP_PATH, 'utf-8');
    const url = `https://4dayvelopment.fr/blog/${slug}`;
    if (sitemap.includes(url)) return;
    const entry = `
  <url>
    <loc>${url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </url>
`;
    sitemap = sitemap.replace('</urlset>', entry + '</urlset>');
    fs.writeFileSync(SITEMAP_PATH, sitemap, 'utf-8');
    logger.info({ slug }, 'Sitemap mis a jour');
  } catch (err) {
    logger.warn({ err: err.message }, 'Echec mise a jour sitemap');
  }
}

function addToBlogIndex(data) {
  try {
    const indexPath = path.join(BLOG_DIR, 'index.html');
    let html = fs.readFileSync(indexPath, 'utf-8');
    const date   = new Date().toISOString().split('T')[0];
    const dateFR = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

    const card = `
      <!-- Article: ${escapeHtml(data.slug)} -->
      <article style="background:#141414;border:1px solid #222;border-radius:16px;padding:32px;margin-bottom:24px;">
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;">
          <span style="background:rgba(218,84,38,0.15);color:#f2b13b;padding:4px 12px;border-radius:100px;font-size:12px;font-weight:600;">${escapeHtml(data.category)}</span>
          <time datetime="${date}" style="font-size:13px;color:#666;">${dateFR}</time>
          <span style="font-size:13px;color:#666;">· ${escapeHtml(data.readTime)}</span>
        </div>
        <h2 style="font-size:1.5rem;margin-bottom:12px;">
          <a href="/blog/${escapeHtml(data.slug)}" style="color:#e8e8e8;text-decoration:none;">${escapeHtml(data.title)}</a>
        </h2>
        <p style="color:#888;line-height:1.7;margin-bottom:16px;">${escapeHtml(data.description)}</p>
        <a href="/blog/${escapeHtml(data.slug)}" style="color:#f2b13b;font-weight:600;font-size:14px;text-decoration:none;">Lire l'article →</a>
      </article>`;

    // Inserer apres le premier <div class="container"> de la section articles
    const marker = '<div class="container" style="max-width:900px;">';
    const insertPos = html.indexOf(marker);
    if (insertPos !== -1) {
      const afterMarker = insertPos + marker.length;
      html = html.slice(0, afterMarker) + '\n' + card + html.slice(afterMarker);
      fs.writeFileSync(indexPath, html, 'utf-8');
      logger.info({ slug: data.slug }, 'Index blog mis a jour');
    }
  } catch (err) {
    logger.warn({ err: err.message }, 'Echec mise a jour index blog');
  }
}

/* ── POST /api/blog/publish ──────────────────────────── */
app.post('/api/blog/publish', apiLimiter, validateWith(articleSchema), (req, res) => {
  // Auth par token partage
  const token = req.headers['x-blog-token'] || req.query.token || '';
  if (!BLOG_TOKEN || token !== BLOG_TOKEN) {
    logger.warn({ ip: req.ip }, 'Blog publish — token invalide');
    return res.status(401).json({ success: false, message: 'Token invalide.' });
  }

  const data = req.validatedBody;
  const filePath = path.join(BLOG_DIR, `${data.slug}.html`);

  // Eviter d'ecraser un article existant
  if (fs.existsSync(filePath)) {
    return res.status(409).json({ success: false, message: `L'article "${data.slug}" existe deja.` });
  }

  try {
    fs.writeFileSync(filePath, buildArticleHTML(data), 'utf-8');

    // La route propre /blog/:slug (generique, enregistree avant le catch-all 404)
    // sert automatiquement le fichier de l'article : aucun enregistrement dynamique necessaire.

    addToSitemap(data.slug);
    addToBlogIndex(data);

    logger.info({ slug: data.slug, title: data.title }, 'Article publie avec succes');
    return res.json({
      success: true,
      message: 'Article publie.',
      url: `https://4dayvelopment.fr/blog/${data.slug}`,
    });
  } catch (err) {
    logger.error({ err: err.message }, 'Echec publication article');
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

/* ── GET /api/blog/list ──────────────────────────────── */
app.get('/api/blog/list', apiLimiter, (req, res) => {
  try {
    const files = fs.readdirSync(BLOG_DIR)
      .filter(f => f.endsWith('.html') && f !== 'index.html')
      .map(f => {
        const slug = f.replace('.html', '');
        const stat = fs.statSync(path.join(BLOG_DIR, f));
        return { slug, url: `/blog/${slug}`, createdAt: stat.birthtime };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ success: true, count: files.length, articles: files });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur lecture articles.' });
  }
});

/* ── URLs propres (sans .html) ────────────────────────── */
const cleanPages = {
  '/essentiel':      'essentiel.html',
  '/devis':          'lead.html',
  '/services/site-vitrine':  'services/site-vitrine.html',
  '/services/e-commerce':    'services/e-commerce.html',
  '/services/referencement-seo': 'services/referencement-seo.html',
  '/services/site-internet-restaurant': 'services/site-internet-restaurant.html',
  '/portfolio':       'portfolio.html',
  '/mentions-legales': 'mentions-legales.html',
  '/confidentialite': 'confidentialite.html',
  '/cgv':            'cgv.html',
  '/blog':           'blog/index.html',
  '/blog/combien-coute-site-internet-2026': 'blog/combien-coute-site-internet-2026.html',
};

// Servir les URLs propres
for (const [route, file] of Object.entries(cleanPages)) {
  app.get(route, (req, res) => {
    const filePath = path.join(__dirname, 'public', file);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
    }
  });
}

/* ── Articles de blog : route propre generique (AVANT le catch-all 404) ── */
// Sert public/blog/<slug>.html pour tout article (existant ou publie via l'API),
// afin que /blog/:slug reponde 200 a son URL propre. Slug valide uniquement
// (minuscules/chiffres/tirets) -> pas de traversee de repertoire.
app.get('/blog/:slug', (req, res) => {
  const { slug } = req.params;
  if (slug === 'index' || !/^[a-z0-9-]+$/.test(slug)) {
    return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
  }
  const filePath = path.join(BLOG_DIR, `${slug}.html`);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
  }
});

/* ── Fallback → 404 ──────────────────────────────────── */
app.get('/{*splat}', (req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

/* ── Démarrage ────────────────────────────────────────── */
app.listen(PORT, () => {
  logger.info({ port: PORT }, '4DAYVELOPMENT — Server actif');
});