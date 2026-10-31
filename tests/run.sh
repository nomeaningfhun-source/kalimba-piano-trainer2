#!/bin/sh
# Extracts the pure parser, MIDI and pitch sections from index.html and runs the unit tests.
cd "$(dirname "$0")" && python3 - <<'PY'
import re
js=open('../index.html',encoding='utf8').read().split('<script>')[1].split('</script>')[0]
parser=re.search(r'/\* @@PARSER-START.*?\*/(.*?)/\* @@PARSER-END \*/',js,re.S).group(1)
midi=re.search(r'/\* @@MIDI-START.*?\*/(.*?)/\* @@MIDI-END \*/',js,re.S).group(1)
pitch=re.search(r'/\* @@PITCH-START.*?\*/(.*?)/\* @@PITCH-END \*/',js,re.S).group(1)
open('parser.js','w',encoding='utf8').write(parser+midi+pitch+"\nmodule.exports={describe,noteLabel,numeralLabel,checkNote,parseNoteToken,parseMelody,parseChordToken,parseMeasure,parseSong,summarize,suggestShift,importText,songToText,shiftMelodyStr,isMelodyLine,SAMPLE1,SAMPLE2,SAMPLE_YOURS,keySet,expandLyrics,alignByColumn,slashToBar,parseMidi,midiLyrics,midiVoices,midiToSong,notesToSong,refitSong,FREE_SONGS,freeSongText,freeSong,midiTok,makeLowpass,MIC_LOWPASS_HZ,toneAmp,centsNear,rmsOf,makeKeyListener,midiHz,MIC_WINDOW};\n")
PY
node parser.test.js | tail -1 && node midi.test.js | tail -1 && node pitch.test.js
