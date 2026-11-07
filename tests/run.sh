#!/bin/sh
# Extracts the pure parser, MIDI and pitch sections from js/core.js and runs the unit tests (plus js/sheetread.js).
cd "$(dirname "$0")" && python3 - <<'PY'
import re
js=open('../js/core.js',encoding='utf8').read()
parser=re.search(r'/\* @@PARSER-START.*?\*/(.*?)/\* @@PARSER-END \*/',js,re.S).group(1)
midi=re.search(r'/\* @@MIDI-START.*?\*/(.*?)/\* @@MIDI-END \*/',js,re.S).group(1)
pitch=re.search(r'/\* @@PITCH-START.*?\*/(.*?)/\* @@PITCH-END \*/',js,re.S).group(1)
open('parser.js','w',encoding='utf8').write(parser+midi+pitch+"\nmodule.exports={describe,noteLabel,numeralLabel,checkNote,parseNoteToken,parseMelody,parseChordToken,parseMeasure,parseSong,summarize,suggestShift,importText,songToText,shiftMelodyStr,melRhythm,transposeSong,transposeMelody,transposeChords,isMelodyLine,SAMPLE1,SAMPLE2,keySet,expandLyrics,thaiSyllables,splitSyllables,lyricsByGroups,alignByColumn,slashToBar,parseMidi,midiLyrics,midiVoices,midiToSong,notesToSong,refitSong,FREE_SONGS,freeSongText,freeSong,midiTok,makeLowpass,MIC_LOWPASS_HZ,toneAmp,centsNear,centsAround,rmsOf,makeKeyListener,midiHz,MIC_WINDOW};\n")
PY
node parser.test.js | grep -v '^ok' && node sheetread.test.js | grep -v '^ok' && node midi.test.js | grep -v '^ok' && node pitch.test.js
