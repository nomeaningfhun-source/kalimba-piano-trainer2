#!/bin/sh
# Extracts the pure parser section from index.html and runs the unit tests.
cd "$(dirname "$0")" && python3 - <<'PY'
import re
js=open('../index.html',encoding='utf8').read().split('<script>')[1].split('</script>')[0]
m=re.search(r'/\* @@PARSER-START.*?\*/(.*?)/\* @@PARSER-END \*/',js,re.S)
open('parser.js','w',encoding='utf8').write(m.group(1)+"\nmodule.exports={describe,noteLabel,numeralLabel,checkNote,parseNoteToken,parseMelody,parseChordToken,parseMeasure,parseSong,summarize,suggestShift,importText,songToText,shiftMelodyStr,isMelodyLine,SAMPLE1,SAMPLE2,SAMPLE_YOURS,keySet,expandLyrics,alignByColumn,slashToBar};\n")
PY
node parser.test.js
