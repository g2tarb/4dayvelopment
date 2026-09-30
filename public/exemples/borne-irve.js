/* Deûle Électricité (démo 4dayvelopment) : configurateur de borne en 3 étapes.
   Le choix du parcours, des étapes et du disjoncteur marche en CSS seul (:has) ; ce script calcule
   la puissance conseillée, les temps de recharge et le forfait, anime le dessin et remplit la
   demande de visite. Aucun envoi réseau : c'est une démonstration. */
(() => {
  'use strict';
  const NB = '\u00A0', FINE = '\u202F'; // espace insécable, espace fine insécable
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const nombre = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
  const euros = (n) => `${Math.round(n).toLocaleString('fr-FR').replace(/\s/g, FINE)}${NB}€`;
  /* 16,2 h donne « 16 h 13 » : la même règle que les temps de charge vérifiés (60 kWh) */
  const duree = (h) => {
    const min = Math.round(h * 60);
    return min < 60 ? `${min}${NB}min` : `${Math.floor(min / 60)}${NB}h${NB}${String(min % 60).padStart(2, '0')}`;
  };

  /* ---------- Les puissances et nos tarifs (entreprise fictive) ---------- */
  const P = {
    '3.7': { lib: `3,7${NB}kW`, tri: false, courant: `16${NB}A`, reseau: `Monophasé, 230${NB}V, 16${NB}A.`, nom: `Borne murale 3,7${NB}kW, monophasée` },
    '7.4': { lib: `7,4${NB}kW`, tri: false, courant: `32${NB}A`, reseau: `Monophasé, 230${NB}V, 32${NB}A.`, nom: `Borne murale 7,4${NB}kW, monophasée, avec câble attaché` },
    '11': { lib: `11${NB}kW`, tri: true, courant: `3${NB}×${NB}16${NB}A`, reseau: `Triphasé, 400${NB}V, 3${NB}×${NB}16${NB}A.`, nom: `Borne murale 11${NB}kW, triphasée, avec câble attaché` },
    '22': { lib: `22${NB}kW`, tri: true, courant: `3${NB}×${NB}32${NB}A`, reseau: `Triphasé, 400${NB}V, 3${NB}×${NB}32${NB}A.`, nom: `Borne 22${NB}kW, triphasée, sur pied ou murale` },
  };
  const TARIFS = {
    maison: { taxe: 'TTC', base: { '3.7': 1090, '7.4': 1390, '11': 1690, '22': 2190 }, metre: 29, tranchee: 45 },
    copro: { taxe: 'HT', base: { '3.7': 990, '7.4': 1290, '11': 1590, '22': 2090 }, metre: 24 },
    entreprise: { taxe: 'HT', base: { '3.7': 1190, '7.4': 1390, '11': 1590, '22': 2090 }, metre: 24, tranchee: 38, pilotage: 790 },
  };
  const LIEU = { maison: 'Maison', copro: 'Copropriété', entreprise: 'Entreprise' };
  const KWH_100KM = 20; // hypothèse de calcul affichée sous le curseur
  const CABLE_INCLUS = 10;

  const val = (nom) => $(`input[name="${nom}"]:checked`)?.value;
  let force = null;    // puissance choisie sur le rail, à la place du conseil
  let origine = null;  // commune du chantier rechargé

  const lire = () => ({
    parcours: val('parcours') || 'maison',
    batterie: Number(val('batterie') || 60),
    km: Number($('#km').value),
    points: Math.min(20, Math.max(1, Number($('#points').value) || 1)),
    phase: val('phase') || 'mono',
    distance: Number($('#distance').value),
    tranchee: $('#tranchee').checked,
  });

  /* Conseil : la plus petite puissance qui rend le trajet du jour en 4 h au plus.
     En monophasé, une grande batterie (80 kWh) passe directement à 7,4 kW. */
  const conseil = (c) => {
    const besoin = c.km * KWH_100KM / 100;
    if (c.phase === 'tri') return besoin / 11 <= 4 ? '11' : '22';
    return besoin / 3.7 <= 4 && c.batterie < 80 ? '3.7' : '7.4';
  };

  const chiffrer = (c, kw) => {
    const t = TARIFS[c.parcours];
    const lignes = [];
    const enPlus = Math.max(0, c.distance - CABLE_INCLUS);
    let total;
    if (c.parcours === 'entreprise') {
      total = t.base[kw] * c.points;
      lignes.push([`${c.points}${NB}point${c.points > 1 ? 's' : ''} de recharge à ${euros(t.base[kw])}, pose et mise en service`, euros(total)]);
      if (c.points > 1) { total += t.pilotage; lignes.push(['Pilotage de la puissance partagée', euros(t.pilotage)]); }
    } else {
      total = t.base[kw];
      lignes.push([c.parcours === 'copro'
        ? `Borne, protection, 10${NB}m de câble, dossier du droit à la prise et mise en service`
        : `Borne, protection au tableau, 10${NB}m de câble et mise en service`, euros(total)]);
    }
    if (enPlus) { total += enPlus * t.metre; lignes.push([`Câble au-delà de 10${NB}m, ${enPlus}${NB}m à ${euros(t.metre)}`, euros(enPlus * t.metre)]); }
    if (c.tranchee && t.tranchee) lignes.push([`Tranchée, ${euros(t.tranchee)}${NB}${t.taxe} le mètre`, 'à la visite']);
    let prime = 0;
    if (c.parcours === 'copro') {
      prime = Math.min(total * 0.5, 1000);
      lignes.push([`Prime ADVENIR estimée, 50${NB}% jusqu’à 1${FINE}000${NB}€${NB}HT`, `−${NB}${euros(prime)}`, 'deduire']);
    }
    return { lignes, total: total - prime, taxe: t.taxe, libelle: c.parcours === 'copro' ? 'Reste à charge, à partir de' : 'Forfait posé, à partir de' };
  };

  /* Abonnement et pose : les faits vérifiés de chaque puissance, selon le lieu */
  const abonnement = (kw, parcours) => {
    if (kw === '11') return 'Il faut un compteur triphasé. Si le tien est monophasé, le passage se demande à ton fournisseur d’électricité, qui transmet à Enedis.';
    if (kw === '22') return 'Triphasé, avec une forte puissance souscrite. Rare en maison, courant en parking d’entreprise.';
    if (parcours === 'entreprise') return 'Alimentation calculée pour tous les points, avec un pilotage qui partage la puissance disponible entre les voitures branchées.';
    return kw === '3.7' ? 'Ta puissance souscrite actuelle suffit souvent.'
      : 'Souvent à augmenter, sauf si la borne module sa charge selon la consommation de la maison.';
  };
  const pose = (kw, parcours) => {
    if (kw !== '3.7') return 'Par un électricien qualifié IRVE, obligatoire.';
    if (parcours === 'entreprise') return 'Par un électricien qualifié IRVE, obligatoire en entreprise, même à cette puissance.';
    if (parcours === 'copro') return 'La qualification IRVE est exigée pour toucher la prime ADVENIR. Nos quatre électriciens l’ont.';
    return 'En logement privé, la qualification IRVE n’est pas exigée à cette puissance. Elle l’est en entreprise, et pour toucher la prime ADVENIR. On pose avec le même soin.';
  };

  const ecrire = (id, txt) => { const el = document.getElementById(id); if (el && el.textContent !== txt) el.textContent = txt; };
  const lignesDl = (dl, lignes, classe) => dl.replaceChildren(...lignes.map(([dt, dd, cl]) => {
    const div = document.createElement('div');
    if (cl || classe) div.className = cl || classe;
    const t = document.createElement('dt'); t.textContent = dt;
    const d = document.createElement('dd'); d.textContent = dd;
    div.append(t, d);
    return div;
  }));

  /* ---------- Le dessin : la borne s'éloigne du tableau avec la distance ---------- */
  const dessin = $('#dessin');
  const dessiner = (c, kw) => {
    const xB = Math.round(150 + (c.distance - 2) / 38 * 210);
    const xC = xB + 30;
    const trajet = c.tranchee && c.parcours !== 'copro' ? `M66 170V274H${xC}V190` : `M66 170V214H${xC}V190`;
    $('#borne').setAttribute('transform', `translate(${xB} 94)`);
    $('#cable').setAttribute('d', trajet);
    $('#goulotte').setAttribute('d', trajet);
    $('#tranchee-trace').setAttribute('width', Math.max(0, xC + 6 - 60));
    $('#cable-voiture').setAttribute('d', `M${xC} 178C${xC + 10} 272 440 270 474 226`);
    $('#cote-ligne').setAttribute('d', `M66 238H${xC}M66 232v12M${xC} 232v12`);
    const milieu = (66 + xC) / 2;
    $('#cote-fond').setAttribute('x', milieu - 26);
    $('#cote-txt').setAttribute('x', milieu);
    ecrire('cote-txt', `${c.distance}${NB}m`);
    ecrire('ecran-kw', P[kw].lib);
    ecrire('badge-txt', `×${NB}${c.points}${NB}point${c.points > 1 ? 's' : ''}`);
    $('#badge-points').setAttribute('transform', `translate(${xB - 253} 0)`);
    dessin.dataset.kw = kw;
    dessin.dataset.phase = P[kw].tri ? 'tri' : 'mono';
    dessin.classList.toggle('en-tranchee', c.tranchee && c.parcours !== 'copro');
  };

  /* ---------- Tout se recalcule à chaque réponse ---------- */
  const rail = $('#rail');
  const pct = (input) => input.style.setProperty('--pct', `${(input.value - input.min) / (input.max - input.min) * 100}%`);
  let dernier = null, minuteur = 0, etat = null;

  const rendre = () => {
    const c = lire();
    const reco = conseil(c);
    const kw = force || reco;
    const p = P[kw];
    const besoin = c.km * KWH_100KM / 100;
    const devis = chiffrer(c, kw);
    const perso = c.parcours !== 'entreprise';
    etat = { c, kw, reco, devis };

    dessiner(c, kw);
    ['km', 'distance'].forEach((id) => pct(document.getElementById(id)));
    ecrire('km-sortie', `${c.km}${NB}km`);
    ecrire('distance-sortie', `${c.distance}${NB}m`);

    /* relevés sous le dessin */
    ecrire('r-kw', p.lib);
    ecrire('r-kw-d', `${p.tri ? 'triphasé' : 'monophasé'}, ${p.courant}`);
    ecrire('r-jour', duree(besoin / Number(kw)));
    ecrire('r-jour-d', `${c.km}${NB}km, soit ${nombre.format(besoin)}${NB}kWh`);
    ecrire('r-plein', duree(c.batterie / Number(kw)));
    ecrire('r-plein-d', `batterie de ${c.batterie}${NB}kWh`);
    if (dernier && dernier !== kw) { const s = $('#r-kw'); s.classList.remove('bouge'); void s.offsetWidth; s.classList.add('bouge'); }
    dernier = kw;
    const part = Math.min(100, Math.round(besoin / c.batterie * 100));
    const boitier = $('#batterie-boitier');
    boitier.style.setProperty('--cap', String(c.batterie / 80 * 100));
    boitier.style.setProperty('--jour', String(part));
    ecrire('batterie-txt', `${perso ? 'Ton trajet du jour prend' : 'Le trajet du jour de chaque véhicule prend'} ${part}${NB}% de ${perso ? 'ta' : 'sa'} batterie.`);

    /* étape 3 */
    ecrire('reco-nom', c.parcours === 'entreprise' ? `${c.points}${NB}×${NB}${p.nom.charAt(0).toLowerCase()}${p.nom.slice(1)}` : p.nom);
    const h = duree(besoin / Number(kw));
    let pourquoi;
    if (origine) pourquoi = `C’est la configuration du chantier de ${origine}.${kw !== reco ? ` Pour tes ${c.km}${NB}km par jour, on te conseillerait ${P[reco].lib}.` : ''}`;
    else if (kw !== reco) pourquoi = `Tu compares avec ${p.lib}. Pour ta configuration, notre conseil reste ${P[reco].lib}.`;
    else if (kw === '3.7') pourquoi = `Pour ${c.km}${NB}km par jour, 3,7${NB}kW suffit${FINE}: ${h} de charge par nuit.`;
    else if (kw === '7.4' && c.batterie >= 80 && besoin / 3.7 <= 4) pourquoi = `Avec une batterie de 80${NB}kWh, 7,4${NB}kW la remplit en ${duree(80 / 7.4)}, une nuit.`;
    else pourquoi = `${perso ? `Tes ${c.km}${NB}km du jour se rechargent` : `Chaque véhicule récupère ses ${c.km}${NB}km du jour`} en ${h}${perso ? '' : ' à pleine puissance'}${FINE}: une nuit suffit.`;
    ecrire('reco-pourquoi', pourquoi);
    rail.dataset.conseil = reco;
    ecrire('produit-kw', p.lib);
    $('#produit').dataset.kw = kw;
    const radio = $(`input[name="kw"][value="${kw}"]`);
    if (radio && !radio.checked) radio.checked = true;
    $('#avis-tri').hidden = !(p.tri && c.phase !== 'tri');
    lignesDl($('#lignes'), [...devis.lignes, [devis.libelle, `${euros(devis.total)}${NB}${devis.taxe}`, 'total']]);
    lignesDl($('#conditions'), [['Réseau', p.reseau], ['Abonnement', abonnement(kw, c.parcours)], ['Pose', pose(kw, c.parcours)]]);

    /* résumé du bas */
    const phaseLib = { mono: 'monophasé', tri: 'triphasé', inconnu: 'compteur à vérifier' }[c.phase];
    ecrire('resume-config', `${LIEU[c.parcours]}, batterie de ${c.batterie}${NB}kWh, ${c.km}${NB}km par jour, ${phaseLib}, ${c.distance}${NB}m de câble${perso ? '' : `, ${c.points}${NB}points`}`);
    ecrire('resume-kw', perso ? p.lib : `${c.points}${NB}×${NB}${p.lib}`);
    $('.resume-montant small').textContent = c.parcours === 'copro' ? 'Reste à charge dès' : 'Forfait posé dès';
    ecrire('resume-prix', `${euros(devis.total)}${NB}${devis.taxe}`);

    clearTimeout(minuteur);
    minuteur = setTimeout(() => ecrire('annonce', `${p.lib}${kw === reco ? ' conseillés' : ''}. Trajet du jour rechargé en ${h}. ${devis.libelle} ${euros(devis.total)} ${devis.taxe}.`), 700);
  };

  /* ---------- Étapes : Continuer, Retour, et le bouton du résumé ---------- */
  const avancer = $('#avancer'), retour = $('#retour');
  const config = $('#configurateur');
  let configVisible = true;
  const etape = () => Number(val('etape') || 1);
  const majBoutons = () => {
    const n = etape();
    retour.hidden = n === 1;
    avancer.textContent = n === 3 || !configVisible ? 'Demander une visite' : 'Continuer';
  };
  const allerA = (n, focus = true) => {
    $(`input[name="etape"][value="${n}"]`).checked = true;
    majBoutons();
    if (!focus) return;
    const titre = $(`.etape[data-etape="${n}"] .etape-t`);
    /* sur téléphone, les étapes reviennent sous les yeux si on les avait quittées */
    const nav = $('.etapes-nav').getBoundingClientRect();
    if (nav.top < 0 || nav.top > innerHeight * .6) $('.etapes-nav').scrollIntoView({ block: 'start' });
    titre.focus({ preventScroll: true });
  };
  avancer.addEventListener('click', () => {
    if (etape() < 3 && configVisible) allerA(etape() + 1);
    else ouvrirVisite();
  });
  retour.addEventListener('click', () => allerA(Math.max(1, etape() - 1)));
  $$('input[name="etape"]').forEach((r) => r.addEventListener('change', majBoutons));
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { configVisible = e.isIntersecting; majBoutons(); }, { rootMargin: '0px 0px -20% 0px' }).observe(config);
  }

  /* une réponse qui change le besoin efface la puissance choisie à la main */
  document.addEventListener('input', (e) => {
    const n = e.target.name;
    if (['parcours', 'batterie', 'km', 'phase', 'points'].includes(n)) { force = null; origine = null; }
    if (n === 'kw') { force = e.target.value; origine = null; }
    if (['parcours', 'batterie', 'km', 'phase', 'points', 'distance', 'tranchee', 'kw'].includes(n)) rendre();
  });
  $$('.pas').forEach((b) => b.addEventListener('click', () => {
    const input = $('#points');
    input.value = Math.min(20, Math.max(1, (Number(input.value) || 1) + Number(b.dataset.pas)));
    force = null; origine = null;
    rendre();
  }));
  $('#points').addEventListener('change', (e) => { e.target.value = lire().points; rendre(); });

  /* ---------- Chantiers : chaque fiche se recharge dans le configurateur ---------- */
  $$('.essayer').forEach((b) => b.addEventListener('click', () => {
    const d = b.closest('.chantier').dataset;
    $(`input[name="parcours"][value="${d.parcours}"]`).checked = true;
    $(`input[name="phase"][value="${d.phase}"]`).checked = true;
    $('#distance').value = d.distance;
    $('#tranchee').checked = d.tranchee === '1';
    if (d.points) $('#points').value = d.points;
    force = d.kw;
    origine = b.closest('.chantier').querySelector('.chantier-lieu strong').textContent;
    rendre();
    config.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    allerA(3, false);
    $('#resultat-t').focus({ preventScroll: true });
  }));

  /* ---------- État de l'atelier et premier jour de visite ---------- */
  const longue = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const courte = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });
  const jourMois = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
  const insecable = (s) => s.replace(/(^|\s)1(\s)/, '$11er$2').replace(/(\d|er) /g, `$1${NB}`);
  const joursOuvres = (n) => {
    const out = [], d = new Date();
    while (out.length < n) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() !== 0 && d.getDay() !== 6) out.push(new Date(d));
    }
    return out;
  };
  const maintenant = new Date();
  const minutes = maintenant.getHours() * 60 + maintenant.getMinutes();
  const ouvert = maintenant.getDay() >= 1 && maintenant.getDay() <= 5 && minutes >= 450 && minutes < 1050;
  const jourVisite = joursOuvres(2)[1];
  const abrege = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  $$('.statut').forEach((p) => {
    p.classList.toggle('ouvert', ouvert);
    p.querySelector('.statut-txt').textContent = p.classList.contains('statut-scene')
      ? `Atelier ${ouvert ? 'ouvert' : 'fermé'}, visite dès le ${insecable(abrege.format(jourVisite))}`
      : `Atelier ${ouvert ? 'ouvert' : 'fermé'}, visites possibles dès le ${insecable(longue.format(jourVisite))}`;
  });

  /* ---------- Demande de visite, préremplie avec la configuration ---------- */
  const dlg = $('#visite');
  const vform = $('#visite-form');
  const jours = $('#jours');
  joursOuvres(6).forEach((j) => {
    const label = document.createElement('label');
    label.className = 'tuile';
    const input = document.createElement('input');
    input.type = 'radio'; input.name = 'jour'; input.value = insecable(longue.format(j));
    const petit = document.createElement('small');
    petit.textContent = courte.format(j);
    const fort = document.createElement('strong');
    fort.textContent = insecable(jourMois.format(j));
    label.append(input, petit, fort);
    jours.append(label);
  });

  const ouvrirVisite = () => {
    const { c, kw, devis } = etat;
    const p = P[kw];
    lignesDl($('#visite-recap'), [
      ['Lieu', LIEU[c.parcours] + (c.parcours === 'entreprise' ? `, ${c.points}${NB}points` : '')],
      ['Borne', `${p.lib}, ${p.tri ? 'triphasée' : 'monophasée'}`],
      ['Usage', `Batterie de ${c.batterie}${NB}kWh, ${c.km}${NB}km par jour`],
      ['Installation', `${{ mono: 'Monophasé', tri: 'Triphasé', inconnu: 'Compteur à vérifier' }[c.phase]}, ${c.distance}${NB}m de câble${c.tranchee && c.parcours !== 'copro' ? ', tranchée' : ''}`],
      [devis.libelle.replace(', à partir de', ''), `dès ${euros(devis.total)}${NB}${devis.taxe}`],
    ]);
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  };
  $$('[data-visite]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); ouvrirVisite(); }));

  const reinitialiser = () => {
    if ($('#visite-fini').hidden) return;
    vform.reset();
    $('#visite-fini').hidden = true;
    $('#visite-corps').hidden = false;
    $('#visite-pied').hidden = false;
  };
  const fermer = () => { dlg.close(); };
  dlg.addEventListener('close', reinitialiser);
  $$('[data-fermer]').forEach((b) => b.addEventListener('click', fermer));
  dlg.addEventListener('click', (e) => { if (e.target === dlg) fermer(); });
  $('[data-modifier]').addEventListener('click', () => {
    fermer();
    config.scrollIntoView({ block: 'start' });
    allerA(1);
  });

  const erreurChamp = (id, msg) => {
    document.getElementById(`${id}-err`).textContent = msg;
    document.getElementById(id).setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  };
  const telPropre = () => vform.tel.value.replace(/[\s.\-]/g, '').replace(/^\+33/, '0');
  const telLisible = () => telPropre().replace(/(\d{2})(?=\d)/g, `$1${NB}`);
  vform.addEventListener('submit', (e) => {
    e.preventDefault();
    const jour = val('jour'), moment = val('moment');
    const creneau = !jour && !moment ? 'Choisis un jour et un moment de la journée.'
      : !jour ? 'Choisis le jour de la visite.' : !moment ? 'Choisis le matin ou l’après-midi.' : '';
    $('#err-creneau').textContent = creneau;
    const ok = [
      erreurChamp('nom', vform.nom.value.trim().length >= 2 ? '' : 'Indique ton nom.'),
      erreurChamp('tel', /^0[1-9]\d{8}$/.test(telPropre()) ? '' : `Indique un numéro à 10${NB}chiffres, par exemple 06${NB}12${NB}34${NB}56${NB}78.`),
      erreurChamp('commune', vform.commune.value.trim().length >= 2 ? '' : 'Indique ta commune, par exemple Lambersart.'),
    ];
    if (creneau) { $(`input[name="${!jour ? 'jour' : 'moment'}"]`).focus(); return; }
    const premier = ['nom', 'tel', 'commune'][ok.indexOf(false)];
    if (premier) { document.getElementById(premier).focus(); return; }
    ecrire('fini-tel', telLisible());
    ecrire('fini-creneau', `le ${jour}, ${moment}`);
    $('#visite-corps').hidden = true;
    $('#visite-pied').hidden = true;
    $('#visite-fini').hidden = false;
    $('#visite-fini h3').focus();
  });
  vform.addEventListener('change', (e) => { if (e.target.type === 'radio') $('#err-creneau').textContent = ''; });
  vform.addEventListener('input', (e) => {
    if (['nom', 'tel', 'commune'].includes(e.target.id) && e.target.getAttribute('aria-invalid') === 'true') erreurChamp(e.target.id, '');
  });

  rendre();
  majBoutons();
})();
