/* Coaching module for the Compass app.
 * Two layers: a built-in coach that works offline from templates keyed to the profile and plan,
 * and an optional conversational coach that calls the Claude API directly from the browser with
 * the user's own key. The built-in coach never needs a network connection.
 */
(function (global) {
  'use strict';

  var OBSTACLES = {
    time: { label: 'Not enough time', responses: [
      'Time is rarely the real block; it is usually that the task has no fixed slot. What is the smallest version you could do in twenty minutes, and when exactly this week?',
      'Look at the week just gone. Where did the hours actually go? Not to judge, just to see which slot could be borrowed.'
    ], step: 'Put one twenty-minute slot in the calendar now, with the task named, and treat it like a dentist appointment.' },
    confidence: { label: 'Doubting myself', responses: [
      'Doubt shows up right before a real step, not a pretend one. That is a sign you are close to something that matters. What would you tell a friend who said this to you?',
      'Confidence follows action, not the other way round. Which tiny piece of the task could you do badly, on purpose, just to have started?'
    ], step: 'Write three things you have already done that a past version of you would not have believed. Keep the list where you can see it.' },
    money: { label: 'Money worries', responses: [
      'Money fears get smaller when they become numbers. Do you know the household’s real monthly minimum, and what the first year of this direction realistically pays?',
      'Most changes do not need a leap; they need a bridge. What would a part-time or evening version of this step look like while your income stays as it is?'
    ], step: 'Write down the monthly minimum, the current income, and the gap. Then list two ways to bridge it without resigning.' },
    family: { label: 'Family or home pressures', responses: [
      'Change at home is a shared project even when it is your career. Who at home has not yet been asked what they need from this?',
      'When family life squeezes the plan, the plan adapts; it does not disappear. What is the one task this week that survives even a bad week?'
    ], step: 'Have a fifteen-minute conversation at home this week: here is what I am doing, here is the hour I need, here is what I will give back.' },
    energy: { label: 'Low energy or health', responses: [
      'Tired people make cautious plans and then blame themselves for not keeping them. Rest is part of the plan. What would a gentler version of this week look like?',
      'When energy is low, one task done is a full week. Which one matters most, and can the others wait?'
    ], step: 'Choose one task for the week and drop the rest without guilt. Note what time of day you have the most energy and put the task there.' },
    unclear: { label: 'Not sure what to do next', responses: [
      'Being unclear is information: the next step is probably a conversation or a taster, not a decision. Who could you ask, or what could you try, that would tell you something?',
      'When the next step is fuzzy, make it smaller until it is obvious. What is the step before the step?'
    ], step: 'Write down the question you cannot answer, then name one person or one experiment that would answer it. Do that this week.' },
    fear: { label: 'Fear of getting it wrong', responses: [
      'Most of the steps in your plan are reversible. Which ones actually are not? Everything else is safe to try.',
      'Getting it wrong at this stage costs a few hours. Staying where you are costs years. What is the reversible version of what you are afraid of?'
    ], step: 'For the step you are avoiding, write what happens if it goes badly, and how you would recover. Then do the step.' },
    none: { label: 'No real obstacle, just did not do it', responses: [
      'Fair enough; that happens. No story needed. What will make it easier to start this week: a smaller task, a fixed time, or someone to tell?',
      'Momentum is easier to keep than to restart. Do the smallest task on the list today, even if it is only ten minutes.'
    ], step: 'Do the smallest task on this week’s list today, before anything else.' }
  };

  var PRAISE = [
    'That is real progress. Notice it before moving on.',
    'Good. Every one of those steps is evidence against the fear you named.',
    'Well done. Small steps done consistently are how every career change actually happens.',
    'That counts. Write it down somewhere you will see it on a low day.'
  ];

  function pick(arr, seed) { return arr[Math.abs(seed) % arr.length]; }

  function opening(profile, plan, name) {
    var first = name ? name.split(' ')[0] : 'there';
    var lines = [];
    lines.push('Hello ' + first + '. I have read your report and your plan, so you do not need to explain the background.');
    if (plan && plan.primary) lines.push('The direction you are testing is ' + plan.primary.name.toLowerCase() + (plan.secondary ? ', with ' + plan.secondary.name.toLowerCase() + ' as a second option' : '') + '. Your plan runs thirteen weeks at about ' + plan.hours + ' hours a week.');
    if (profile && profile.reflection && profile.reflection.fear) lines.push('You named a fear: “' + profile.reflection.fear.trim() + '”. We will come back to it, gently and often.');
    lines.push('Each week, tell me your energy, what you did, and what got in the way. I will reflect it back and give you one small step. Nothing more than that.');
    return lines.join('\n\n');
  }

  function reflect(checkin, history, plan) {
    var n = history.length;
    var out = [];
    var energy = Number(checkin.energy || 5);
    if (energy <= 3) out.push('Energy at ' + energy + ' out of 10. That is low. Whatever else we say, this week’s plan gets smaller, not bigger.');
    else if (energy >= 8) out.push('Energy at ' + energy + '. Use it: this is the week for the task you have been putting off.');
    else out.push('Energy at ' + energy + ', which is workable. Steady weeks are where most of the progress happens.');

    var done = (checkin.done || '').trim();
    if (done) out.push(pick(PRAISE, n) + ' You said you did: ' + done + '.');
    else out.push('Nothing ticked this week. That is data, not a verdict.');

    var ob = OBSTACLES[checkin.obstacle] || OBSTACLES.none;
    out.push(pick(ob.responses, n));

    if (checkin.note && checkin.note.trim()) {
      var note = checkin.note.trim();
      if (/\b(quit|resign|give up|stop)\b/i.test(note)) out.push('I noticed the word about stopping. Before any big decision, sleep on it twice and talk to one person who knows you well. Then, if it still stands, we plan it properly.');
      else if (/\b(excited|loved|enjoyed|great|brilliant)\b/i.test(note)) out.push('There is real energy in what you wrote. Enjoyment during a taster is one of the strongest signals we get. Note exactly what you enjoyed: the people, the task, or the result.');
      else if (/\b(scared|afraid|anxious|worried|nervous)\b/i.test(note)) out.push('Fear showing up now is normal. It usually means the step is real. What is the reversible version of it?');
    }

    var nextTask = null;
    if (plan) {
      for (var i = 0; i < plan.weeks.length && !nextTask; i++) {
        for (var j = 0; j < plan.weeks[i].tasks.length; j++) {
          if (!plan.weeks[i].tasks[j].done) { nextTask = { week: plan.weeks[i].n, text: plan.weeks[i].tasks[j].text }; break; }
        }
      }
    }
    var step = ob.step;
    if (energy <= 3 && nextTask) step = 'This week, only this: ' + nextTask.text;
    else if (nextTask && checkin.obstacle === 'none') step = 'Your next plan task is from week ' + nextTask.week + ': ' + nextTask.text;

    return { message: out.join('\n\n'), step: step, commitment: checkin.commit || step };
  }

  /* GROW session prompts: Goal, Reality, Options, Will. */
  var GROW = [
    { key: 'goal', title: 'Goal', prompt: 'What do you want to have sorted by the end of this session? Make it small enough to finish today.', help: 'Examples: decide which taster to do first; write the message to a contact; work out the monthly number.' },
    { key: 'reality', title: 'Reality', prompt: 'What is actually true right now about this? Facts, not feelings, then feelings.', help: 'What have you tried? What happened? What is in the way? Who else is affected?' },
    { key: 'options', title: 'Options', prompt: 'List at least four ways forward, including one that is slightly silly and one that costs nothing.', help: 'Do not judge them yet. Quantity first.' },
    { key: 'will', title: 'Will', prompt: 'Which option will you take, when exactly, and what might stop you? What will you do if that happens?', help: 'A date, a time, and a plan B. Then it is real.' }
  ];

  function sessionSummary(session) {
    var s = session.answers || {};
    var lines = ['Session on ' + new Date(session.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) + '.'];
    if (s.goal) lines.push('Goal: ' + s.goal.trim());
    if (s.will) lines.push('Commitment: ' + s.will.trim());
    return lines.join('\n');
  }

  function coachClose(session) {
    var s = session.answers || {};
    var msg = [];
    if (s.options && s.options.split(/\n|,|;/).filter(function (x) { return x.trim(); }).length < 3) msg.push('You listed fewer than three options. The best one is often the fourth. Add two more before you choose.');
    if (s.will && !/\b(mon|tue|wed|thu|fri|sat|sun|today|tomorrow|\d{1,2}(st|nd|rd|th)?|week)\b/i.test(s.will)) msg.push('Your commitment has no day in it. Add one, or it will drift.');
    if (!msg.length) msg.push('That is a clear session: a goal, an honest look at reality, real options, and a dated commitment. I will ask you about it at your next check-in.');
    return msg.join(' ');
  }

  /* ---------- Conversational coach (Claude API, direct from the browser) ---------- */

  function systemPrompt(ctx) {
    var p = ctx.profile, a = ctx.astro, plan = ctx.plan;
    var parts = [];
    parts.push('You are a warm, direct career and life coach inside a personal app called Compass. You are coaching ' + (ctx.name || 'the user') + ', who is choosing their next direction in life. Speak plainly in British English. Ask one question at a time. Reflect back what you hear, then offer one small concrete step. Never lecture, never give lists longer than three items, never use headings. Keep replies under 180 words unless asked for detail. Do not give medical, legal or financial advice beyond common sense; point to a professional when needed.');
    parts.push('Treat the survey results as the evidence about this person and the astrology as a reflection lens only. Never claim the stars determine anything. If the user asks about the chart, use it to ask a better question, not to predict.');
    if (p) {
      parts.push('Character (0-100): openness ' + p.big5.O + ', conscientiousness ' + p.big5.C + ', extraversion ' + p.big5.E + ', agreeableness ' + p.big5.A + ', sensitivity ' + p.big5.N + '. Interest code ' + p.code + ' (R practical ' + p.riasec.R + ', I investigative ' + p.riasec.I + ', A creative ' + p.riasec.A + ', S social ' + p.riasec.S + ', E enterprising ' + p.riasec.E + ', C organising ' + p.riasec.C + ').');
      parts.push('Top values in order: ' + p.values.join(', ') + '.');
      var l = p.life;
      parts.push('Life circumstances: situation ' + l.situation + '; caring ' + l.caring + '; home support ' + l.support + '; hours a week available ' + l.hours + '; income steadiness ' + l.income + '; runway months ' + l.runway + '; study accepted ' + l.study + '; mobility ' + l.mobility + '; energy ' + l.energy + '; education ' + l.education + '; languages ' + l.languages + '; age band ' + l.age + '.');
      var r = p.reflection;
      var refl = Object.keys(r).filter(function (k) { return r[k]; }).map(function (k) { return k + ': ' + r[k]; }).join(' | ');
      if (refl) parts.push('In their own words: ' + refl);
    }
    if (a && a.available) parts.push('Astrology lens: Sun ' + a.sun.sign.name + ', Moon ' + a.moon.sign.name + (a.rising ? ', Rising ' + a.rising.sign.name : '') + ', dominant element ' + a.dominantElement + ', life path ' + a.lifePath.number + '.');
    if (plan) {
      parts.push('Plan: primary direction ' + plan.primary.name + (plan.secondary ? ', secondary ' + plan.secondary.name : '') + '. Thirteen weeks, ' + plan.perWeek + ' tasks a week. Guardrails: ' + plan.guard.join(' '));
      var doneCount = 0, total = 0, next = null;
      plan.weeks.forEach(function (w) { w.tasks.forEach(function (t) { total++; if (t.done) doneCount++; else if (!next) next = 'week ' + w.n + ': ' + t.text; }); });
      parts.push('Progress: ' + doneCount + ' of ' + total + ' tasks done. Next open task: ' + (next || 'none') + '.');
    }
    if (ctx.checkins && ctx.checkins.length) {
      var last = ctx.checkins.slice(-3).map(function (c) { return new Date(c.date).toLocaleDateString('en-GB') + ' energy ' + c.energy + ', did: ' + (c.done || 'nothing') + ', obstacle: ' + c.obstacle + (c.note ? ', note: ' + c.note : ''); }).join(' || ');
      parts.push('Recent check-ins: ' + last);
    }
    return parts.join('\n\n');
  }

  function ask(apiKey, ctx, history, userMessage) {
    var messages = history.concat([{ role: 'user', content: userMessage }]);
    return fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'server-side-fallback-2026-07-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-opus-5',
        max_tokens: 2048,
        fallbacks: 'default',
        system: systemPrompt(ctx),
        messages: messages
      })
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) { var e = new Error((data.error && data.error.message) || ('Request failed with status ' + res.status)); e.status = res.status; throw e; }
        if (data.stop_reason === 'refusal') return { text: 'I cannot help with that particular request. Let us go back to your plan: what is the next step you are unsure about?', refusal: true };
        var text = (data.content || []).filter(function (b) { return b.type === 'text'; }).map(function (b) { return b.text; }).join('\n').trim();
        return { text: text || '(No reply text returned.)' };
      });
    });
  }

  global.Coach = { OBSTACLES: OBSTACLES, GROW: GROW, opening: opening, reflect: reflect, sessionSummary: sessionSummary, coachClose: coachClose, systemPrompt: systemPrompt, ask: ask };
})(typeof window !== 'undefined' ? window : globalThis);
