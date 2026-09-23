// Suivi IA : ce qui est compté, ce qui ne l'est pas, et l'agrégat hebdomadaire.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { classify } = require('../ia-log.js');
const { parseCsv, aggregate } = require('../scripts/export-ia.js');

const req = (over) => ({ method: 'GET', path: '/', userAgent: 'Mozilla/5.0 Chrome/140', referer: '', utmSource: '', ...over });

test('classify : robots IA reconnus par leur UA, casse comprise', () => {
  assert.deepEqual(classify(req({ userAgent: 'Mozilla/5.0 (compatible; GPTBot/1.3; +https://openai.com/gptbot)' })), { type: 'bot', agent: 'GPTBot', path: '/' });
  assert.equal(classify(req({ userAgent: 'Mozilla/5.0 (compatible; bingbot/2.0)' })).agent, 'Bingbot');
  assert.equal(classify(req({ userAgent: 'Claude-SearchBot/1.0' })).agent, 'Claude-SearchBot');
  assert.equal(classify(req({ userAgent: 'Mozilla/5.0 ChatGPT-User/1.0', referer: 'https://chatgpt.com/' })).type, 'bot');
});

test('classify : un robot qui charge un asset n\'est pas compté', () => {
  assert.equal(classify(req({ userAgent: 'ClaudeBot/1.0', path: '/style.css' })), null);
  assert.equal(classify(req({ userAgent: 'ClaudeBot/1.0', path: '/robots.txt' })).agent, 'ClaudeBot');
});

test('classify : visites envoyées par un assistant, via Referer ou utm_source', () => {
  assert.deepEqual(classify(req({ referer: 'https://www.perplexity.ai/search?q=x', path: '/essentiel' })), { type: 'referral', agent: 'perplexity.ai', path: '/essentiel' });
  assert.equal(classify(req({ referer: 'https://chat.mistral.ai/chat' })).agent, 'chat.mistral.ai');
  assert.equal(classify(req({ utmSource: 'chatgpt.com' })).agent, 'chatgpt.com');
  assert.equal(classify(req({ referer: 'https://www.google.com/' })), null);
  assert.equal(classify(req({ referer: 'https://notclaude.ai/' })), null);   // pas de faux positif par suffixe
  assert.equal(classify(req({ method: 'POST', referer: 'https://claude.ai/' })), null);
});

test('export : CSV Sheets cité, puis agrégat sur la fenêtre demandée', () => {
  const csv = [
    '"ts","type","agent","path","status"',
    '"2026-09-20T10:00:00Z","bot","GPTBot","/","200"',
    '"2026-09-21T10:00:00Z","bot","GPTBot","/","200"',
    '"2026-09-21T11:00:00Z","referral","chatgpt.com","/services/site-vitrine","200"',
    '"2026-08-01T11:00:00Z","referral","claude.ai","/","200"',
  ].join('\n');
  const agg = aggregate(parseCsv(csv), new Date('2026-09-16'));
  assert.equal(agg.total, 3);
  assert.deepEqual(agg.referralsByAgent, [['chatgpt.com', 1]]);
  assert.deepEqual(agg.botsByAgentStatus, [['GPTBot | 200', 2]]);
});
