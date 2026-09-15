/* Survey bank for the Compass app.
 * Sections: character (Big Five), interests (Holland RIASEC), values, work style, life circumstances, reflection.
 * Likert items score 1..5. Reversed items are flagged so the engine flips them.
 */
(function (global) {
  'use strict';

  var LIKERT = ['Not like me', 'A little like me', 'Somewhat', 'Quite like me', 'Very like me'];
  var ENJOY = ['Would hate it', 'Not for me', 'Could do it', 'Would enjoy it', 'Would love it'];

  global.SURVEY = {
    likert: LIKERT,
    enjoy: ENJOY,
    sections: [
      {
        id: 'character',
        title: 'Character',
        intro: 'These twenty statements build a picture of how you tend to operate. There are no better or worse answers; honest ones are the only useful ones.',
        type: 'likert',
        scale: LIKERT,
        items: [
          { id: 'O1', trait: 'O', text: 'I enjoy new ideas and get bored repeating the same thing.' },
          { id: 'O2', trait: 'O', text: 'I notice beauty in things other people walk past.' },
          { id: 'O3', trait: 'O', text: 'I prefer tried and tested ways of doing things.', reverse: true },
          { id: 'O4', trait: 'O', text: 'I like to understand how and why something works, not just what to do.' },
          { id: 'C1', trait: 'C', text: 'I finish what I start, even when it gets dull.' },
          { id: 'C2', trait: 'C', text: 'I keep lists, plans or a tidy system for my work.' },
          { id: 'C3', trait: 'C', text: 'I leave things to the last minute.', reverse: true },
          { id: 'C4', trait: 'C', text: 'People describe me as reliable.' },
          { id: 'E1', trait: 'E', text: 'A day full of people leaves me energised rather than drained.' },
          { id: 'E2', trait: 'E', text: 'I am comfortable speaking up in a group of strangers.' },
          { id: 'E3', trait: 'E', text: 'I prefer working quietly on my own.', reverse: true },
          { id: 'E4', trait: 'E', text: 'I am usually the one who gets things moving socially.' },
          { id: 'A1', trait: 'A', text: 'I put other people at ease.' },
          { id: 'A2', trait: 'A', text: 'I find it easy to see things from someone else’s side.' },
          { id: 'A3', trait: 'A', text: 'I can be blunt when I think someone is wrong.', reverse: true },
          { id: 'A4', trait: 'A', text: 'Helping someone matters more to me than being right.' },
          { id: 'N1', trait: 'N', text: 'I worry about things that have not happened yet.' },
          { id: 'N2', trait: 'N', text: 'Criticism stays with me for days.' },
          { id: 'N3', trait: 'N', text: 'I stay calm under pressure.', reverse: true },
          { id: 'N4', trait: 'N', text: 'My mood changes a lot from day to day.' }
        ]
      },
      {
        id: 'interests',
        title: 'Interests',
        intro: 'Imagine spending a working week doing each of these. Rate how much you would enjoy it, not how good you think you would be.',
        type: 'likert',
        scale: ENJOY,
        items: [
          { id: 'R1', trait: 'R', text: 'Fixing, building or maintaining something physical.' },
          { id: 'R2', trait: 'R', text: 'Working outdoors with plants, animals or the land.' },
          { id: 'R3', trait: 'R', text: 'Operating tools, machines or equipment.' },
          { id: 'I1', trait: 'I', text: 'Analysing data to find out what is really going on.' },
          { id: 'I2', trait: 'I', text: 'Researching a topic in depth and writing up the findings.' },
          { id: 'I3', trait: 'I', text: 'Solving a technical or scientific problem.' },
          { id: 'A1', trait: 'A', text: 'Designing something visual: a room, a poster, a garden, a website.' },
          { id: 'A2', trait: 'A', text: 'Writing, performing, photographing or making things.' },
          { id: 'A3', trait: 'A', text: 'Coming up with original ideas without a rulebook.' },
          { id: 'S1', trait: 'S', text: 'Teaching or explaining something to someone until it clicks.' },
          { id: 'S2', trait: 'S', text: 'Supporting someone through a hard time.' },
          { id: 'S3', trait: 'S', text: 'Looking after people’s health, learning or wellbeing.' },
          { id: 'E1', trait: 'E', text: 'Persuading people, selling or pitching an idea.' },
          { id: 'E2', trait: 'E', text: 'Leading a team or running a project with real responsibility.' },
          { id: 'E3', trait: 'E', text: 'Starting and growing your own business.' },
          { id: 'C1', trait: 'C', text: 'Organising records, schedules, budgets or systems so everything runs smoothly.' },
          { id: 'C2', trait: 'C', text: 'Working with numbers, forms and accuracy.' },
          { id: 'C3', trait: 'C', text: 'Following a clear process and getting it right every time.' }
        ]
      },
      {
        id: 'values',
        title: 'What matters',
        intro: 'Pick the five that matter most to you in the next chapter of your working life. Then rank them by dragging, or just tap them in order.',
        type: 'pick',
        pick: 5,
        items: [
          { id: 'security', text: 'Financial security', hint: 'A dependable income I can plan around.' },
          { id: 'flexibility', text: 'Flexibility', hint: 'Control over my hours and where I work.' },
          { id: 'family', text: 'Time for family', hint: 'Work that fits around the people I care for.' },
          { id: 'meaning', text: 'Meaning', hint: 'Knowing the work does some good.' },
          { id: 'growth', text: 'Learning and growth', hint: 'Getting better at something over years.' },
          { id: 'creativity', text: 'Creativity', hint: 'Making things and having ideas.' },
          { id: 'people', text: 'Connection', hint: 'Working closely with people I like.' },
          { id: 'autonomy', text: 'Independence', hint: 'Being my own boss, or close to it.' },
          { id: 'status', text: 'Recognition', hint: 'Being seen as good at what I do.' },
          { id: 'calm', text: 'Calm', hint: 'Low stress and a steady pace.' },
          { id: 'variety', text: 'Variety', hint: 'No two weeks the same.' },
          { id: 'craft', text: 'Craft', hint: 'Skilled hands-on work with a visible result.' }
        ]
      },
      {
        id: 'workstyle',
        title: 'How you like to work',
        intro: 'Each pair is a spectrum. Slide towards the side that sounds more like the work you want next, not the work you have now.',
        type: 'slider',
        items: [
          { id: 'setting', left: 'Desk and screen', right: 'On my feet, hands-on', key: 'setting' },
          { id: 'location', left: 'From home', right: 'Out and about', key: 'location' },
          { id: 'people', left: 'Mostly on my own', right: 'With people all day', key: 'people' },
          { id: 'pace', left: 'Steady and predictable', right: 'Fast and changing', key: 'pace' },
          { id: 'structure', left: 'Clear instructions', right: 'Figure it out myself', key: 'structure' },
          { id: 'lead', left: 'Contribute to a team', right: 'Lead and decide', key: 'lead' },
          { id: 'depth', left: 'Go deep on one thing', right: 'Juggle many things', key: 'depth' },
          { id: 'risk', left: 'Safe and proven', right: 'New and uncertain', key: 'risk' }
        ]
      },
      {
        id: 'life',
        title: 'Your life right now',
        intro: 'A plan that ignores real life fails in week two. These questions shape what is realistic, not what is possible.',
        type: 'choice',
        items: [
          { id: 'situation', text: 'Which best describes where you are now?', options: [
            ['employed_unhappy', 'Employed, but it no longer fits'],
            ['employed_ok', 'Employed and fine, but wanting more'],
            ['between', 'Between jobs'],
            ['returning', 'Returning after a break (parenting, caring, health, relocation)'],
            ['self', 'Self-employed or freelance'],
            ['studying', 'Studying or retraining']
          ] },
          { id: 'caring', text: 'Who depends on you day to day?', options: [
            ['none', 'Nobody, I am free to arrange my time'],
            ['young', 'Young children (pre-school or primary)'],
            ['older', 'Older children or teenagers'],
            ['adult', 'An adult I care for'],
            ['mixed', 'More than one of the above']
          ] },
          { id: 'support', text: 'How much practical support do you have at home for a change (childcare, income, encouragement)?', options: [
            ['strong', 'Strong, my household is behind this'],
            ['some', 'Some, but it needs negotiating'],
            ['little', 'Little, I would be doing this largely alone']
          ] },
          { id: 'hours', text: 'How many hours a week could you realistically give to a change right now (courses, applications, trial work)?', options: [
            ['2', 'Around 2 hours'],
            ['5', 'Around 5 hours'],
            ['10', 'Around 10 hours'],
            ['20', '20 hours or more']
          ] },
          { id: 'income', text: 'How important is it that your income stays steady during the change?', options: [
            ['essential', 'Essential, we depend on it'],
            ['important', 'Important, but a short dip is survivable'],
            ['flexible', 'Flexible, we have a cushion or a second income']
          ] },
          { id: 'runway', text: 'If retraining meant lower earnings, how long could you manage?', options: [
            ['0', 'Not at all'],
            ['3', 'About 3 months'],
            ['12', 'Up to a year'],
            ['36', 'Two to three years if it led somewhere good']
          ] },
          { id: 'study', text: 'How much study would you accept?', options: [
            ['none', 'None, I want to use what I already have'],
            ['short', 'A short course or certificate (weeks)'],
            ['year', 'A year-long qualification, part-time is fine'],
            ['degree', 'A degree-level or professional qualification']
          ] },
          { id: 'mobility', text: 'How far could you travel or relocate for work?', options: [
            ['home', 'Home-based only'],
            ['local', 'Local, under 30 minutes'],
            ['region', 'Up to an hour, or hybrid'],
            ['anywhere', 'Could relocate']
          ] },
          { id: 'energy', text: 'How are your health and energy at the moment?', options: [
            ['high', 'Good, I have energy to spare'],
            ['medium', 'Fine, but I need to pace myself'],
            ['low', 'Limited, I need to be careful with my energy']
          ] },
          { id: 'education', text: 'Highest level of education or qualification so far?', options: [
            ['school', 'School-level'],
            ['vocational', 'Vocational or college qualification'],
            ['degree', 'Degree'],
            ['postgrad', 'Postgraduate or professional qualification']
          ] },
          { id: 'languages', text: 'Do you speak more than one language well?', options: [
            ['one', 'Just one'],
            ['two', 'Two, comfortably'],
            ['more', 'Three or more']
          ] },
          { id: 'age', text: 'Which age band are you in? (It changes the advice on timescales, not what is possible.)', options: [
            ['u30', 'Under 30'],
            ['30s', '30 to 39'],
            ['40s', '40 to 49'],
            ['50p', '50 or over']
          ] }
        ]
      },
      {
        id: 'reflection',
        title: 'In your own words',
        intro: 'Short answers are fine. These feed the coaching sessions, and they are often where the real answer is hiding.',
        type: 'text',
        items: [
          { id: 'flow', text: 'What are you doing when you lose track of time?' },
          { id: 'drain', text: 'What part of your current or last job drained you most?' },
          { id: 'regret', text: 'What would you regret never having tried?' },
          { id: 'envy', text: 'Whose job or life do you quietly envy, and what exactly about it?' },
          { id: 'skills', text: 'What are you already good at, according to other people?' },
          { id: 'fear', text: 'What is the honest fear that keeps you where you are?' }
        ]
      }
    ]
  };
})(typeof window !== 'undefined' ? window : globalThis);
