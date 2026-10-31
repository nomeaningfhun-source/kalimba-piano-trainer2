#!/usr/bin/env node
// Batch-converts MIDI / karaoke files into beginner kalimba songs for the free catalog, using the
// same converter as the app (the @@PARSER and @@MIDI blocks of js/core.js).
//
//   node tools/midi2song.js [--tuning Bb4|B4] [--out dir] file1.mid file2.kar ...
//
// Writes <out>/songs.json (title, report, 3-line text per file) and <out>/attribution.csv, a sheet to
// fill in before a song goes into FREE_SONGS: composer, year of death, source URL and licence.
// Only public-domain melodies belong in the catalog; keep the melody, not the file's arrangement.
const fs = require('fs'), path = require('path'), vm = require('vm');

const args = process.argv.slice(2);
let tuning = 'Bb4', outDir = 'midi-out';
const files = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--tuning') tuning = args[++i];
  else if (args[i] === '--out') outDir = args[++i];
  else files.push(args[i]);
}
if (!files.length) { console.error('usage: node tools/midi2song.js [--tuning Bb4|B4] [--out dir] files...'); process.exit(1); }

const js = fs.readFileSync(path.join(__dirname, '..', 'js', 'core.js'), 'utf8');
const block = name => js.match(new RegExp('/\\* @@' + name + '-START.*?\\*/([\\s\\S]*?)/\\* @@' + name + '-END \\*/'))[1];
const ctx = { TextDecoder };
vm.createContext(ctx);
vm.runInContext(block('PARSER') + block('MIDI') + '\nthis.K = { midiToSong, songToText, parseSong, summarize };', ctx);
const K = ctx.K;

fs.mkdirSync(outDir, { recursive: true });
const songs = [], rows = [['file', 'title', 'notes', 'shift', 'snapped', 'level', 'composer', 'composer_died', 'source_url', 'license', 'checked_by']];
const csv = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
files.forEach(f => {
  try {
    const r = K.midiToSong(fs.readFileSync(f), { tuning });
    const title = r.karTitle || path.basename(f).replace(/\.(mid|midi|kar|rmi)$/i, '').replace(/_+/g, ' ');
    r.song.title = title;
    const errors = K.summarize(K.parseSong(r.song, tuning)).errors;
    songs.push({ file: path.basename(f), title, report: r.report, voices: r.voices, errors, text: K.songToText(r.song) });
    rows.push([path.basename(f), title, r.report.notes, r.report.shift, r.report.snapped, r.report.level, '', '', '', '', '']);
    console.log('ok   ' + path.basename(f) + ' → "' + title + '" ' + r.report.notes + ' notes, shift ' + r.report.shift +
      ', snapped ' + r.report.snapped + ', ' + '★'.repeat(r.report.level) + (errors ? ', ' + errors + ' errors' : ''));
  } catch (e) {
    console.log('FAIL ' + path.basename(f) + ': ' + e.message);
  }
});
fs.writeFileSync(path.join(outDir, 'songs.json'), JSON.stringify(songs, null, 2));
fs.writeFileSync(path.join(outDir, 'attribution.csv'), '\ufeff' + rows.map(r => r.map(csv).join(',')).join('\n') + '\n');
console.log(songs.length + '/' + files.length + ' converted → ' + path.join(outDir, 'songs.json') + ', attribution.csv');
