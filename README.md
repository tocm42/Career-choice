# Compass

A personal app to help one person (built for Gaëlle) choose her next direction in life, and then coach her towards it.

It runs entirely in the browser. There is no build step, no server and no account. Open `index.html` or host the folder on any static web host.

## What it does

1. **About you.** Name, date of birth, and optionally the time and place of birth.
2. **Survey.** Six short parts, about twenty minutes in total:
   - Character (a twenty-item Big Five inventory).
   - Interests (an eighteen-item Holland RIASEC inventory).
   - What matters (choose and rank five of twelve values).
   - How you like to work (eight sliders: desk or hands-on, home or out, people or alone, pace, structure, leading, depth, risk).
   - Your life right now (twelve questions on caring responsibilities, support at home, hours available, income needs, financial runway, appetite for study, mobility, energy, education, languages, age band).
   - In your own words (six reflection prompts that feed the coaching).
3. **Report.** Character and interest scores with plain-English interpretation, values, work-style summary, and the birth-chart lens: sun, moon and rising signs, dominant element, life path number and Chinese zodiac. The report says where the chart agrees with the survey and where it does not, and tells the user to trust the survey when they differ.
4. **Directions.** Thirty-seven real directions across seven clusters (office and organising; care, education and support; creative and hands-on; language and communication; mission and public service; technical; independent). Each is scored for **fit** (interests, character, work style, values) and **feasibility now** (study needed, months to first pay, income stability, energy demand, mobility, childcare). Each card explains why it scored as it did, lists cautions, and gives three first steps and a two-week taster.
5. **Plan.** A thirteen-week plan in four phases (Clarity, Test, Build, Commit) built around one or two chosen directions, with the number of tasks per week scaled to the hours available and guardrails drawn from the life circumstances (for example, never resign if income is essential).
6. **Coach.** Four tools:
   - Weekly check-in: energy, what was done, what got in the way. The built-in coach reflects it back and sets one small step, using the plan's next open task.
   - Coaching session: a structured Goal, Reality, Options, Will session with feedback on weak commitments.
   - Talk to the coach: a conversational coach powered by Claude, using the user's own Anthropic API key. The key stays in the browser. The system prompt includes the report, plan, progress and recent check-ins.
   - History: a timeline of check-ins and sessions with an energy trend.

Everything is saved in the browser's local storage. There are export and import buttons so the data can be moved between devices, and a print button for the report and plan.

## Astrology, honestly

The app is clear with the user that astrology has no predictive evidence behind it. The chart is used the way a good coach uses a metaphor: to prompt a question, never to decide. Where the chart and survey disagree, the app says so and tells the user to trust the survey.

The calculations are real, though. `js/astro.js` implements the low-precision solar and lunar longitude algorithms and the ascendant formula from Meeus, *Astronomical Algorithms*, tested against the worked examples in that book. Sign placement is accurate to within a degree or two; the app flags placements near a sign boundary.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page shell |
| `css/style.css` | Styling, light and dark themes, print styles |
| `js/data/questions.js` | Survey question bank |
| `js/data/directions.js` | Direction catalogue with weights, constraints and first steps |
| `js/data/cities.js` | Birthplace gazetteer (latitude, longitude, standard UTC offset) |
| `js/astro.js` | Sun, moon and rising sign calculation and reflection text |
| `js/engine.js` | Scoring, matching, chart comparison and plan building |
| `js/coach.js` | Built-in coach templates and the optional Claude-powered coach |
| `js/app.js` | State, routing and rendering |

## Running it locally

Any static server works:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000/`. Opening `index.html` directly from disk also works in most browsers.

## The conversational coach

On the Coach screen, the "Talk to the coach" tab accepts an Anthropic API key. Calls go straight from the browser to `https://api.anthropic.com/v1/messages` using the `claude-opus-5` model with server-side refusal fallbacks enabled. The key is stored in local storage on that device only. If you would rather not use a key, the check-in and session tabs work without one.

## Adapting it

- To add or change directions, edit `js/data/directions.js`. The matcher reads the weights; nothing else needs to change.
- To change questions, edit `js/data/questions.js`. Likert items need a `trait` letter; reversed items set `reverse: true`.
- The plan phases and generic tasks live in `Engine.buildPlan` in `js/engine.js`.
- Coach responses by obstacle type live in `Coach.OBSTACLES` in `js/coach.js`.
