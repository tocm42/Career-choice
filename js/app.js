/* Compass app controller: state, routing and rendering. Vanilla JS, no build step. */
(function () {
  'use strict';

  var STORAGE_KEY = 'compass.v1';
  var SCREENS = ['welcome', 'about', 'survey', 'report', 'directions', 'plan', 'coach'];
  var LABELS = { welcome: 'Start', about: 'About you', survey: 'Survey', report: 'Report', directions: 'Directions', plan: 'Plan', coach: 'Coach' };

  var state = load() || {
    screen: 'welcome',
    name: '',
    birth: { date: '', timeKnown: true, time: '', city: '', lat: null, lon: null, offset: 0, summer: false },
    answers: { character: {}, interests: {}, values: { order: [] }, workstyle: {}, life: {}, reflection: {} },
    surveySection: 0,
    chosen: [],
    plan: null,
    coach: { checkins: [], sessions: [], chat: [], tab: 'checkin', apiKey: '' },
    theme: ''
  };
  var derived = {};

  /* ---------- persistence ---------- */
  function load() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (e) { return null; } }
  function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable; the app still works for this session */ } }

  /* ---------- helpers ---------- */
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(msg) { var t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { t.hidden = true; }, 2200); }
  function firstName() { return (state.name || '').trim().split(' ')[0] || 'you'; }

  function surveyComplete() {
    var s = state.answers;
    var char = SURVEY.sections[0].items.every(function (i) { return typeof s.character[i.id] === 'number'; });
    var intr = SURVEY.sections[1].items.every(function (i) { return typeof s.interests[i.id] === 'number'; });
    var vals = (s.values.order || []).length === 5;
    var life = SURVEY.sections[4].items.every(function (i) { return s.life[i.id]; });
    return char && intr && vals && life;
  }
  function unlocked(screen) {
    var i = SCREENS.indexOf(screen);
    if (i <= 1) return true;
    if (screen === 'survey') return !!state.birth.date;
    if (screen === 'report' || screen === 'directions') return surveyComplete();
    if (screen === 'plan' || screen === 'coach') return !!state.plan;
    return false;
  }

  function compute() {
    var b = state.birth;
    var parts = (b.date || '').split('-').map(Number);
    var tp = (b.time || '').split(':').map(Number);
    derived.astro = Astro.compute({
      year: parts[0], month: parts[1], day: parts[2],
      hour: tp[0], minute: tp[1], timeKnown: !!(b.timeKnown && b.time),
      utcOffset: Number(b.offset || 0) + (b.summer ? 1 : 0),
      lat: typeof b.lat === 'number' ? b.lat : null, lon: typeof b.lon === 'number' ? b.lon : null
    });
    derived.tend = Astro.tendencies(derived.astro);
    if (surveyComplete()) {
      derived.profile = Engine.buildProfile(SURVEY, state.answers);
      derived.matches = Engine.matchDirections(derived.profile, DIRECTIONS);
      derived.astroNotes = Engine.compareWithAstro(derived.profile, derived.tend);
    }
  }

  /* ---------- routing ---------- */
  function go(screen) {
    if (!unlocked(screen)) return;
    state.screen = screen; save(); render(); window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderNav() {
    var nav = $('#nav');
    nav.innerHTML = SCREENS.filter(function (s) { return s !== 'welcome'; }).map(function (s, i) {
      var done = SCREENS.indexOf(state.screen) > SCREENS.indexOf(s) && unlocked(SCREENS[SCREENS.indexOf(s) + 1] || s);
      return '<button data-go="' + s + '" class="' + (state.screen === s ? 'active' : '') + (done ? ' done' : '') + '" ' + (unlocked(s) ? '' : 'disabled') + '><span class="n">' + (i + 1) + '</span><span class="label">' + LABELS[s] + '</span></button>';
    }).join('');
    $$('button[data-go]', nav).forEach(function (b) { b.onclick = function () { go(b.dataset.go); }; });
  }

  function footer(html) {
    var f = $('#footer');
    if (!html) { f.hidden = true; return; }
    f.hidden = false; $('#footerInner').innerHTML = html;
  }

  function render() {
    compute();
    document.documentElement.dataset.theme = state.theme || '';
    renderNav();
    var app = $('#app');
    app.innerHTML = '';
    footer('');
    var fn = { welcome: renderWelcome, about: renderAbout, survey: renderSurvey, report: renderReport, directions: renderDirections, plan: renderPlan, coach: renderCoach }[state.screen] || renderWelcome;
    fn(app);
  }

  /* ---------- screens ---------- */
  function renderWelcome(app) {
    app.innerHTML =
      '<section class="screen">' +
      '<div class="card" style="padding:2rem 1.6rem">' +
      '<h1>Choosing what comes next</h1>' +
      '<p class="muted" style="font-size:1.05rem;max-width:60ch">Compass helps one person work out their next direction in life and then get there. It takes about twenty-five minutes to complete, and then it coaches you for thirteen weeks.</p>' +
      '<div class="grid" style="margin:1.25rem 0">' +
      card('1. A character survey', 'Sixty-odd questions on how you operate, what you enjoy, what matters, how you like to work, and what your life allows right now.', 'sky') +
      card('2. A birth-chart lens', 'Your sun, moon and rising signs from your birth date, time and place. Used to ask better questions, never to decide for you.', 'gold') +
      card('3. A shortlist of directions', 'Thirty-seven real directions, scored for fit and for what is feasible given your circumstances, each with an honest first step.', 'sage') +
      card('4. A plan and a coach', 'A thirteen-week plan you can tick off, weekly check-ins, structured coaching sessions and, if you add a key, a conversational coach.', 'soft') +
      '</div>' +
      '<div class="row"><button class="btn primary" id="startBtn">' + (state.name ? 'Continue as ' + esc(firstName()) : 'Start') + '</button>' +
      (state.name ? '<button class="btn ghost" id="resetBtn">Start again</button>' : '') +
      '<button class="btn ghost" id="importBtn">Import a saved file</button><input type="file" id="importFile" accept="application/json" hidden></div>' +
      '<p class="small muted" style="margin-top:1rem">Everything stays in this browser. Nothing is sent anywhere unless you choose to add an API key for the conversational coach.</p>' +
      '</div></section>';
    $('#startBtn').onclick = function () { go(state.name ? nextScreen() : 'about'); };
    if ($('#resetBtn')) $('#resetBtn').onclick = function () { if (confirm('Delete all answers, plan and coaching history on this device?')) { localStorage.removeItem(STORAGE_KEY); location.reload(); } };
    $('#importBtn').onclick = function () { $('#importFile').click(); };
    $('#importFile').onchange = function (e) {
      var f = e.target.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () { try { var data = JSON.parse(r.result); if (!data.answers) throw new Error('bad'); state = data; save(); toast('Imported'); render(); } catch (err) { toast('That file is not a Compass export.'); } };
      r.readAsText(f);
    };
  }
  function nextScreen() {
    if (state.plan) return 'coach';
    if (surveyComplete()) return 'directions';
    if (state.birth.date) return 'survey';
    return 'about';
  }
  function card(title, body, cls) { return '<div class="card ' + (cls || '') + '"><h3>' + title + '</h3><p class="small" style="margin:0">' + body + '</p></div>'; }

  function renderAbout(app) {
    var b = state.birth;
    app.innerHTML =
      '<section class="screen"><h1>About you</h1><p class="muted">Your name, and the details that build the birth-chart lens. The date is needed; time and place make the moon and rising signs possible.</p>' +
      '<div class="card">' +
      '<div class="field"><label for="name">Your name</label><input type="text" id="name" value="' + esc(state.name) + '" placeholder="Gaëlle"></div>' +
      '<div class="inline">' +
      '<div class="field"><label for="bdate">Date of birth</label><input type="date" id="bdate" value="' + esc(b.date) + '"></div>' +
      '<div class="field"><label for="btime">Time of birth</label><input type="time" id="btime" value="' + esc(b.time) + '" ' + (b.timeKnown ? '' : 'disabled') + '><div class="hint"><label class="check" style="font-weight:500;margin-top:.4rem"><input type="checkbox" id="timeKnown" ' + (b.timeKnown ? 'checked' : '') + '> I know my birth time</label></div></div>' +
      '</div>' +
      '<div class="field"><label for="city">Place of birth</label><input type="text" id="city" value="' + esc(b.city) + '" placeholder="Start typing a city" autocomplete="off"><div id="cityList" class="choices" style="margin-top:.4rem"></div><div class="hint">Not listed? Pick the nearest city; a hundred miles makes almost no difference to the rising sign.</div></div>' +
      '<div class="inline">' +
      '<div class="field"><label for="lat">Latitude</label><input type="number" id="lat" step="0.0001" value="' + (b.lat == null ? '' : b.lat) + '"></div>' +
      '<div class="field"><label for="lon">Longitude</label><input type="number" id="lon" step="0.0001" value="' + (b.lon == null ? '' : b.lon) + '"></div>' +
      '<div class="field"><label for="offset">Clock offset from UTC at birth</label><input type="number" id="offset" step="0.5" value="' + (b.offset == null ? 0 : b.offset) + '"><div class="hint"><label class="check" style="font-weight:500"><input type="checkbox" id="summer" ' + (b.summer ? 'checked' : '') + '> Summer time was in force (adds one hour)</label></div></div>' +
      '</div>' +
      '<div id="astroPreview"></div>' +
      '</div></section>';
    footer('<span class="muted small">Step 1 of 6</span><button class="btn primary" id="nextBtn">Continue to the survey</button>');

    var cityInput = $('#city'), list = $('#cityList');
    function bind() {
      state.name = $('#name').value;
      b.date = $('#bdate').value; b.time = $('#btime').value; b.timeKnown = $('#timeKnown').checked;
      b.city = cityInput.value; b.lat = $('#lat').value === '' ? null : Number($('#lat').value); b.lon = $('#lon').value === '' ? null : Number($('#lon').value);
      b.offset = Number($('#offset').value || 0); b.summer = $('#summer').checked;
      $('#btime').disabled = !b.timeKnown;
      save(); preview();
    }
    function preview() {
      compute();
      var a = derived.astro, el = $('#astroPreview');
      if (!a.available) { el.innerHTML = ''; return; }
      el.innerHTML = '<div class="card gold" style="margin:0"><b>Preview:</b> Sun in ' + a.sun.sign.name + ', Moon in ' + a.moon.sign.name + (a.rising ? ', ' + a.rising.sign.name + ' rising' : ', rising sign needs time and place') + '.' + (a.moon.uncertain ? ' <span class="small muted">Without a birth time the moon sign is a best guess for midday.</span>' : '') + '</div>';
    }
    $$('input', app).forEach(function (i) { i.addEventListener('input', bind); i.addEventListener('change', bind); });
    cityInput.addEventListener('input', function () {
      var q = cityInput.value.trim().toLowerCase();
      if (q.length < 2) { list.innerHTML = ''; return; }
      var hits = CITIES.filter(function (c) { return c.name.toLowerCase().indexOf(q) === 0 || c.country.toLowerCase().indexOf(q) === 0 || c.name.toLowerCase().indexOf(q) > 0; }).slice(0, 6);
      list.innerHTML = hits.map(function (c, i) { return '<button type="button" data-i="' + i + '">' + esc(c.name) + ', ' + esc(c.country) + '</button>'; }).join('');
      $$('button', list).forEach(function (btn) {
        btn.onclick = function () {
          var c = hits[Number(btn.dataset.i)];
          cityInput.value = c.name + ', ' + c.country; $('#lat').value = c.lat; $('#lon').value = c.lon; $('#offset').value = c.offset; list.innerHTML = ''; bind();
        };
      });
    });
    $('#nextBtn').onclick = function () {
      bind();
      if (!state.name.trim()) { toast('Add your name first.'); return; }
      if (!b.date) { toast('The date of birth is needed.'); return; }
      go('survey');
    };
    preview();
  }

  function renderSurvey(app) {
    var idx = state.surveySection;
    var sec = SURVEY.sections[idx];
    var ans = state.answers[sec.id];
    var pct = Math.round(idx / SURVEY.sections.length * 100);
    var html = '<section class="screen"><div class="row between"><h1>' + esc(sec.title) + '</h1><span class="muted small">Part ' + (idx + 1) + ' of ' + SURVEY.sections.length + '</span></div>' +
      '<div class="progress"><span style="width:' + pct + '%"></span></div><p class="muted">' + esc(sec.intro) + '</p><div class="card">';

    if (sec.type === 'likert') {
      html += sec.items.map(function (it) {
        return '<div class="q" data-id="' + it.id + '"><div class="text">' + esc(it.text) + '</div><div class="scale">' + sec.scale.map(function (lbl, i) {
          return '<button type="button" data-v="' + (i + 1) + '" class="' + (ans[it.id] === i + 1 ? 'on' : '') + '">' + esc(lbl) + '</button>';
        }).join('') + '</div></div>';
      }).join('');
    } else if (sec.type === 'pick') {
      var order = ans.order || [];
      html += '<div class="picks">' + sec.items.map(function (it) {
        var r = order.indexOf(it.id);
        return '<button type="button" data-id="' + it.id + '" class="' + (r >= 0 ? 'on' : '') + '">' + esc(it.text) + '<span class="hint">' + esc(it.hint) + '</span>' + (r >= 0 ? '<span class="rank">' + (r + 1) + '</span>' : '') + '</button>';
      }).join('') + '</div><p class="small muted" style="margin-top:.75rem">Tap in order of importance. Tap again to remove. ' + order.length + ' of 5 chosen.</p>';
    } else if (sec.type === 'slider') {
      html += sec.items.map(function (it) {
        var v = typeof ans[it.id] === 'number' ? ans[it.id] : 50;
        return '<div class="q"><div class="slider"><span class="lbl">' + esc(it.left) + '</span><input type="range" min="0" max="100" value="' + v + '" data-id="' + it.id + '"><span class="lbl r">' + esc(it.right) + '</span></div></div>';
      }).join('');
    } else if (sec.type === 'choice') {
      html += sec.items.map(function (it) {
        return '<div class="q" data-id="' + it.id + '"><div class="text">' + esc(it.text) + '</div><div class="choices">' + it.options.map(function (o) {
          return '<button type="button" data-v="' + o[0] + '" class="' + (ans[it.id] === o[0] ? 'on' : '') + '">' + esc(o[1]) + '</button>';
        }).join('') + '</div></div>';
      }).join('');
    } else if (sec.type === 'text') {
      html += sec.items.map(function (it) {
        return '<div class="q"><label for="t_' + it.id + '">' + esc(it.text) + '</label><textarea id="t_' + it.id + '" data-id="' + it.id + '">' + esc(ans[it.id] || '') + '</textarea></div>';
      }).join('');
    }
    html += '</div></section>';
    app.innerHTML = html;

    /* bindings */
    $$('.q[data-id] .scale button, .q[data-id] .choices button', app).forEach(function (btn) {
      btn.onclick = function () {
        var q = btn.closest('.q'); var id = q.dataset.id;
        var v = sec.type === 'likert' ? Number(btn.dataset.v) : btn.dataset.v;
        ans[id] = v; save();
        $$('button', q).forEach(function (x) { x.classList.toggle('on', x === btn); });
        var next = q.nextElementSibling; if (next && !$('.on', next)) next.scrollIntoView({ behavior: 'smooth', block: 'center' });
      };
    });
    $$('.picks button', app).forEach(function (btn) {
      btn.onclick = function () {
        var id = btn.dataset.id; var order = ans.order = ans.order || [];
        var i = order.indexOf(id);
        if (i >= 0) order.splice(i, 1); else if (order.length < 5) order.push(id); else { toast('Five already chosen. Remove one first.'); return; }
        save(); renderSurvey(app);
      };
    });
    $$('input[type=range]', app).forEach(function (r) { r.oninput = function () { ans[r.dataset.id] = Number(r.value); save(); }; });
    $$('textarea', app).forEach(function (t) { t.oninput = function () { ans[t.dataset.id] = t.value; save(); }; });

    footer((idx > 0 ? '<button class="btn ghost" id="prevBtn">Back</button>' : '<span></span>') + '<button class="btn primary" id="nextBtn">' + (idx === SURVEY.sections.length - 1 ? 'See my report' : 'Next part') + '</button>');
    if ($('#prevBtn')) $('#prevBtn').onclick = function () { state.surveySection--; save(); render(); };
    $('#nextBtn').onclick = function () {
      var missing = 0;
      if (sec.type === 'likert' || sec.type === 'choice') missing = sec.items.filter(function (it) { return ans[it.id] == null; }).length;
      if (sec.type === 'pick') missing = 5 - (ans.order || []).length;
      if (missing > 0) { toast(missing + ' still to answer in this part.'); var first = $$('.q', app).filter(function (q) { return q.dataset.id && ans[q.dataset.id] == null; })[0]; if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      if (idx < SURVEY.sections.length - 1) { state.surveySection++; save(); render(); }
      else { state.surveySection = 0; go('report'); }
    };
  }

  function bar(label, v, cls) { return '<div class="bar ' + (cls || '') + '"><span>' + esc(label) + '</span><div class="track"><span style="width:' + v + '%"></span></div><span class="v">' + v + '</span></div>'; }

  function renderReport(app) {
    var p = derived.profile, a = derived.astro;
    var html = '<section class="screen"><h1>' + esc(firstName()) + '’s report</h1><p class="muted">What your answers say, then what the chart adds. Read the first part as evidence and the second as a set of questions.</p>';

    html += '<div class="grid two">';
    html += '<div class="card"><h2>Character</h2>' + Engine.TRAITS.map(function (t) { return bar(Engine.TRAIT_NAMES[t], p.big5[t], 'accent'); }).join('') +
      '<div class="stack" style="margin-top:1rem">' + Engine.TRAITS.map(function (t) { return '<p class="small" style="margin:0"><b>' + Engine.TRAIT_NAMES[t] + ' (' + Engine.band(p.big5[t]) + ').</b> ' + esc(p.big5Text[t]) + '</p>'; }).join('') + '</div></div>';
    html += '<div class="card"><h2>Interests</h2><p class="small muted">Your code is <b>' + p.code + '</b>: the three interest areas you rated highest.</p>' + Engine.RIASEC.map(function (k) { return bar(Engine.RIASEC_NAMES[k], p.riasec[k]); }).join('') +
      '<div class="stack" style="margin-top:1rem">' + p.code.split('').map(function (k) { return '<p class="small" style="margin:0">' + esc(Engine.RIASEC_TEXT[k]) + '</p>'; }).join('') + '</div></div>';
    html += '</div>';

    html += '<div class="grid two">';
    html += '<div class="card"><h2>What matters most</h2><ol style="margin:0;padding-left:1.2rem">' + p.values.map(function (v) { return '<li>' + esc(Engine.VALUE_NAMES[v]) + '</li>'; }).join('') + '</ol>' +
      '<p class="small muted" style="margin-top:.75rem">The plan protects the first two above everything else.</p></div>';
    var styleText = [];
    var s = p.style;
    styleText.push(s.setting < 0.35 ? 'Desk-based work' : s.setting > 0.65 ? 'Active, hands-on work' : 'A mix of desk and doing');
    styleText.push(s.location < 0.35 ? 'mostly from home' : s.location > 0.65 ? 'out and about' : 'part home, part out');
    styleText.push(s.people < 0.35 ? 'with plenty of time alone' : s.people > 0.65 ? 'with people most of the day' : 'with people in moderate doses');
    styleText.push(s.pace > 0.65 ? 'at a fast pace' : s.pace < 0.35 ? 'at a steady pace' : 'at a varied pace');
    styleText.push(s.lead > 0.65 ? 'leading and deciding' : s.lead < 0.35 ? 'contributing to a team' : 'sometimes leading');
    styleText.push(s.risk > 0.65 ? 'and open to something new and uncertain.' : s.risk < 0.35 ? 'and with a preference for the proven.' : 'and with a measured appetite for risk.');
    var l = p.life;
    html += '<div class="card"><h2>How you want to work</h2><p>' + styleText.join(', ') + '</p><h3 style="margin-top:1rem">What life allows right now</h3><div class="meta">' +
      ['<span class="pill">' + esc(optLabel('situation', l.situation)) + '</span>', '<span class="pill">' + esc(optLabel('caring', l.caring)) + '</span>', '<span class="pill">' + l.hours + ' hrs/week</span>', '<span class="pill">Income: ' + esc(l.income) + '</span>', '<span class="pill">Runway: ' + (l.runway === '0' ? 'none' : l.runway + ' months') + '</span>', '<span class="pill">Study: ' + esc(l.study) + '</span>', '<span class="pill">Energy: ' + esc(l.energy) + '</span>', '<span class="pill">' + esc(optLabel('mobility', l.mobility)) + '</span>'].join('') + '</div></div>';
    html += '</div>';

    /* Astrology lens */
    html += '<div class="card gold"><h2>The chart as a lens</h2>';
    if (!a.available) html += '<p>Add a birth date on the About you screen to see this section.</p>';
    else {
      html += '<p class="small muted">Astrology has no predictive evidence behind it, and this app does not pretend otherwise. It is used here the way a good coach uses a metaphor: to ask a question you had not thought to ask. Where it agrees with your survey, take the nudge. Where it disagrees, trust the survey.</p>';
      html += placement(a.sun, 'Sun', a.sun.text.strengths + ' <i>Watch for:</i> ' + a.sun.text.watch);
      html += placement(a.moon, 'Moon', a.moon.text + (a.moon.uncertain ? ' <span class="small muted">(Estimated without a birth time.)</span>' : ''));
      if (a.rising) html += placement(a.rising, 'Rising', a.rising.text);
      else html += '<div class="placement"><span class="glyph">?</span><div><b>Rising sign</b><span class="small muted">Needs a birth time and place.</span></div></div>';
      html += '<div class="placement"><span class="glyph">' + ({ Fire: '🔥', Earth: '🌿', Air: '🌬', Water: '💧' })[a.dominantElement] + '</span><div><b>Dominant element: ' + a.dominantElement + '</b>' + esc(a.dominantElementText) + '</div></div>';
      html += '<div class="placement"><span class="glyph">' + a.lifePath.number + '</span><div><b>Life path number (numerology)</b>' + esc(a.lifePath.text) + ' Chinese zodiac: ' + a.chinese + '.</div></div>';
      html += '<div class="card" style="margin:1rem 0 0"><h3>A question from your sun sign</h3><p class="serif" style="font-size:1.1rem;margin:0">' + esc(a.sun.text.asks) + '</p></div>';
      if (derived.astroNotes && derived.astroNotes.length) html += '<h3 style="margin-top:1rem">Where the chart and the survey meet</h3><ul class="clean">' + derived.astroNotes.map(function (n) { return '<li class="' + (n.agree ? 'agree' : 'disagree') + '">' + esc(n.text) + '</li>'; }).join('') + '</ul>';
      if (a.sun.nearBoundary || a.moon.nearBoundary || (a.rising && a.rising.nearBoundary)) html += '<p class="small muted" style="margin-top:.75rem">One of your placements sits within a degree or two of a sign boundary, so a different calculator may give the neighbouring sign.</p>';
    }
    html += '</div>';

    /* Reflections */
    var r = p.reflection; var keys = Object.keys(r).filter(function (k) { return r[k] && r[k].trim(); });
    if (keys.length) html += '<div class="card"><h2>In your own words</h2>' + keys.map(function (k) { var q = SURVEY.sections[5].items.filter(function (i) { return i.id === k; })[0]; return '<p class="small"><b>' + esc(q ? q.text : k) + '</b><br>' + esc(r[k]) + '</p>'; }).join('') + '</div>';

    html += '</section>';
    app.innerHTML = html;
    footer('<button class="btn ghost" id="printBtn">Print or save as PDF</button><button class="btn primary" id="nextBtn">See directions</button>');
    $('#printBtn').onclick = function () { window.print(); };
    $('#nextBtn').onclick = function () { go('directions'); };
  }
  function placement(pl, label, text) { return '<div class="placement"><span class="glyph">' + pl.sign.symbol + '</span><div><b>' + label + ' in ' + pl.sign.name + ' <span class="small muted">' + pl.sign.element + ', ' + pl.sign.modality + ', ' + Math.round(pl.degree) + '°</span></b>' + text + '</div></div>'; }
  function optLabel(qid, val) {
    var q = SURVEY.sections[4].items.filter(function (i) { return i.id === qid; })[0];
    var o = q && q.options.filter(function (x) { return x[0] === val; })[0];
    return o ? o[1] : val || '';
  }

  function renderDirections(app) {
    var m = derived.matches;
    var chosen = state.chosen;
    var html = '<section class="screen"><h1>Directions</h1><p class="muted">Ranked by fit with your character and interests, then adjusted for what is realistic right now. Choose one or two to build a plan around. The first is the one you will test properly; the second is the fallback.</p>';
    html += '<div class="row" style="margin-bottom:1rem"><span class="pill sage">Fit: character, interests, values, work style</span><span class="pill gold">Feasible: study, money, time, energy, family</span><span class="pill">Showing top 12 of ' + m.length + '</span><button class="btn small ghost" id="showAll">Show all</button></div>';
    html += '<div id="dirList">' + m.slice(0, 12).map(function (r, i) { return dirCard(r, i, chosen); }).join('') + '</div></section>';
    app.innerHTML = html;
    bindDirCards(app);
    $('#showAll').onclick = function () { $('#dirList').innerHTML = m.map(function (r, i) { return dirCard(r, i, chosen); }).join(''); bindDirCards(app); $('#showAll').hidden = true; };
    footer('<span class="muted small" id="chosenText">' + chosenText() + '</span><button class="btn primary" id="planBtn" ' + (chosen.length ? '' : 'disabled') + '>Build my plan</button>');
    $('#planBtn').onclick = function () {
      if (state.plan && !confirm('Rebuild the plan? Ticked tasks will be reset.')) { go('plan'); return; }
      state.plan = Engine.buildPlan(derived.profile, m, chosen); save(); go('plan');
    };
  }
  function chosenText() { return state.chosen.length ? 'Chosen: ' + state.chosen.map(function (id) { return DIRECTIONS.filter(function (d) { return d.id === id; })[0].name; }).join(' and ') : 'Choose up to two directions'; }
  function dirCard(r, i, chosen) {
    var d = r.direction; var sel = chosen.indexOf(d.id) >= 0;
    var study = { none: 'No study needed', short: 'Short course', year: 'About a year', degree: 'Degree-level' }[d.study];
    return '<div class="card dir ' + (sel ? 'selected' : '') + '" data-id="' + d.id + '"><div>' +
      '<div class="row" style="gap:.5rem"><span class="muted small">#' + (i + 1) + '</span><h3 style="margin:0">' + esc(d.name) + '</h3></div>' +
      '<div class="small muted">' + esc(d.cluster) + '</div><p style="margin:.5rem 0">' + esc(d.summary) + '</p>' +
      '<div class="meta"><span class="pill">' + study + '</span><span class="pill">~' + d.months + ' months to first pay</span><span class="pill">Income stability ' + d.income + '/5</span><span class="pill">Hours flexibility ' + d.flex + '/5</span></div>' +
      (r.reasons.length ? '<ul class="clean small">' + r.reasons.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
      (r.cautions.length ? '<ul class="clean small">' + r.cautions.map(function (x) { return '<li class="caution">' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
      '<details><summary>First steps and a two-week taster</summary><ul class="clean small">' + d.steps.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul><p class="small" style="margin:.5rem 0 0"><b>Taster:</b> ' + esc(d.taster) + '</p></details>' +
      '<div class="row" style="margin-top:.75rem"><button class="btn small ' + (sel ? '' : 'primary') + '" data-choose="' + d.id + '">' + (sel ? 'Remove from plan' : 'Choose this') + '</button></div>' +
      '</div><div class="scores"><div><div class="big">' + Math.round(r.fit * 100) + '</div><div class="sub">fit</div></div><div><div class="big" style="font-size:1.2rem;color:var(--muted)">' + Math.round(r.feasibility * 100) + '%</div><div class="sub">feasible now</div></div></div></div>';
  }
  function bindDirCards(app) {
    $$('button[data-choose]', app).forEach(function (b) {
      b.onclick = function () {
        var id = b.dataset.choose; var i = state.chosen.indexOf(id);
        if (i >= 0) state.chosen.splice(i, 1); else if (state.chosen.length < 2) state.chosen.push(id); else { toast('Two is the limit. Remove one first.'); return; }
        save(); renderDirections(app);
      };
    });
  }

  function renderPlan(app) {
    var plan = state.plan;
    var total = 0, done = 0;
    plan.weeks.forEach(function (w) { w.tasks.forEach(function (t) { total++; if (t.done) done++; }); });
    var pct = total ? Math.round(done / total * 100) : 0;
    var html = '<section class="screen"><div class="row between"><h1>Your thirteen-week plan</h1><div class="ring" style="--p:' + pct + '"><span>' + pct + '%</span></div></div>';
    html += '<p class="muted">Testing <b>' + esc(plan.primary.name.toLowerCase()) + '</b>' + (plan.secondary ? ' with <b>' + esc(plan.secondary.name.toLowerCase()) + '</b> as the fallback' : '') + '. About ' + plan.hours + ' hours a week, ' + plan.perWeek + ' task' + (plan.perWeek > 1 ? 's' : '') + ' a week. Four phases: get clear, test it, build the evidence, commit.</p>';
    if (plan.guard.length) html += '<div class="card soft"><h3>Guardrails</h3><ul class="clean">' + plan.guard.map(function (g) { return '<li>' + esc(g) + '</li>'; }).join('') + '</ul></div>';
    var phases = ['Clarity', 'Test', 'Build', 'Commit'];
    var PHASE_TEXT = { Clarity: 'Weeks 1 to 2. Get honest about what you want and what you fear, and tell someone.', Test: 'Weeks 3 to 6. Try the direction cheaply and quickly before spending money or giving notice.', Build: 'Weeks 7 to 10. Turn a maybe into evidence: CV, portfolio, applications, first customers.', Commit: 'Weeks 11 to 13. Make the decision with the people it affects, then take the step.' };
    html += '<div class="card">' + phases.map(function (ph) {
      return '<div class="phase ' + ph + '"><h2>' + ph + '</h2><p class="small muted">' + PHASE_TEXT[ph] + '</p>' + plan.weeks.filter(function (w) { return w.phase === ph; }).map(function (w) {
        return '<div class="week"><h4>Week ' + w.n + '</h4>' + w.tasks.map(function (t, ti) {
          return '<label class="task ' + (t.done ? 'done' : '') + '"><input type="checkbox" data-w="' + w.n + '" data-t="' + ti + '" ' + (t.done ? 'checked' : '') + '><span>' + esc(t.text) + '</span></label>';
        }).join('') + '</div>';
      }).join('') + '</div>';
    }).join('') + '</div></section>';
    app.innerHTML = html;
    $$('input[type=checkbox][data-w]', app).forEach(function (cb) {
      cb.onchange = function () {
        var w = plan.weeks.filter(function (x) { return x.n === Number(cb.dataset.w); })[0];
        w.tasks[Number(cb.dataset.t)].done = cb.checked; save(); renderPlan(app);
      };
    });
    footer('<div class="row"><button class="btn ghost small" id="printBtn">Print</button><button class="btn ghost small" id="exportBtn">Export everything</button><button class="btn ghost small" id="redoBtn">Change directions</button></div><button class="btn primary" id="coachBtn">Go to the coach</button>');
    $('#printBtn').onclick = function () { window.print(); };
    $('#exportBtn').onclick = exportAll;
    $('#redoBtn').onclick = function () { go('directions'); };
    $('#coachBtn').onclick = function () { go('coach'); };
  }

  function exportAll() {
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'compass-' + (firstName().toLowerCase()) + '-' + new Date().toISOString().slice(0, 10) + '.json'; a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  /* ---------- coach ---------- */
  function renderCoach(app) {
    var c = state.coach;
    var tabs = [['checkin', 'Weekly check-in'], ['session', 'Coaching session'], ['chat', 'Talk to the coach'], ['history', 'History']];
    var html = '<section class="screen"><h1>Coach</h1>' +
      '<div class="tabs">' + tabs.map(function (t) { return '<button data-tab="' + t[0] + '" class="' + (c.tab === t[0] ? 'active' : '') + '">' + t[1] + '</button>'; }).join('') + '</div><div id="tabBody"></div></section>';
    app.innerHTML = html;
    $$('.tabs button', app).forEach(function (b) { b.onclick = function () { c.tab = b.dataset.tab; save(); renderCoach(app); }; });
    var body = $('#tabBody');
    ({ checkin: renderCheckin, session: renderSession, chat: renderChat, history: renderHistory })[c.tab](body);
    footer('<span class="muted small">' + c.checkins.length + ' check-in' + (c.checkins.length === 1 ? '' : 's') + ', ' + c.sessions.length + ' session' + (c.sessions.length === 1 ? '' : 's') + '</span><button class="btn ghost small" id="exportBtn">Export everything</button>');
    $('#exportBtn').onclick = exportAll;
  }

  function renderCheckin(body) {
    var c = state.coach;
    var last = c.checkins[c.checkins.length - 1];
    var html = '<div class="card sage"><p style="margin:0;white-space:pre-wrap">' + esc(c.checkins.length ? (last.reply || '') : Coach.opening(derived.profile, state.plan, state.name)) + '</p>' +
      (last && last.step ? '<p style="margin:.75rem 0 0"><b>Your step:</b> ' + esc(last.step) + '</p>' : '') + '</div>';
    html += '<div class="card"><h2>This week</h2>' +
      '<div class="field"><label>Energy this week, 1 to 10</label><div class="energy" id="energy">' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (n) { return '<button type="button" data-v="' + n + '">' + n + '</button>'; }).join('') + '</div></div>' +
      '<div class="field"><label for="ciDone">What did you actually do?</label><textarea id="ciDone" placeholder="Even if it was small."></textarea></div>' +
      '<div class="field"><label for="ciObstacle">What got in the way?</label><select id="ciObstacle">' + Object.keys(Coach.OBSTACLES).map(function (k) { return '<option value="' + k + '">' + esc(Coach.OBSTACLES[k].label) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label for="ciNote">Anything else on your mind</label><textarea id="ciNote"></textarea></div>' +
      '<div class="field"><label for="ciCommit">One thing you will do before next time (optional)</label><input type="text" id="ciCommit"></div>' +
      '<button class="btn primary" id="ciSubmit">Check in</button></div>';
    body.innerHTML = html;
    var energy = 5;
    $$('#energy button', body).forEach(function (b) { b.classList.toggle('on', Number(b.dataset.v) === energy); b.onclick = function () { energy = Number(b.dataset.v); $$('#energy button', body).forEach(function (x) { x.classList.toggle('on', x === b); }); }; });
    $('#ciSubmit').onclick = function () {
      var ci = { date: new Date().toISOString(), energy: energy, done: $('#ciDone').value, obstacle: $('#ciObstacle').value, note: $('#ciNote').value, commit: $('#ciCommit').value };
      var r = Coach.reflect(ci, c.checkins, state.plan);
      ci.reply = r.message; ci.step = r.step;
      c.checkins.push(ci); save(); renderCoach($('#app')); window.scrollTo({ top: 0, behavior: 'smooth' });
    };
  }

  function renderSession(body) {
    var c = state.coach;
    var open = c.sessions.filter(function (s) { return !s.closed; })[0];
    if (!open) {
      body.innerHTML = '<div class="card"><h2>A structured session</h2><p class="muted">Twenty minutes, four questions: Goal, Reality, Options, Will. Use it whenever you are stuck on a decision, a step, or a conversation you are avoiding.</p><button class="btn primary" id="startSession">Start a session</button></div>';
      $('#startSession').onclick = function () { c.sessions.push({ date: new Date().toISOString(), answers: {}, closed: false }); save(); renderCoach($('#app')); };
      return;
    }
    var html = '<div class="card"><h2>Session, ' + new Date(open.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) + '</h2>' + Coach.GROW.map(function (g) {
      return '<div class="q"><label for="g_' + g.key + '">' + g.title + '. ' + esc(g.prompt) + '</label><div class="hint small muted" style="margin-bottom:.4rem">' + esc(g.help) + '</div><textarea id="g_' + g.key + '" data-key="' + g.key + '">' + esc(open.answers[g.key] || '') + '</textarea></div>';
    }).join('') + '<div class="row" style="margin-top:1rem"><button class="btn primary" id="closeSession">Finish session</button><button class="btn ghost danger" id="dropSession">Discard</button></div></div>';
    body.innerHTML = html;
    $$('textarea', body).forEach(function (t) { t.oninput = function () { open.answers[t.dataset.key] = t.value; save(); }; });
    $('#closeSession').onclick = function () {
      if (!open.answers.goal || !open.answers.will) { toast('At least the Goal and the Will are needed.'); return; }
      open.closed = true; open.coachNote = Coach.coachClose(open); save(); toast('Session saved'); c.tab = 'history'; renderCoach($('#app'));
    };
    $('#dropSession').onclick = function () { c.sessions = c.sessions.filter(function (s) { return s !== open; }); save(); renderCoach($('#app')); };
  }

  function renderChat(body) {
    var c = state.coach;
    if (window.COMPASS_HOSTED) {
      body.innerHTML = '<div class="card sky"><h2>Talk to the coach</h2><p>This hosted copy cannot reach outside services, so the conversational coach is switched off here. The weekly check-in and coaching session tabs do the same job without a connection. To use the conversational coach, open the app from the GitHub repository and add an API key there.</p></div>';
      return;
    }
    var html = '<div class="card sky"><p class="small" style="margin:0">This coach talks back. It runs on the Claude model with your own API key, which stays in this browser and is sent only to Anthropic with each message. Your report, plan and check-ins are included so it knows the background. Leave the key blank to keep using the built-in coach on the other tabs.</p>' +
      '<div class="row" style="margin-top:.75rem"><input type="password" id="apiKey" placeholder="Anthropic API key (sk-ant-...)" value="' + esc(c.apiKey || '') + '" style="max-width:420px"><button class="btn small" id="saveKey">Save key</button>' + (c.apiKey ? '<button class="btn small ghost" id="clearKey">Remove key</button>' : '') + '</div></div>';
    html += '<div class="card"><div class="chat" id="chat">' + (c.chat.length ? c.chat.map(function (m) { return '<div class="msg ' + (m.role === 'user' ? 'me' : 'coach') + '">' + esc(m.content) + '</div>'; }).join('') : '<div class="msg sys">Start with whatever is on your mind. A good first message: “What would you ask me first?”</div>') + '</div>' +
      '<div class="row" style="margin-top:.75rem"><textarea id="chatInput" placeholder="Say what is going on…" style="flex:1;min-height:60px"></textarea><button class="btn primary" id="sendBtn">Send</button></div>' +
      (c.chat.length ? '<button class="btn small ghost" id="clearChat" style="margin-top:.5rem">Clear conversation</button>' : '') + '</div>';
    body.innerHTML = html;
    var chatEl = $('#chat'); chatEl.scrollTop = chatEl.scrollHeight;
    $('#saveKey').onclick = function () { c.apiKey = $('#apiKey').value.trim(); save(); toast(c.apiKey ? 'Key saved on this device' : 'Key removed'); renderCoach($('#app')); };
    if ($('#clearKey')) $('#clearKey').onclick = function () { c.apiKey = ''; save(); renderCoach($('#app')); };
    if ($('#clearChat')) $('#clearChat').onclick = function () { c.chat = []; save(); renderCoach($('#app')); };
    var sending = false;
    function send() {
      var text = $('#chatInput').value.trim(); if (!text || sending) return;
      if (!c.apiKey) { toast('Add an API key first, or use the check-in tab.'); return; }
      sending = true; $('#sendBtn').disabled = true;
      var history = c.chat.slice(-20).map(function (m) { return { role: m.role, content: m.content }; });
      c.chat.push({ role: 'user', content: text }); save();
      chatEl.innerHTML += '<div class="msg me">' + esc(text) + '</div><div class="msg sys" id="thinking">Thinking…</div>'; chatEl.scrollTop = chatEl.scrollHeight; $('#chatInput').value = '';
      Coach.ask(c.apiKey, { name: state.name, profile: derived.profile, astro: derived.astro, plan: state.plan, checkins: c.checkins }, history, text)
        .then(function (r) { c.chat.push({ role: 'assistant', content: r.text }); save(); renderCoach($('#app')); })
        .catch(function (err) {
          c.chat.pop(); save();
          var msg = err.status === 401 ? 'That key was not accepted.' : err.status === 429 ? 'Rate limited; try again in a minute.' : 'Could not reach the coach: ' + err.message;
          var t = $('#thinking'); if (t) t.textContent = msg; sending = false; $('#sendBtn').disabled = false; $('#chatInput').value = text;
        });
    }
    $('#sendBtn').onclick = send;
    $('#chatInput').addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(); });
  }

  function renderHistory(body) {
    var c = state.coach;
    var entries = [];
    c.checkins.forEach(function (ci) { entries.push({ date: ci.date, kind: 'Check-in', text: 'Energy ' + ci.energy + '. Did: ' + (ci.done || 'nothing noted') + '. Obstacle: ' + Coach.OBSTACLES[ci.obstacle].label + '.' + (ci.step ? ' Step: ' + ci.step : '') }); });
    c.sessions.filter(function (s) { return s.closed; }).forEach(function (s) { entries.push({ date: s.date, kind: 'Session', text: Coach.sessionSummary(s) + (s.coachNote ? '\nCoach: ' + s.coachNote : '') }); });
    entries.sort(function (a, b) { return b.date.localeCompare(a.date); });
    var energies = c.checkins.map(function (x) { return Number(x.energy); });
    var trend = energies.length >= 2 ? (energies[energies.length - 1] - energies[0]) : 0;
    body.innerHTML = '<div class="card"><h2>Your record</h2>' +
      (energies.length ? '<p class="small muted">Average energy ' + (energies.reduce(function (a, b) { return a + b; }, 0) / energies.length).toFixed(1) + ' over ' + energies.length + ' check-in' + (energies.length === 1 ? '' : 's') + (trend > 1 ? ', rising.' : trend < -1 ? ', falling. Worth a session on what is draining you.' : '.') + '</p>' : '') +
      (entries.length ? '<div class="timeline">' + entries.map(function (e) { return '<div class="entry"><div class="small muted">' + new Date(e.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ' · ' + e.kind + '</div><div style="white-space:pre-wrap">' + esc(e.text) + '</div></div>'; }).join('') + '</div>' : '<p class="muted">Nothing yet. The first check-in starts the record.</p>') + '</div>';
  }

  /* ---------- boot ---------- */
  $('#themeBtn').onclick = function () { state.theme = state.theme === 'dark' ? 'light' : state.theme === 'light' ? '' : 'dark'; save(); render(); toast(state.theme ? state.theme + ' mode' : 'System theme'); };
  if (!unlocked(state.screen)) state.screen = nextScreen();
  render();
})();
