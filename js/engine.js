/* Scoring, matching and planning engine for the Compass app. Pure functions, no DOM. */
(function (global) {
  'use strict';

  var TRAITS = ['O', 'C', 'E', 'A', 'N'];
  var RIASEC = ['R', 'I', 'A', 'S', 'E', 'C'];
  var TRAIT_NAMES = { O: 'Openness', C: 'Conscientiousness', E: 'Extraversion', A: 'Agreeableness', N: 'Sensitivity' };
  var RIASEC_NAMES = { R: 'Practical', I: 'Investigative', A: 'Creative', S: 'Social', E: 'Enterprising', C: 'Organising' };
  var VALUE_NAMES = { security: 'Financial security', flexibility: 'Flexibility', family: 'Time for family', meaning: 'Meaning', growth: 'Learning and growth', creativity: 'Creativity', people: 'Connection', autonomy: 'Independence', status: 'Recognition', calm: 'Calm', variety: 'Variety', craft: 'Craft' };
  var STUDY_RANK = { none: 0, short: 1, year: 2, degree: 3 };

  var TRAIT_TEXT = {
    O: { high: 'You are drawn to ideas, novelty and things that are beautiful or original. Routine work will need a creative outlet alongside it.', mid: 'You like some novelty but also value what works. You can adapt to both creative and practical roles.', low: 'You prefer proven methods and concrete tasks. You will do best where the goal is clear and the craft is real.' },
    C: { high: 'You are organised, reliable and you finish things. Employers notice this fast; use it as your headline.', mid: 'You can be organised when it matters and relaxed when it does not. Roles with some structure will suit you.', low: 'You work in bursts and dislike rigid systems. Look for roles that reward results over process, or build a light structure you can live with.' },
    E: { high: 'People give you energy. A role with little human contact will feel like a slow leak.', mid: 'You enjoy people in the right doses and need some quiet to recover. A mixed week is ideal.', low: 'You do your best thinking alone and find constant interaction tiring. Protect your focus time in whatever you choose.' },
    A: { high: 'You are warm, cooperative and quick to help. Care, support and service roles will feel natural; guard against being taken for granted.', mid: 'You are kind but can hold your ground. That balance suits roles that mix support with decisions.', low: 'You are direct and comfortable with disagreement. Negotiation, quality control and leadership can use that well.' },
    N: { high: 'You feel things strongly and notice risks early. Choose a calm culture and a manager who gives clear feedback; that matters more than the job title.', mid: 'You feel pressure but recover. Most working environments will be fine with reasonable boundaries.', low: 'You stay steady under pressure. High-stakes or fast-moving roles will not knock you off course.' }
  };

  var RIASEC_TEXT = {
    R: 'Practical: you like making, fixing, growing and doing with your hands or body.',
    I: 'Investigative: you like understanding, analysing and solving.',
    A: 'Creative: you like designing, expressing and inventing.',
    S: 'Social: you like helping, teaching and caring.',
    E: 'Enterprising: you like persuading, leading and building ventures.',
    C: 'Organising: you like order, accuracy and systems that run smoothly.'
  };

  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function mean(arr) { return arr.length ? arr.reduce(function (a, b) { return a + b; }, 0) / arr.length : 0; }

  /* Likert items: map 1..5 to 0..100, flipping reversed items. Returns per-trait averages. */
  function scoreSection(section, answers) {
    var buckets = {};
    section.items.forEach(function (item) {
      var raw = answers[item.id];
      if (typeof raw !== 'number') return;
      var v = item.reverse ? 6 - raw : raw;
      var pct = (v - 1) / 4 * 100;
      (buckets[item.trait] = buckets[item.trait] || []).push(pct);
    });
    var out = {};
    Object.keys(buckets).forEach(function (k) { out[k] = Math.round(mean(buckets[k])); });
    return out;
  }

  function band(score) { return score >= 65 ? 'high' : score <= 35 ? 'low' : 'mid'; }

  function buildProfile(survey, answers) {
    var sections = {};
    survey.sections.forEach(function (s) { sections[s.id] = s; });
    var big5 = scoreSection(sections.character, answers.character || {});
    var riasec = scoreSection(sections.interests, answers.interests || {});
    TRAITS.forEach(function (t) { if (big5[t] == null) big5[t] = 50; });
    RIASEC.forEach(function (t) { if (riasec[t] == null) riasec[t] = 50; });
    var code = RIASEC.slice().sort(function (a, b) { return riasec[b] - riasec[a]; }).slice(0, 3).join('');
    var style = {};
    sections.workstyle.items.forEach(function (it) {
      var v = (answers.workstyle || {})[it.id];
      style[it.key] = typeof v === 'number' ? v / 100 : 0.5;
    });
    return {
      big5: big5,
      big5Text: TRAITS.reduce(function (acc, t) { acc[t] = TRAIT_TEXT[t][band(big5[t])]; return acc; }, {}),
      riasec: riasec,
      code: code,
      values: (answers.values && answers.values.order) || [],
      style: style,
      life: answers.life || {},
      reflection: answers.reflection || {}
    };
  }

  function cosine(a, b, keys) {
    var dot = 0, na = 0, nb = 0;
    keys.forEach(function (k) { dot += a[k] * b[k]; na += a[k] * a[k]; nb += b[k] * b[k]; });
    return (na && nb) ? dot / Math.sqrt(na * nb) : 0;
  }

  /* Score every direction against the profile. Returns sorted array with fit, feasibility, reasons, cautions. */
  function matchDirections(profile, directions) {
    var life = profile.life;
    var hours = Number(life.hours || 5);
    var runway = Number(life.runway || 0);
    var studyOk = STUDY_RANK[life.study || 'short'];
    var energy = { high: 3, medium: 2, low: 1 }[life.energy || 'medium'];

    var rNorm = {};
    RIASEC.forEach(function (k) { rNorm[k] = profile.riasec[k] / 100; });

    var results = directions.map(function (d) {
      var reasons = [], cautions = [];

      /* Interests */
      var interest = cosine(rNorm, d.riasec, RIASEC); /* 0..1 */
      var topDir = RIASEC.slice().sort(function (a, b) { return d.riasec[b] - d.riasec[a]; }).slice(0, 2);
      topDir.forEach(function (k) {
        if (profile.riasec[k] >= 65 && d.riasec[k] >= 0.6) reasons.push('Your strong ' + RIASEC_NAMES[k].toLowerCase() + ' interest is the heart of this work.');
        if (profile.riasec[k] <= 35 && d.riasec[k] >= 0.8) cautions.push('The ' + RIASEC_NAMES[k].toLowerCase() + ' side of this work scored low in your interests.');
      });

      /* Traits */
      var tSum = 0, tW = 0;
      Object.keys(d.traits).forEach(function (t) {
        var pref = d.traits[t];
        var s = (profile.big5[t] - 50) / 50; /* -1..1 */
        tSum += pref * s; tW += Math.abs(pref);
        if (Math.abs(pref) >= 0.6) {
          if (pref * s > 0.3) reasons.push('Your ' + TRAIT_NAMES[t].toLowerCase() + (pref > 0 ? ' is an asset here.' : ' (on the steadier side) suits this.'));
          if (pref * s < -0.3) cautions.push((pref > 0 ? 'This work leans on ' + TRAIT_NAMES[t].toLowerCase() + ', which is not your natural mode.' : 'Your high ' + TRAIT_NAMES[t].toLowerCase() + ' may make parts of this tiring.'));
        }
      });
      var trait = tW ? (tSum / tW + 1) / 2 : 0.5;

      /* Work style */
      var diffs = Object.keys(d.style).map(function (k) { return Math.abs(d.style[k] - (profile.style[k] == null ? 0.5 : profile.style[k])); });
      var style = 1 - mean(diffs);
      var settingGap = d.style.setting - profile.style.setting;
      if (Math.abs(settingGap) < 0.2) reasons.push(d.style.setting < 0.4 ? 'Desk-based, which matches what you asked for.' : d.style.setting > 0.7 ? 'Hands-on and active, as you wanted.' : 'A mix of desk and doing, as you wanted.');
      if (settingGap > 0.5) cautions.push('Much more physical and hands-on than you said you wanted.');
      if (settingGap < -0.5) cautions.push('Much more desk-bound than you said you wanted.');
      if (d.style.people >= 0.8 && profile.style.people <= 0.3) cautions.push('People all day; you asked for more time on your own.');
      if (d.style.people <= 0.3 && profile.style.people >= 0.75) cautions.push('Fairly solitary; you asked for more people contact.');

      /* Values */
      var vScore = 0, vMax = 0, served = [];
      profile.values.forEach(function (v, i) {
        var w = 5 - i; vMax += w;
        if (d.values.indexOf(v) >= 0) { vScore += w; served.push(VALUE_NAMES[v]); }
      });
      var values = vMax ? vScore / vMax : 0.5;
      if (served.length) reasons.push('Serves what you said matters: ' + served.slice(0, 3).join(', ').toLowerCase() + '.');

      /* Feasibility */
      var feas = 1;
      if (STUDY_RANK[d.study] > studyOk) { feas *= 0.55; cautions.push('Needs ' + ({ short: 'a short course', year: 'about a year of study', degree: 'degree-level training' })[d.study] + ', more than you said you would accept.'); }
      if (d.months > runway && life.income === 'essential' && d.months > 3) { feas *= 0.6; cautions.push('Typically ' + d.months + ' months before it pays; with income essential you would need to do this alongside current work.'); }
      else if (d.months > runway && d.months > 3) { feas *= 0.85; cautions.push('About ' + d.months + ' months before first earnings; plan the transition part-time.'); }
      if (d.energy > energy) { feas *= (d.energy - energy >= 2 ? 0.55 : 0.8); cautions.push('Physically or emotionally demanding; you said your energy needs care right now.'); }
      if (life.mobility === 'home' && d.style.location > 0.5) { feas *= 0.6; cautions.push('Mostly out and about; you said home-based only.'); }
      if (life.mobility === 'local' && d.style.location > 0.85) { feas *= 0.85; }
      if ((life.caring === 'young' || life.caring === 'mixed') && d.flex <= 2) { feas *= 0.75; cautions.push('Fixed or long hours, which sit awkwardly with young children unless childcare is solid.'); }
      if (life.income === 'essential' && d.income <= 2) { feas *= 0.7; cautions.push('Income is uneven in this line of work, at least at first.'); }
      if (hours <= 2 && d.months >= 9) { feas *= 0.8; cautions.push('At two hours a week the training would stretch over a long time.'); }
      if (d.languages && life.languages && life.languages !== 'one') { feas = Math.min(1, feas * 1.15); reasons.push('Your second language is the whole point of this route.'); }
      if (d.id === 'trades' || d.id === 'engineering_technician') { if (life.age === '50p') feas *= 0.9; }
      if (life.situation === 'returning' && d.study === 'none') reasons.push('Quick to re-enter, which suits a return after a break.');

      var fit = 0.40 * interest + 0.20 * trait + 0.20 * style + 0.20 * values;
      var total = fit * (0.6 + 0.4 * feas);
      return { direction: d, fit: fit, feasibility: feas, score: total, reasons: reasons.slice(0, 4), cautions: cautions.slice(0, 4),
        parts: { interest: interest, trait: trait, style: style, values: values } };
    });
    results.sort(function (a, b) { return b.score - a.score; });
    return results;
  }

  /* Where the astrology lens agrees or disagrees with the survey. */
  function compareWithAstro(profile, tendencies) {
    if (!tendencies) return [];
    var notes = [];
    TRAITS.forEach(function (t) {
      var astro = tendencies[t]; var s = (profile.big5[t] - 50) / 50;
      if (Math.abs(astro) < 0.25) return;
      if (astro * s > 0.15) notes.push({ agree: true, text: 'Both your chart and your answers point to ' + (astro > 0 ? 'higher' : 'lower') + ' ' + TRAIT_NAMES[t].toLowerCase() + '.' });
      else if (astro * s < -0.15) notes.push({ agree: false, text: 'Your chart is read as ' + (astro > 0 ? 'higher' : 'lower') + ' ' + TRAIT_NAMES[t].toLowerCase() + ', but your answers say otherwise. Trust the answers; ask yourself whether the chart describes an older version of you.' });
    });
    RIASEC.forEach(function (k) {
      var astro = tendencies.riasec[k]; var s = (profile.riasec[k] - 50) / 50;
      if (astro >= 0.3 && s > 0.2) notes.push({ agree: true, text: 'The chart’s pull towards ' + RIASEC_NAMES[k].toLowerCase() + ' work shows up in your interests too.' });
      if (astro >= 0.3 && s < -0.2) notes.push({ agree: false, text: 'The chart is read as leaning ' + RIASEC_NAMES[k].toLowerCase() + ', which you rated low. Worth a moment’s reflection, then move on.' });
    });
    return notes.slice(0, 5);
  }

  /* 13-week plan in four phases, shaped by the top directions and life circumstances. */
  function buildPlan(profile, matches, chosenIds) {
    var life = profile.life;
    var hours = Number(life.hours || 5);
    var perWeek = hours <= 2 ? 1 : hours <= 5 ? 2 : hours <= 10 ? 3 : 4;
    var chosen = matches.filter(function (m) { return chosenIds.indexOf(m.direction.id) >= 0; });
    if (!chosen.length) chosen = matches.slice(0, 2);
    var primary = chosen[0].direction;
    var secondary = chosen[1] ? chosen[1].direction : null;

    var guard = [];
    if (life.income === 'essential') guard.push('Keep your current income throughout. Nothing in this plan requires you to resign.');
    if (life.caring === 'young' || life.caring === 'mixed') guard.push('Agree with your household which ' + hours + ' hours a week are protected for this, and put them in the shared calendar.');
    if (life.support === 'little') guard.push('Find one ally outside the home (a friend, a former colleague, an online group) and tell them the plan. You should not carry this alone.');
    if (life.energy === 'low') guard.push('One task at a time, rest built in. If a week is missed, the plan moves, it does not fail.');
    if (life.support === 'some') guard.push('Have the honest conversation at home in week one, before you start, not after.');

    var weeks = [];
    function week(n, phase, tasks) { weeks.push({ n: n, phase: phase, tasks: tasks.slice(0, perWeek).map(function (t) { return { text: t, done: false }; }) }); }

    /* Phase 1: clarity (weeks 1-2) */
    week(1, 'Clarity', [
      'Read your Compass report end to end and mark three sentences that feel true and one that feels wrong.',
      'Write half a page answering: what does a good Tuesday look like in two years?',
      'Tell one person you trust that you are exploring ' + primary.name.toLowerCase() + (secondary ? ' and ' + secondary.name.toLowerCase() : '') + '.',
      'List every skill from your reflection answers on one page, in plain words.'
    ]);
    week(2, 'Clarity', [
      'Find two people doing ' + primary.name.toLowerCase() + ' (LinkedIn, friends of friends) and ask for a twenty-minute conversation.',
      'Write down the honest fear you named, then the evidence for and against it.',
      secondary ? 'Do the same for ' + secondary.name.toLowerCase() + ': find one person to talk to.' : 'Look up three real job adverts or listings for this direction and note what they ask for.',
      'Work out your real monthly number: what the household needs, not what you earn now.'
    ]);

    /* Phase 2: test (weeks 3-6) */
    week(3, 'Test', [
      'Start the taster: ' + primary.taster,
      primary.steps[0],
      'Hold the two conversations from week two and write down the one thing that surprised you in each.'
    ]);
    week(4, 'Test', [
      'Continue the taster and keep a short log: energy before and after each session.',
      primary.steps[1],
      secondary ? 'Start the second taster: ' + secondary.taster : 'Look at the entry route for this direction near you and note dates, cost and any funding.'
    ]);
    week(5, 'Test', [
      'Finish the taster and answer in writing: did I enjoy the people, the task and the pace?',
      primary.steps[2] || 'Ask one person who does this what they wish they had known at the start.',
      secondary ? secondary.steps[0] : 'Check funding: employer contribution, advanced learner loan, free courses, bursaries.'
    ]);
    week(6, 'Test', [
      'Review with your coach: score each direction 1 to 10 on enjoyment, feasibility and gut feel.',
      'Decide: continue with ' + primary.name.toLowerCase() + ', switch to the second option, or go back to the shortlist.',
      'Write one paragraph you could say out loud about why this direction, to a sceptical relative.'
    ]);

    /* Phase 3: build (weeks 7-10) */
    week(7, 'Build', [
      'Rewrite your CV or profile for the chosen direction. Lead with results and numbers, not duties.',
      'Enrol on or start the training identified in week five, if any is needed.',
      'Set up job alerts, or if self-employed, write the one-page offer and price list.'
    ]);
    week(8, 'Build', [
      'Produce one piece of evidence: a portfolio item, a case study, a certificate, a completed volunteer project.',
      'Ask two people for a reference or testimonial you can use.',
      'Practise telling your story in ninety seconds: where you were, what changed, why this.'
    ]);
    week(9, 'Build', [
      'Apply for three roles, or pitch to three potential customers, whichever fits.',
      'Do a mock interview or a mock client call with your coach or a friend.',
      'Book the next step of training or the next taster with a date in the diary.'
    ]);
    week(10, 'Build', [
      'Follow up on every application or pitch. Silence is not an answer.',
      'Review your household number against realistic first-year earnings and decide the transition shape: part-time first, or a clean switch.',
      'Update the people who supported you on where things stand.'
    ]);

    /* Phase 4: commit (weeks 11-13) */
    week(11, 'Commit', [
      'Write a twelve-month plan on one page: the first job or first ten customers, the training, the money.',
      'Set a decision date with your household for any big step (notice, course fees, childcare change).',
      'Line up the practical support: childcare cover, a study space, a weekly check-in partner.'
    ]);
    week(12, 'Commit', [
      'Take the committing step: accept the role, pay the deposit, register the business, or hand in notice.',
      'Tell everyone who needs to know, including the people who will feel it at home.',
      'Plan a rest. Changes made tired go badly.'
    ]);
    week(13, 'Commit', [
      'Look back at week one. Write what you believed then and what you know now.',
      'Set the first three monthly check-ins with your coach for the new chapter.',
      'Do something to mark the change, however small.'
    ]);

    return { primary: primary, secondary: secondary, perWeek: perWeek, hours: hours, guard: guard, weeks: weeks, created: new Date().toISOString() };
  }

  global.Engine = {
    TRAITS: TRAITS, RIASEC: RIASEC, TRAIT_NAMES: TRAIT_NAMES, RIASEC_NAMES: RIASEC_NAMES, VALUE_NAMES: VALUE_NAMES, RIASEC_TEXT: RIASEC_TEXT,
    buildProfile: buildProfile, matchDirections: matchDirections, compareWithAstro: compareWithAstro, buildPlan: buildPlan, band: band
  };
})(typeof window !== 'undefined' ? window : globalThis);
