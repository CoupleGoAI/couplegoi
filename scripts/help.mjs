#!/usr/bin/env node

const sections = [
  {
    title: 'Development (local Supabase)',
    rows: [
      ['npm run dev',              'Start Expo against local Supabase (auto-starts it)'],
      ['npm run android',          'Same as dev, opens Android emulator'],
      ['npm run ios',              'Same as dev, opens iOS simulator'],
    ],
  },
  {
    title: 'Production (remote Supabase)',
    rows: [
      ['npm run prod',             'Start Expo against production (loads .env)'],
      ['npm run prod:clear',       'Same as prod, clears Metro cache'],
      ['npm run prod:groq',        'Set AI_PROVIDER=groq on remote, then start prod'],
      ['npm run prod:claude',      'Set AI_PROVIDER=claude on remote, then start prod'],
    ],
  },
  {
    title: 'Quality',
    rows: [
      ['npm run lint',             'ESLint'],
      ['npm run type-check',       'tsc --noEmit'],
      ['npm test',                 'Jest'],
      ['npm run release:android:build', 'Build signed Android release APK'],
      ['npm run release:android:local', 'Build signed Android release APK and install to USB device'],
      ['npm run ios:release:debug -- --team-id TEAM_ID', 'Build local iOS Release config on connected iPhone without clean prebuild'],
      ['npm run release:ios:native -- --team-id TEAM_ID', 'Clean prebuild and install local native iOS Release on connected iPhone'],
    ],
  },
  {
    title: 'Web',
    rows: [
      ['npm run web',              'Expo web dev server'],
      ['npm run build:web',        'Static web export to dist/'],
    ],
  },
  {
    title: 'Env helpers',
    rows: [
      ['npm run env:use:prod',    'Copy .env → .env.local (used by prod scripts)'],
      ['export APPLE_TEAM_ID=TEAM_ID', 'Optional default for local iOS release signing'],
    ],
  },
];

const pad = (s, n) => s + ' '.repeat(Math.max(0, n - s.length));
const keyWidth = Math.max(
  ...sections.flatMap((s) => s.rows.map(([k]) => k.length)),
) + 2;

console.log('\nCoupleGoAI — npm command reference\n');
for (const { title, rows } of sections) {
  console.log(`  ${title}`);
  for (const [key, desc] of rows) {
    console.log(`    ${pad(key, keyWidth)} ${desc}`);
  }
  console.log('');
}
