// ══════════════════════════════════════════
// LETTERCUT — data/mockdata.js
// All mock data. Replace with Firebase calls
// when connecting a real backend.
// ══════════════════════════════════════════

const COLLECT_RADIUS_M = 20; // metres — how close user must be to collect
const VIENNA = [48.2082, 16.3738]; // default map center

// Pre-loaded photos for the 12 seed letters (Unsplash, free to use)
const PRELOADED_PHOTOS = {
  1:  'https://images.unsplash.com/photo-1555685812-4b943f1cb0eb?w=600&q=80',
  2:  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
  3:  'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&q=80',
  4:  'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=600&q=80',
  5:  'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=600&q=80',
  6:  'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=600&q=80',
  7:  'https://images.unsplash.com/photo-1467226632440-65f0b4957563?w=600&q=80',
  8:  'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=600&q=80',
  9:  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=80',
  10: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&q=80',
  11: 'https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=600&q=80',
  12: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&q=80',
};

// Letter pins are loaded live from Firestore via js/app.js
const LETTERS = [];

// Letters added by the user during this session
let userLetters = [];

// Reports created by users during the session
let REPORTS = [];

// Leaderboard data
const LB = {
  weekly: [
    { name:'Eryn Hudson',     pts:312, words:['RING','STAR'], rank:1 },
    { name:'Clyde Bowman',    pts:287, words:['DOME','ARCH'], rank:2 },
    { name:'Damian Brown',    pts:241, words:['TRAM','SIGN'], rank:3 },
    { name:'Krystal Simpson', pts:142, words:['WIEN','ROAD'], rank:4, me:true },
    { name:'Pedro Burgess',   pts:118, words:['FONT'],        rank:5 },
    { name:'Kye Nguyen',      pts:95,  words:['MAP'],         rank:6 },
  ],
  alltime: [
    { name:'Rudy Mcmahon',    pts:2140, words:['RING','ART'],  rank:1 },
    { name:'Aleena Lozano',   pts:1890, words:['DOME','ARCH'], rank:2 },
    { name:'Zachary Bowers',  pts:1530, words:['TRAM'],        rank:3 },
    { name:'Eliot Clay',      pts:880,  words:['FONT','MAP'],  rank:4 },
    { name:'Krystal Simpson', pts:142,  words:['WIEN'],        rank:5, me:true },
  ],
  nearby: [
    { name:'Damian Brown',    pts:241, words:['SIGN'],  rank:1 },
    { name:'Krystal Simpson', pts:142, words:['WIEN'],  rank:2, me:true },
    { name:'Kye Nguyen',      pts:95,  words:['MAP'],   rank:3 },
  ],
};

// Populated with real Firebase Auth data by js/app.js
const CURRENT_USER = {
  name:     '',
  handle:   '',
  avatar:   '?',
  city:     'Vienna',
  rank:     '—',
  pts:      0,
  letters:  0,
  walks:    0,
  words:    [],
  journeys: [],
};
