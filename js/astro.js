/* Astrology lens for the Compass app.
 * Computes tropical sun sign, an approximate moon sign, and the rising sign (ascendant)
 * from birth date, time, place and UTC offset. The maths follows the low-precision
 * algorithms in Meeus, "Astronomical Algorithms". Accuracy is a degree or two, which is
 * enough for sign placement except right at a boundary, and the app says so when that happens.
 * Everything here is presented to the user as a reflection lens, never as evidence.
 */
(function (global) {
  'use strict';

  var SIGNS = [
    { name: 'Aries', symbol: '♈', element: 'Fire', modality: 'Cardinal', ruler: 'Mars' },
    { name: 'Taurus', symbol: '♉', element: 'Earth', modality: 'Fixed', ruler: 'Venus' },
    { name: 'Gemini', symbol: '♊', element: 'Air', modality: 'Mutable', ruler: 'Mercury' },
    { name: 'Cancer', symbol: '♋', element: 'Water', modality: 'Cardinal', ruler: 'Moon' },
    { name: 'Leo', symbol: '♌', element: 'Fire', modality: 'Fixed', ruler: 'Sun' },
    { name: 'Virgo', symbol: '♍', element: 'Earth', modality: 'Mutable', ruler: 'Mercury' },
    { name: 'Libra', symbol: '♎', element: 'Air', modality: 'Cardinal', ruler: 'Venus' },
    { name: 'Scorpio', symbol: '♏', element: 'Water', modality: 'Fixed', ruler: 'Pluto' },
    { name: 'Sagittarius', symbol: '♐', element: 'Fire', modality: 'Mutable', ruler: 'Jupiter' },
    { name: 'Capricorn', symbol: '♑', element: 'Earth', modality: 'Cardinal', ruler: 'Saturn' },
    { name: 'Aquarius', symbol: '♒', element: 'Air', modality: 'Fixed', ruler: 'Uranus' },
    { name: 'Pisces', symbol: '♓', element: 'Water', modality: 'Mutable', ruler: 'Neptune' }
  ];

  /* Reflection text. Written as questions and tendencies, not verdicts. */
  var SUN_TEXT = {
    Aries: { theme: 'starting things', strengths: 'You tend to move first and think on your feet. Fresh starts give you energy.', watch: 'Boredom once the novelty wears off, and impatience with slow processes.', asks: 'Which of your options gives you a genuine fresh start rather than a rebrand of the same routine?' },
    Taurus: { theme: 'building steadily', strengths: 'You value what is tangible: a good product, a fair wage, a calm workspace. You finish what you start.', watch: 'Staying too long in something comfortable that stopped fitting a while ago.', asks: 'What would you build if you knew it would take five years and that was fine?' },
    Gemini: { theme: 'connecting ideas and people', strengths: 'Curiosity, quick learning and an easy way with words. You are good in roles that mix things up.', watch: 'Spreading yourself across too many half-finished interests.', asks: 'Which two of your interests could you combine into one direction?' },
    Cancer: { theme: 'caring and protecting', strengths: 'You read a room well and look after people without being asked. Home and belonging matter to you.', watch: 'Putting everyone else’s needs ahead of your own change.', asks: 'What would you choose if the people you look after were guaranteed to be fine?' },
    Leo: { theme: 'creating and leading with warmth', strengths: 'Confidence, generosity and a natural stage presence. You lift the mood of a team.', watch: 'Needing recognition that a quiet role will never give you.', asks: 'Where could your work be seen and appreciated, not hidden in a back office?' },
    Virgo: { theme: 'improving and serving', strengths: 'Attention to detail, practical helpfulness and high standards. You notice what others miss.', watch: 'Self-criticism, and waiting until something is perfect before you start.', asks: 'What would you try this month if being 70% ready was enough?' },
    Libra: { theme: 'balance and relationships', strengths: 'Diplomacy, taste and a strong sense of fairness. You make working together pleasant.', watch: 'Deciding by committee and losing your own preference in the process.', asks: 'If nobody else had a view, which direction would you pick?' },
    Scorpio: { theme: 'depth and transformation', strengths: 'Focus, loyalty and the stomach for hard truths. You are drawn to work that matters.', watch: 'All-or-nothing thinking about a change that could be gradual.', asks: 'What is the small, reversible version of the big change you are imagining?' },
    Sagittarius: { theme: 'exploring and teaching', strengths: 'Optimism, a wide horizon and a love of learning. You explain things well.', watch: 'Restlessness, and promising more than a diary can hold.', asks: 'Which direction keeps a door open to travel, study or teaching?' },
    Capricorn: { theme: 'ambition and structure', strengths: 'Discipline, patience and a long view. You are trusted with responsibility.', watch: 'Measuring yourself by status and forgetting to ask whether you enjoy it.', asks: 'What would a successful five years look like if status was not part of the score?' },
    Aquarius: { theme: 'ideas and community', strengths: 'Independent thinking, a feel for the future and a wish to improve things for everyone.', watch: 'Detaching from the practical steps that turn an idea into a job.', asks: 'Which of your ideas could you test with real people in the next fortnight?' },
    Pisces: { theme: 'imagination and compassion', strengths: 'Empathy, creativity and intuition. You sense what people need before they say it.', watch: 'Drifting when there is no structure, and absorbing other people’s stress.', asks: 'What structure would let your creativity and care do their best work?' }
  };

  var MOON_TEXT = {
    Aries: 'Emotionally you need action and autonomy. A slow or micromanaged workplace will wear you down faster than a hard one.',
    Taurus: 'Emotionally you need security and comfort: predictable income, a pleasant environment, time to settle.',
    Gemini: 'Emotionally you need variety and conversation. Isolation and repetition drain you.',
    Cancer: 'Emotionally you need to feel you belong and that your care is welcome. A cold culture will hurt more than a low salary.',
    Leo: 'Emotionally you need to be appreciated and to have room to shine. Being invisible is the real risk.',
    Virgo: 'Emotionally you need to feel useful and competent. Clear standards and honest feedback settle you.',
    Libra: 'Emotionally you need harmony and partnership. Constant conflict is not something you should have to put up with.',
    Scorpio: 'Emotionally you need trust and depth. Surface-level roles and office politics are exhausting for you.',
    Sagittarius: 'Emotionally you need freedom and meaning. A job that feels pointless is harder for you than one that is difficult.',
    Capricorn: 'Emotionally you need to feel you are progressing. Aimless work with no ladder makes you low.',
    Aquarius: 'Emotionally you need space to be yourself and a cause to care about.',
    Pisces: 'Emotionally you need gentleness and a sense that the work does some good. Harsh, transactional cultures are not for you.'
  };

  var RISING_TEXT = {
    Aries: 'You come across as direct and energetic. People hand you the urgent things.',
    Taurus: 'You come across as calm and dependable. People trust you with the steady things.',
    Gemini: 'You come across as bright and talkative. People ask you to explain and connect.',
    Cancer: 'You come across as warm and protective. People bring you their worries.',
    Leo: 'You come across as confident and generous. People look to you to set the tone.',
    Virgo: 'You come across as careful and helpful. People rely on you to get it right.',
    Libra: 'You come across as gracious and fair. People ask you to smooth things over.',
    Scorpio: 'You come across as intense and private. People sense you take things seriously.',
    Sagittarius: 'You come across as open and enthusiastic. People ask you where to go next.',
    Capricorn: 'You come across as capable and reserved. People assume you are in charge.',
    Aquarius: 'You come across as original and friendly. People expect a fresh angle from you.',
    Pisces: 'You come across as gentle and receptive. People feel safe around you.'
  };

  var ELEMENT_TEXT = {
    Fire: 'Fire-heavy charts are read as wanting momentum, visibility and a sense of purpose.',
    Earth: 'Earth-heavy charts are read as wanting tangible results, security and a practical craft.',
    Air: 'Air-heavy charts are read as wanting ideas, people and communication in the work.',
    Water: 'Water-heavy charts are read as wanting emotional meaning, care and trusted relationships.'
  };

  var CHINESE = ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'];

  function rad(d) { return d * Math.PI / 180; }
  function deg(r) { return r * 180 / Math.PI; }
  function norm360(x) { x = x % 360; return x < 0 ? x + 360 : x; }

  /* Julian Day for a UTC calendar date/time (Meeus ch. 7). */
  function julianDay(y, m, d, hourUTC) {
    if (m <= 2) { y -= 1; m += 12; }
    var A = Math.floor(y / 100);
    var B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + hourUTC / 24 + B - 1524.5;
  }

  /* Sun's apparent longitude (Meeus ch. 25, low precision). */
  function sunLongitude(jd) {
    var T = (jd - 2451545.0) / 36525;
    var L0 = norm360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
    var M = norm360(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
    var C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(rad(M))
      + (0.019993 - 0.000101 * T) * Math.sin(rad(2 * M))
      + 0.000289 * Math.sin(rad(3 * M));
    var trueLong = L0 + C;
    var omega = 125.04 - 1934.136 * T;
    return norm360(trueLong - 0.00569 - 0.00478 * Math.sin(rad(omega)));
  }

  /* Moon's geocentric longitude (Meeus ch. 47, truncated series; error under ~0.5 degree). */
  function moonLongitude(jd) {
    var T = (jd - 2451545.0) / 36525;
    var Lp = norm360(218.3164477 + 481267.88123421 * T - 0.0015786 * T * T);
    var D = norm360(297.8501921 + 445267.1114034 * T - 0.0018819 * T * T);
    var M = norm360(357.5291092 + 35999.0502909 * T - 0.0001536 * T * T);
    var Mp = norm360(134.9633964 + 477198.8675055 * T + 0.0087414 * T * T);
    var F = norm360(93.2720950 + 483202.0175233 * T - 0.0036539 * T * T);
    var E = 1 - 0.002516 * T - 0.0000074 * T * T;
    var terms = [
      [0, 0, 1, 0, 6288774], [2, 0, -1, 0, 1274027], [2, 0, 0, 0, 658314], [0, 0, 2, 0, 213618],
      [0, 1, 0, 0, -185116], [0, 0, 0, 2, -114332], [2, 0, -2, 0, 58793], [2, -1, -1, 0, 57066],
      [2, 0, 1, 0, 53322], [2, -1, 0, 0, 45758], [0, 1, -1, 0, -40923], [1, 0, 0, 0, -34720],
      [0, 1, 1, 0, -30383], [2, 0, 0, -2, 15327], [0, 0, 1, 2, -12528], [0, 0, 1, -2, 10980],
      [4, 0, -1, 0, 10675], [0, 0, 3, 0, 10034], [4, 0, -2, 0, 8548], [2, 1, -1, 0, -7888],
      [2, 1, 0, 0, -6766], [1, 0, -1, 0, -5163], [1, 1, 0, 0, 4987], [2, -1, 1, 0, 4036],
      [2, 0, 2, 0, 3994], [4, 0, 0, 0, 3861], [2, 0, -3, 0, 3665], [0, 1, -2, 0, -2689],
      [2, 0, -1, 2, -2602], [2, -1, -2, 0, 2390], [1, 0, 1, 0, -2348], [2, -2, 0, 0, 2236]
    ];
    var sum = 0;
    for (var i = 0; i < terms.length; i++) {
      var t = terms[i];
      var arg = rad(t[0] * D + t[1] * M + t[2] * Mp + t[3] * F);
      var coef = t[4];
      if (Math.abs(t[1]) === 1) coef *= E;
      if (Math.abs(t[1]) === 2) coef *= E * E;
      sum += coef * Math.sin(arg);
    }
    var A1 = norm360(119.75 + 131.849 * T);
    var A2 = norm360(53.09 + 479264.290 * T);
    sum += 3958 * Math.sin(rad(A1)) + 1962 * Math.sin(rad(Lp - F)) + 318 * Math.sin(rad(A2));
    return norm360(Lp + sum / 1000000);
  }

  /* Greenwich mean sidereal time in degrees (Meeus ch. 12). */
  function gmst(jd) {
    var T = (jd - 2451545.0) / 36525;
    return norm360(280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - T * T * T / 38710000);
  }

  /* Ascendant longitude in degrees for a local sidereal time and geographic latitude. */
  function ascendant(jd, longitudeEast, latitude) {
    var T = (jd - 2451545.0) / 36525;
    var eps = 23.439291 - 0.0130042 * T;
    var ramc = norm360(gmst(jd) + longitudeEast);
    var y = Math.cos(rad(ramc));
    var x = -(Math.sin(rad(ramc)) * Math.cos(rad(eps)) + Math.tan(rad(latitude)) * Math.sin(rad(eps)));
    return norm360(deg(Math.atan2(y, x)));
  }

  function signFromLongitude(lon) {
    var idx = Math.floor(norm360(lon) / 30);
    var within = norm360(lon) - idx * 30;
    return { sign: SIGNS[idx], degree: within, nearBoundary: within < 1.5 || within > 28.5 };
  }

  function chineseAnimal(year, month, day) {
    /* Chinese new year falls late January to mid February; treat January births as previous year
       and February births before the 5th as previous year (a close approximation). */
    var y = year;
    if (month === 1 || (month === 2 && day < 5)) y -= 1;
    return CHINESE[((y - 1900) % 12 + 12) % 12];
  }

  function lifePathNumber(year, month, day) {
    function reduce(n) {
      while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
        n = String(n).split('').reduce(function (a, c) { return a + Number(c); }, 0);
      }
      return n;
    }
    return reduce(reduce(year) + reduce(month) + reduce(day));
  }

  var LIFE_PATH_TEXT = {
    1: 'Independence and initiative. Numerology reads a 1 as someone who does best leading their own thing.',
    2: 'Partnership and diplomacy. A 2 is read as thriving in supportive, collaborative roles.',
    3: 'Expression and creativity. A 3 is read as needing an outlet for words, art or performance.',
    4: 'Structure and craft. A 4 is read as the builder who likes systems that work.',
    5: 'Freedom and change. A 5 is read as needing variety and movement.',
    6: 'Care and responsibility. A 6 is read as the natural nurturer, teacher or host.',
    7: 'Analysis and depth. A 7 is read as the researcher or specialist.',
    8: 'Ambition and management. An 8 is read as at home with money, scale and authority.',
    9: 'Service and the bigger picture. A 9 is read as drawn to humanitarian or creative causes.',
    11: 'Intuition and inspiration. An 11 is read as a sensitive guide or teacher.',
    22: 'The master builder. A 22 is read as someone who can turn big visions into real institutions.',
    33: 'The master teacher. A 33 is read as devoted to lifting others.'
  };

  /* Main entry. birth = { year, month, day, hour, minute, utcOffset, lat, lon, timeKnown } */
  function compute(birth) {
    var result = { available: false };
    if (!birth || !birth.year || !birth.month || !birth.day) return result;
    var hourLocal = (birth.timeKnown && typeof birth.hour === 'number') ? birth.hour + (birth.minute || 0) / 60 : 12;
    var offset = typeof birth.utcOffset === 'number' ? birth.utcOffset : 0;
    var hourUTC = hourLocal - offset;
    var jd = julianDay(birth.year, birth.month, birth.day, hourUTC);

    var sun = signFromLongitude(sunLongitude(jd));
    var moon = signFromLongitude(moonLongitude(jd));
    result.available = true;
    result.sun = { sign: sun.sign, degree: sun.degree, nearBoundary: sun.nearBoundary, text: SUN_TEXT[sun.sign.name] };
    result.moon = {
      sign: moon.sign, degree: moon.degree, nearBoundary: moon.nearBoundary,
      text: MOON_TEXT[moon.sign.name],
      uncertain: !birth.timeKnown /* the Moon moves ~13 degrees a day, so a missing time can matter */
    };
    if (birth.timeKnown && typeof birth.lat === 'number' && typeof birth.lon === 'number') {
      var asc = signFromLongitude(ascendant(jd, birth.lon, birth.lat));
      result.rising = { sign: asc.sign, degree: asc.degree, nearBoundary: asc.nearBoundary, text: RISING_TEXT[asc.sign.name] };
    }
    var elements = {};
    [result.sun, result.moon, result.rising].forEach(function (p) {
      if (!p) return;
      elements[p.sign.element] = (elements[p.sign.element] || 0) + 1;
    });
    var dominant = Object.keys(elements).sort(function (a, b) { return elements[b] - elements[a]; })[0];
    result.elements = elements;
    result.dominantElement = dominant;
    result.dominantElementText = ELEMENT_TEXT[dominant];
    result.chinese = chineseAnimal(birth.year, birth.month, birth.day);
    var lp = lifePathNumber(birth.year, birth.month, birth.day);
    result.lifePath = { number: lp, text: LIFE_PATH_TEXT[lp] };
    result.jd = jd;
    return result;
  }

  /* Tendencies the astrology lens suggests, expressed in the same vocabulary as the survey so the
     app can show where the two agree or disagree. Values range -1..1. */
  var SIGN_TENDENCY = {
    Aries: { E: 0.6, O: 0.3, C: -0.1, A: -0.3, N: -0.2, R: 0.4, E_riasec: 0.6 },
    Taurus: { E: -0.2, O: -0.2, C: 0.5, A: 0.2, N: -0.3, R: 0.5, C_riasec: 0.4 },
    Gemini: { E: 0.5, O: 0.6, C: -0.3, A: 0.1, N: 0.1, A_riasec: 0.4, S: 0.3 },
    Cancer: { E: -0.2, O: 0.1, C: 0.2, A: 0.6, N: 0.4, S: 0.6 },
    Leo: { E: 0.7, O: 0.3, C: 0.2, A: 0.2, N: -0.2, A_riasec: 0.4, E_riasec: 0.5 },
    Virgo: { E: -0.2, O: 0.1, C: 0.7, A: 0.3, N: 0.3, I: 0.4, C_riasec: 0.5 },
    Libra: { E: 0.3, O: 0.3, C: 0.1, A: 0.6, N: 0.1, A_riasec: 0.5, S: 0.4 },
    Scorpio: { E: -0.2, O: 0.2, C: 0.4, A: -0.1, N: 0.3, I: 0.5 },
    Sagittarius: { E: 0.5, O: 0.6, C: -0.2, A: 0.2, N: -0.3, S: 0.3, E_riasec: 0.3 },
    Capricorn: { E: -0.1, O: -0.1, C: 0.7, A: 0.0, N: -0.1, E_riasec: 0.5, C_riasec: 0.5 },
    Aquarius: { E: 0.2, O: 0.7, C: 0.0, A: 0.2, N: -0.1, I: 0.5, A_riasec: 0.3 },
    Pisces: { E: -0.3, O: 0.5, C: -0.3, A: 0.6, N: 0.4, A_riasec: 0.6, S: 0.5 }
  };

  function tendencies(astro) {
    if (!astro || !astro.available) return null;
    var out = { O: 0, C: 0, E: 0, A: 0, N: 0, riasec: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 } };
    var placements = [[astro.sun, 0.5], [astro.moon, 0.3], [astro.rising, 0.2]];
    placements.forEach(function (p) {
      if (!p[0]) return;
      var t = SIGN_TENDENCY[p[0].sign.name];
      var w = p[1];
      ['O', 'C', 'E', 'A', 'N'].forEach(function (k) { out[k] += (t[k] || 0) * w; });
      out.riasec.R += (t.R || 0) * w;
      out.riasec.I += (t.I || 0) * w;
      out.riasec.A += (t.A_riasec || 0) * w;
      out.riasec.S += (t.S || 0) * w;
      out.riasec.E += (t.E_riasec || 0) * w;
      out.riasec.C += (t.C_riasec || 0) * w;
    });
    return out;
  }

  global.Astro = {
    SIGNS: SIGNS,
    compute: compute,
    tendencies: tendencies,
    julianDay: julianDay,
    sunLongitude: sunLongitude,
    moonLongitude: moonLongitude,
    ascendant: ascendant,
    signFromLongitude: signFromLongitude
  };
})(typeof window !== 'undefined' ? window : globalThis);
