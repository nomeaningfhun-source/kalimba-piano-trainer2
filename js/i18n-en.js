/* English for the Thai text that is written straight into the page and its dialogs (review page, photo import, MIDI import, install
   guide, toasts, error messages). The text is looked up piece by piece: every Thai piece found in a text node (or a placeholder / label)
   is swapped for its English. A node is changed only when no Thai is left afterwards, so a song title or a lyric the user typed is never
   touched. Switching back to Thai puts the original text back. Lessons, the player and the settings use t()/L() in i18n.js instead. */
const EN_PAIRS = [
[
"เลือกรูปแผ่นโน้ตตัวเลข (เลือกหลายหน้าพร้อมกันได้) แอปอ่านเลขโน้ต คอร์ดสีแดง และเนื้อร้องให้ในเครื่อง ไม่ส่งรูปไปไหน · ครั้งแรกต้องต่อเน็ตเพื่อโหลดตัวอ่านรูป ~8 MB หลังจากนั้นใช้ออฟไลน์ได้",
"Choose photos of a number-notation sheet (several pages at once is fine). The app reads the note numbers, red chords and lyrics on your device and never uploads the photo · the first time you need internet to load the ~8 MB reader, after that it works offline"
],
[
"ได้โน้ตธรรมดาที่ใกล้ที่สุดที่เครื่องมี · ถ้าเครื่องคุณจูนก้านเป็น ♯/♭ ไว้ ให้แตะตัวแดงแล้วกด \"เครื่องฉันจูน…\" แทน · ผิดกด ↶ ย้อนกลับ",
"You get the nearest plain note your kalimba has · if your kalimba has a tine tuned to ♯/♭, tap the red note and press \"My kalimba tunes tine…\" instead · tap ↶ Undo if wrong"
],
[
"= เล่นบนคาลิมบา 17 คีย์ไม่ได้ หรือตัวอ่านรูปอ่านไม่ออก แตะตัวแดงตัวนั้น แล้วดูกล่องสีแดงในแผงด้านล่าง กดปุ่มสีส้ม",
"= cannot be played on the 17-key kalimba, or the photo reader could not read it. Tap that red note, read the red box in the panel below and press the orange button"
],
[
"📌 เพลงที่นำเข้าใช้ฝึกส่วนตัวในเครื่องคุณเท่านั้น แอปไม่ส่งหรือแชร์ไฟล์ไปที่ใด ผู้ใช้รับผิดชอบไฟล์ที่นำเข้าเอง",
"📌 Imported songs are for your own practice on this device only. The app never sends or shares files anywhere. You are responsible for the files you import."
],
[
"เพลงที่บันทึกไว้อยู่ที่เว็บนี้ ① กดสำรองเพลง ② เปิดเว็บใหม่ แล้วกด \"กู้คืนจากไฟล์\" ③ เพิ่มไอคอนใหม่ลงหน้าโฮม",
"Your saved songs live on this site. ① Press Back up songs ② Open the new site and press \"Restore from file\" ③ Add the new icon to your home screen"
],
[
"แตะก้านเพื่อสลับ: ปกติ → ♯ (สูงขึ้นครึ่งเสียง) → ♭ (ต่ำลงครึ่งเสียง) · เพลงที่มี #4 ให้ตั้งก้าน 4 เป็น ♯4",
"Tap a tine to cycle: normal → ♯ (half step up) → ♭ (half step down) · for songs with #4 set tine 4 to ♯4"
],
[
"เพลงเก็บใน IndexedDB ของเครื่องนี้เท่านั้น ถ้าล้างข้อมูลเบราว์เซอร์เพลงจะหาย แนะนำให้สำรองเป็นครั้งคราว",
"Songs are stored in IndexedDB on this device only. If you clear browser data they are lost, so back up now and then."
],
[
"เพลงใหม่ทุกเดือน · บทเรียนเป็นขั้น · ตรวจโน้ตผ่านไมค์ · แปลงเพลงที่ชอบเป็นโน้ต · ไม่มีโฆษณา",
"New songs every month · step-by-step lessons · note checking through the microphone · turn songs you love into notes · no ads"
],
[
"→ กด \"ใช้ … แทน\" (เล่นโน้ตธรรมดาที่ใกล้สุด) หรือ \"เครื่องฉันจูนก้าน…\" ถ้าก้านนั้นจูนไว้จริง",
"→ press \"Use … instead\" (plays the nearest plain note) or \"My kalimba tunes tine…\" if that tine really is tuned that way"
],
[
"สมาชิกนำเข้าไฟล์ MIDI ได้ไม่จำกัด รุ่นสมาชิกกำลังจะเปิด ลงชื่อไว้ก่อน เราจะแจ้งเมื่อเปิด",
"Members can import unlimited MIDI files. The member plan is opening soon: leave your name and we will tell you when it opens."
],
[
"ฝึกคาลิมบา 17 คีย์ทีละโน้ต ฟังเสียงจริงผ่านไมค์ นำเข้าเพลงจากรูปแผ่นโน้ตได้ ใช้ออฟไลน์",
"Practise a 17-key kalimba note by note, hear it through the microphone, import songs from sheet photos, works offline"
],
[
"แอปแปลงเป็นโน้ตคาลิมบาแบบมือใหม่ให้อัตโนมัติ เก็บในเครื่องคุณเท่านั้น ใช้ออฟไลน์ได้",
"The app turns it into beginner-friendly kalimba notes automatically. Stored only on your device, works offline."
],
[
"ไฟล์ต้องเป็น .mid หรือ .kar (ไม่ใช่ .mp3 หรือรูปภาพ) ลองหาไฟล์อื่นของเพลงเดียวกัน",
"The file must be .mid or .kar (not .mp3 or an image). Try another file of the same song."
],
[
"• เว็บฟรีมักมีปุ่ม \"Download\" ปลอมที่เป็นโฆษณา ให้แตะเฉพาะลิงก์ที่ชื่อไฟล์ลงท้าย",
"• Free sites often have fake \"Download\" buttons that are ads. Only tap links whose file name ends in"
],
[
"เลขติดกัน = ดีดพร้อมกัน เช่น 135 · ใส่ ~ ท้าย = กรีด (135~) · เลขเดียว = เบส",
"Digits together = play together, e.g. 135 · add ~ at the end = strum (135~) · a single digit = bass"
],
[
"บรรทัดคอร์ดไม่มี | และจำนวนไม่ตรง จึงใส่ 1 คอร์ดต่อห้อง — ลองใส่ | กั้นห้อง",
"The chord line has no | and the counts do not match, so 1 chord per bar was used — try adding | between bars"
],
[
"= โน้ตเบส · เว้นช่องว่างให้ตรงใต้โน้ตได้เลย แอปจะจับคู่ตามตำแหน่งคอลัมน์",
"= bass note · line chords up under the notes with spaces, the app matches them by column position"
],
[
"โน้ตไม่มีบนแป้น จึงปรับไปโน้ตที่ใกล้สุด เสียงอาจต่างจากต้นฉบับเล็กน้อย",
"notes are not on the keypad, so they were moved to the nearest note; the sound may differ slightly from the original"
],
[
"วางโน้ตเพลง (เนื้อร้อง / ทำนอง / คอร์ด-เบส เว้นบรรทัดว่างระหว่างท่อน)",
"Paste the song (lyrics / melody / chords-bass, leave a blank line between sections)"
],
[
"เปิดจากหน้าจอโฮมได้เหมือนแอป · ใช้ออฟไลน์ได้ · เพลงที่บันทึกไว้ไม่หาย",
"Open from the home screen like an app · works offline · saved songs are kept"
],
[
"ตอนนี้เปิดอยู่ในแอปโซเชียล ซึ่งติดตั้งไม่ได้ และเพลงที่บันทึกอาจหาย",
"This is open inside a social app, which cannot install apps, and saved songs may be lost"
],
[
"เคล็ดลับ: กดปุ่มเว้นวรรคค้างแล้วลากซ้าย-ขวา เพื่อเลื่อนเคอร์เซอร์",
"Tip: hold the space key and drag left or right to move the cursor"
],
[
"ตอนนี้เปิดอยู่ในแอป LINE ซึ่งติดตั้งไม่ได้ และเพลงที่บันทึกอาจหาย",
"This is open inside the LINE app, which cannot install apps, and saved songs may be lost"
],
[
"ใช้บนมือถือจะสะดวกที่สุด เปิดลิงก์นี้บนมือถือ แล้วกด \"📲 ติดตั้ง\"",
"It works best on a phone. Open this link on your phone and press \"📲 Install\""
],
[
"ระหว่างนี้ยังฝึกเพลงในคลังเพลงฟรี และวางโน้ตตัวเลขเองได้ไม่จำกัด",
"Meanwhile you can still practise the free songs in the library and paste your own number notation without limit"
],
[
"ไม่พบเลขโน้ตในรูป — ลองรูปที่ชัดขึ้น หรือแคปหน้าจอแทนการถ่ายรูป",
"No note numbers found in the photo — try a clearer photo, or take a screenshot instead of a camera photo"
],
[
"แทร็ก แอปเลือกทำนองร้องให้แล้ว ถ้าไม่แน่ใจ กดปุ่มเขียวได้เลย",
"tracks. The app already chose the vocal melody; if unsure, just press the green button"
],
[
"→ กด \"ขึ้น/ลง 1 ออคเทฟ\" ทีละตัว หรือ 🪄 เลื่อนทั้งเพลงด้านบน",
"→ press \"Up/Down 1 octave\" one note at a time, or 🪄 shift the whole song above"
],
[
"• ห้ามโหลดไฟล์ .apk .exe .zip .dmg และไม่ต้องติดตั้งแอปใดๆ",
"• Never download .apk .exe .zip .dmg files, and you do not need to install any app"
],
[
"• ถ้าเด้งไปหน้าอื่นหรือมีป๊อปอัปแปลกๆ ให้ปิดแท็บนั้นทันที",
"• If it jumps to another page or shows strange pop-ups, close that tab right away"
],
[
"หน้า · ตัวที่อ่านไม่ออกเป็น ? ให้แก้ตามรูปต้นฉบับด้านล่าง",
"pages · notes it could not read show as ?; fix them from the original photo below"
],
[
"เลือก \"เปิดในเบราว์เซอร์\" (หรือ \"เปิดใน Safari/Chrome\")",
"Choose \"Open in browser\" (or \"Open in Safari/Chrome\")"
],
[
"→ อ่านไม่ออก ดูรูปต้นฉบับด้านบน แล้วแตะเลข 1–7 ที่ถูก",
"→ could not be read; look at the original photo above, then tap the right number 1–7"
],
[
"บรรทัด ใช้แค่ 3 บรรทัดแรก (เว้นบรรทัดว่างระหว่างท่อน)",
"lines; only the first 3 are used (leave a blank line between sections)"
],
[
"กั้นห้อง (ไม่ใส่ก็ได้ แอปแบ่งตามจำนวนจังหวะต่อห้อง)",
"separates bars (optional; the app splits by beats per bar)"
],
[
"B♭4 ไม่มีบนเครื่อง (จูนก้าน 7 เป็น ♭7 ได้ในตั้งค่า)",
"B♭4 is not on this kalimba (you can tune tine 7 to ♭7 in Settings)"
],
[
"· อย่าลืมจูนก้านจริงตามนี้ (ดูได้ที่หน้าตั้งเสียง)",
"· remember to tune the real tines to match (see the Tuner page)"
],
[
"อยู่ เปิดในเบราว์เซอร์เพื่อติดตั้งและบันทึกเพลงได้",
"— open it in your browser to install and save songs"
],
[
"\" ในคลัง · หาไฟล์ MIDI ของเพลงนี้แล้วนำเข้าเองได้",
"\" is not in the library · find a MIDI file of this song and import it yourself"
],
[
"• ลูกศร ◀ ▶ ที่แถบบนพาไปตัวแดงตัวถัดไป · แก้ผิดกด",
"• The ◀ ▶ arrows in the top bar jump to the next red note · if you slip, press"
],
[
"ไม่พบโน้ตที่แปลงได้ — ตรวจรูปแบบ 3 บรรทัดอีกครั้ง",
"No convertible notes found — check the 3-line format again"
],
[
"ถ้าเขียนติดกัน แอปจะพยายามตัดคำให้ตรงจำนวนโน้ต ·",
"if written together, the app tries to split words to match the number of notes ·"
],
[
"ติดตั้งเป็นแอปบนหน้าจอโฮม เปิดเร็ว ใช้ออฟไลน์ได้",
"Install as an app on your home screen: opens fast, works offline"
],
[
"กด ▶ ฟัง แล้ว 💾 บันทึก เพื่อเก็บไว้ฝึกแบบออฟไลน์",
"Press ▶ Listen, then 💾 Save to keep it for offline practice"
],
[
"ไม่พบบรรทัดทำนอง (ต้องเป็นเลข 1-7) — ข้ามท่อนนี้",
"No melody line found (it must use digits 1-7) — skipping this section"
],
[
"ไฟล์ใหญ่เกินไป ไฟล์ MIDI ปกติมีขนาดไม่กี่สิบ KB",
"File too large. A normal MIDI file is only a few tens of KB"
],
[
"เว้นวรรค (กดค้างแล้วลากเพื่อเลื่อนเคอร์เซอร์)",
"Space (hold and drag to move the cursor)"
],
[
"มีการแก้ไขที่ยังไม่ได้บันทึก ทิ้งการแก้ไขไหม?",
"You have unsaved changes. Discard them?"
],
[
"อ่านคลิปบอร์ดไม่ได้ — กดค้างที่ช่องแล้ววางเอง",
"Can't read the clipboard — long-press the box and paste yourself"
],
[
"✅ เครื่องนี้ปลดล็อกแล้ว นำเข้าไฟล์ได้ไม่จำกัด",
"✅ This device is unlocked: unlimited file imports"
],
[
"ไม่มีคีย์ (จูนก้านเป็นชาร์ป/แฟลตได้ในตั้งค่า)",
"has no key (you can tune a tine to sharp/flat in Settings)"
],
[
"— ลองเลือกรูปใหม่ หรือแคปหน้าจอแทนการถ่ายรูป",
"— try choosing a new photo, or take a screenshot instead of a camera photo"
],
[
"ยังมีโน้ตเกินช่วง/ไม่มีคีย์บนคาลิมบา 17 คีย์",
"There are still notes out of range / without a key on the 17-key kalimba"
],
[
"โน้ตถูกย้ายขึ้นหรือลง 1 ออกเทฟ ให้อยู่บนแป้น",
"notes were moved up or down 1 octave to fit on the keypad"
],
[
"ไม่พบทำนองในไฟล์นี้ (มีแต่กลองหรือไม่มีโน้ต)",
"No melody found in this file (only drums, or no notes)"
],
[
"กด \"เพิ่มเพลง\" เพื่อนำเข้าโน้ตแบบ 3 บรรทัด",
"Press \"Add song\" to import notes in 3-line format"
],
[
"โหลดตัวอ่านรูปไม่ได้ — ครั้งแรกต้องต่อเน็ต",
"Couldn't load the photo reader — the first time needs internet"
],
[
"เข้าเว็บที่ขึ้นมา หาลิงก์ที่ชื่อไฟล์ลงท้าย",
"Open a result site and look for a link whose file name ends in"
],
[
"รูปแคปหน้าจอหรือไฟล์สแกนอ่านได้แม่นที่สุด",
"Screenshots or scanned files are read most accurately"
],
[
"ปลดล็อกแล้ว ✓ นำเข้าไฟล์ MIDI ได้ไม่จำกัด",
"Unlocked ✓ unlimited MIDI imports"
],
[
"กำลังโหลดตัวอ่านรูป (ครั้งแรกราว 8 MB)…",
"Loading the photo reader (about 8 MB the first time)…"
],
[
"ฝึกคาลิมบาฟรี เล่นเพลงแรกได้ใน 5 นาที 🎵",
"Free kalimba practice: play your first song in 5 minutes 🎵"
],
[
"มุมขวาบน แล้วเปิดแอปจากไอคอนบนหน้าจอโฮม",
"in the top right, then open the app from its icon on the home screen"
],
[
"แอปย้ายบ้านแล้ว → playkalimba.pages.dev",
"The app has moved → playkalimba.pages.dev"
],
[
"📂 มีไฟล์ MIDI / คาราโอเกะ (.mid .kar)?",
"📂 Have a MIDI / karaoke file (.mid .kar)?"
],
[
"รหัสสมาชิก (นำเข้าไฟล์ MIDI ไม่จำกัด):",
"Member code (unlimited MIDI import):"
],
[
"โน้ตอยู่ในช่วง 17 คีย์ (C4–E6) ทุกห้อง",
"notes are within the 17 keys (C4–E6) in every bar"
],
[
"ยังไม่มีห้อง — กด \"เพิ่มห้องท้ายเพลง\"",
"No bars yet — press \"Add bar at the end\""
],
[
"ตัดโน้ตซ้อนและโน้ตประดับที่เร็วเกินไป",
"Removed overlapping notes and too-fast ornaments:"
],
[
"⭐ สนใจรุ่นพรีเมียม (แจ้งชื่อไว้ก่อน)",
"⭐ Interested in Premium (leave your name)"
],
[
"✅ ติดตั้งแล้ว เปิดจากหน้าจอโฮมได้เลย",
"✅ Installed — open it from your home screen"
],
[
"ติดตั้งแล้ว 🎉 เปิดจากหน้าจอโฮมได้เลย",
"Installed 🎉 open it from your home screen"
],
[
"ไฟล์นี้ไม่ใช่ไฟล์ MIDI (.mid / .kar)",
"This is not a MIDI file (.mid / .kar)"
],
[
"ไฟล์ MIDI แบบเวลา SMPTE ยังไม่รองรับ",
"MIDI files with SMPTE timing are not supported yet"
],
[
"1 ท่อน = 3 บรรทัด เรียงจากบนลงล่าง:",
"1 section = 3 lines, top to bottom:"
],
[
"ลองฝึกตามจังหวะต่อเพื่อให้คล่องขึ้น",
"Try practising with the rhythm next to get fluent"
],
[
"Chrome ดาวน์โหลดให้ทันที (ถ้าถาม กด",
"Chrome downloads it right away (if it asks, tap"
],
[
"ใส่เนื้อร้องจากไฟล์คาราโอเกะให้แล้ว",
"Added the lyrics from the karaoke file"
],
[
"เช่น Twinkle, Twinkle, Little Star",
"e.g. Twinkle, Twinkle, Little Star"
],
[
"คัดลอกลิงก์แล้ว ส่งให้เพื่อนได้เลย",
"Link copied — send it to a friend"
],
[
"กดปุ่มด้านล่าง แล้วเลือก \"ติดตั้ง\"",
"Press the button below, then choose \"Install\""
],
[
"เสียงยังไม่ตื่น — แตะเล่นอีกครั้ง",
"Audio is not awake yet — tap play again"
],
[
"เบราว์เซอร์นี้ไม่รองรับ IndexedDB",
"This browser does not support IndexedDB"
],
[
"เนื้อร้อง (แยกพยางค์ด้วยช่องว่าง)",
"Lyrics (separate syllables with spaces)"
],
[
") · แตะเลข 1–7 ที่ถูกตามรูปด้านบน",
") · tap the right number 1–7 from the photo above"
],
[
"เรียนทีละขั้น ผ่านแล้วปลดบทถัดไป",
"Learn step by step. Pass a level to unlock the next one."
],
[
"ยืดเสียง · ทุกตัวเลขนับ 1 จังหวะ",
"Hold · every number counts as 1 beat"
],
[
"แก้ทั้งคำ แอปแบ่งพยางค์ให้เองตาม",
"Edit the whole word; the app splits the syllables over"
],
[
"✨ ตัด ♯/♭ ที่ไม่มีคีย์ทั้งเพลง (",
"✨ Cut ♯/♭ that have no key, whole song ("
],
[
"เลื่อนขึ้นครึ่งเสียงทั้งเพลงแล้ว",
"Whole song shifted up a half step"
],
[
"B4 ไม่มีบนเครื่อง (จูน B♭4 อยู่)",
"B4 is not on this kalimba (it is tuned to B♭4)"
],
[
"แล้วกดปุ่ม \"📲 ติดตั้ง\" อีกครั้ง",
"then press \"📲 Install\" again"
],
[
"ครึ่งเสียง ให้ลงคาลิมบา 17 คีย์",
"half steps to fit the 17-key kalimba"
],
[
"ยังไม่มีเพลงที่บันทึกในเครื่อง",
"No songs saved on this device yet"
],
[
"อ่านเสร็จ ✓ ตรวจโน้ตก่อนบันทึก",
"Done reading ✓ check the notes before saving"
],
[
"เลื่อนลงครึ่งเสียงทั้งเพลงแล้ว",
"Whole song shifted down a half step"
],
[
"Safari ถามว่าจะดาวน์โหลดไหม กด",
"Safari asks whether to download; tap"
],
[
"ไม่มีบนเครื่อง (ก้านนี้จูนเป็น",
"is not on this kalimba (this tine is tuned to"
],
[
"ครูฝึกคาลิมบา · Kalimba Coach",
"Kalimba Coach"
],
[
"⚡ โหลดตัวอย่างโน้ตทดสอบทันที:",
"⚡ Load test sample notes instantly:"
],
[
"บรรทัดไหนไม่มีก็ข้ามได้ · ใส่",
"A line you do not have can be skipped · put"
],
[
"เบราว์เซอร์นี้เล่นเสียงไม่ได้",
"This browser cannot play sound"
],
[
"— เลือกรูปที่ขาดไปอีกครั้งได้",
"— you can choose the missing photos again"
],
[
"ต่ำกว่า C4 (เกินช่วง 17 คีย์)",
"is below C4 (out of the 17-key range)"
],
[
"สูงกว่า E6 (เกินช่วง 17 คีย์)",
"is above E6 (out of the 17-key range)"
],
[
"= หนึ่งจังหวะแบ่งเท่าๆ กัน ·",
"= one beat split evenly ·"
],
[
"📲 ติดตั้งเป็นแอปไว้ฝึกทุกวัน",
"📲 Install as an app to practise every day"
],
[
"โน้ต · ว่าง = ไม่มีเนื้อร้อง",
"notes · blank = no lyric"
],
[
"— แยกพยางค์ด้วยช่องว่างหรือ",
"— separate syllables with spaces or"
],
[
"ไว้บนสุดได้ · บรรทัดขึ้นต้น",
"at the very top · lines starting with"
],
[
"🔍 แปลงโน้ต → ไปหน้าตรวจโน้ต",
"🔍 Convert notes → go to the check page"
],
[
"📂 มีไฟล์แล้ว — เลือกไฟล์เลย",
"📂 I have a file — choose it now"
],
[
"(ช่วงเครื่อง 17 คีย์ C4–E6)",
"(the 17-key range C4–E6)"
],
[
"โน้ต · ผิดกด ↶ ย้อนกลับ ได้",
"notes · tap ↶ Undo if wrong"
],
[
"บันทึกไว้ก่อนแล้วแก้ทีหลัง?",
"Save now and fix later?"
],
[
"ในแอป หรือเปิด Safari พิมพ์",
"in the app, or open Safari and type"
],
[
"ในแอป หรือเปิด Chrome พิมพ์",
"in the app, or open Chrome and type"
],
[
"เนื้อร้องมีห้องมากกว่าทำนอง",
"The lyrics have more bars than the melody"
],
[
"แตะคีย์สีทองที่กำลังกะพริบ",
"Tap the blinking gold key"
],
[
"ก้านที่จูนเป็นชาร์ป / แฟลต",
"Tines tuned to sharp / flat"
],
[
"สมาชิก · นำเข้าได้ไม่จำกัด",
"Member · unlimited imports"
],
[
"คอร์ด   C . . . | F . C .",
"Chords   C . . . | F . C ."
],
[
"📖 วิธีโหลดไฟล์ MIDI มาฝึก",
"📖 How to get a MIDI file to practise with"
],
[
"ทุกก้านเป็นเสียงมาตรฐาน C",
"All tines use standard C tuning"
],
[
"(ในแป้นหรือในแผง) ได้เสมอ",
"(in the keypad or in the panel) any time"
],
[
"กดปุ่มด้านล่างเพื่อเปิดใน",
"Press the button below to open in"
],
[
"แปลงจากไฟล์ MIDI: ทำนอง \"",
"Converted from a MIDI file: melody \""
],
[
"ทำนอง  1 1 5 5 | 6 6 5 -",
"Melody  1 1 5 5 | 6 6 5 -"
],
[
"— หรือวางโน้ตตัวเลขเอง —",
"— or paste number notation yourself —"
],
[
"🎯 ฝึกเพลงนี้ตามจังหวะต่อ",
"🎯 Practise this song with the rhythm"
],
[
"อ่านเพลงในเครื่องไม่ได้:",
"Can't read the songs on this device:"
],
[
"คอร์ด / เบส เช่น C . F .",
"Chords / bass e.g. C . F ."
],
[
"· โน้ตเกินช่วง/ไม่มีคีย์",
"· out-of-range / keyless notes:"
],
[
"❓ ตัวแดงคืออะไร แก้ยังไง",
"❓ What are the red notes and how do I fix them?"
],
[
"มี ♯ หรือ ♭ แต่ไม่มีคีย์",
"Has ♯ or ♭ but no key"
],
[
"เพลงที่อยากเล่นบนคาลิมบา",
"Songs I want to play on kalimba"
],
[
"ไฟล์ (Files) → ดาวน์โหลด",
"Files → Downloads"
],
[
"\"-\" ไม่มีโน้ตให้ต่อเสียง",
"\"-\" has no note to hold"
],
[
"🔎 หาไฟล์ MIDI ใน Google",
"🔎 Find a MIDI file on Google"
],
[
"📷 มีรูปแผ่นโน้ตคาลิมบา?",
"📷 Have a photo of a kalimba sheet?"
],
[
"⚠️ ตัวอย่างโน้ตเกินช่วง",
"⚠️ Out-of-range sample"
],
[
"\"หาไฟล์ MIDI ใน Google\"",
"\"Find a MIDI file on Google\""
],
[
"ชื่อเพลง คาราโอเกะ midi",
"song name karaoke midi"
],
[
"คอร์ดมีห้องมากกว่าทำนอง",
"The chords have more bars than the melody"
],
[
"วิธีเขียนโน้ต 3 บรรทัด",
"How to write 3-line notation"
],
[
"ออคเทฟ → เหลือเกินช่วง",
"octaves → still out of range"
],
[
"◂  เลื่อนเคอร์เซอร์  ▸",
"◂  Move cursor  ▸"
],
[
"จุด (จะถูกข้ามตอนเล่น)",
"spots (they will be skipped when playing)"
],
[
"กด ••• หรือ ⋮ ที่มุมจอ",
"Tap ••• or ⋮ in the corner of the screen"
],
[
") ไฟล์จะอยู่ในโฟลเดอร์",
") the file goes to the folder"
],
[
"เนื้อร้องเกินจำนวนโน้ต",
"lyrics exceed the number of notes by"
],
[
"จุดที่ต้องแก้ก่อนหน้า",
"Previous spot to fix"
],
[
"ยืดเสียง · โน้ตติดกัน",
"Hold · notes joined"
],
[
"มีโทเค็นที่อ่านไม่ได้",
"There are unreadable tokens:"
],
[
"บันทึกลงเครื่องแล้ว ✓",
"Saved to this device ✓"
],
[
"\"เพิ่มไปยังหน้าจอโฮม\"",
"\"Add to Home Screen\""
],
[
"\"เพิ่มลงในหน้าจอหลัก\"",
"\"Add to Home screen\""
],
[
"ยังไม่ได้ปลดล็อก (ฟรี",
"Not unlocked (free"
],
[
"🪄 เลื่อนทั้งเพลงเป็น",
"🪄 Shift the whole song by"
],
[
"⬇️ สำรองเพลง (.json)",
"⬇️ Back up songs (.json)"
],
[
"= คอร์ดเดิม · ตัวเลข",
"= same chord · a number"
],
[
"📷 รูปต้นฉบับทั้งหน้า",
"📷 Full original photo"
],
[
"สั่นเบาๆ เมื่อกดปุ่ม",
"Light vibration when keys are pressed"
],
[
"ยังไม่มีเพลงให้สำรอง",
"No songs to back up yet"
],
[
"กำลังเปิดตัวอ่านรูป…",
"Opening the photo reader…"
],
[
"ไม่มีอะไรให้ย้อนกลับ",
"Nothing to undo"
],
[
"ไม่มี ♯/♭ ที่ต้องตัด",
"No ♯/♭ to cut"
],
[
"คัดลอกลิงก์ไปเปิดเอง",
"Copy the link and open it yourself"
],
[
"ได้เลย ใช้ออฟไลน์ได้",
"right away, works offline"
],
[
"⭐ ลงชื่อรอรุ่นสมาชิก",
"⭐ Join the member waitlist"
],
[
"ห้องว่าง (ไม่มีโน้ต)",
"Empty bar (no notes)"
],
[
"ใช้แป้นพิมพ์ iPhone",
"Use the iPhone keyboard"
],
[
"📖 วิธีโหลด + นำเข้า",
"📖 How to download + import"
],
[
"(1 = C4 คีย์กลาง) ·",
"(1 = C4, the middle key) ·"
],
[
"＋ เพิ่มห้องท้ายเพลง",
"＋ Add bar at the end"
],
[
"เล่นเพลงแรกได้แล้ว!",
"You played your first song!"
],
[
"ทำนอง เช่น 1 1 5 5'",
"Melody e.g. 1 1 5 5'"
],
[
"↵ เริ่มบรรทัดใหม่ ✓",
"↵ Start a new line ✓"
],
[
"· 🎤 ตรงกับเนื้อร้อง",
"· 🎤 matches the lyrics"
],
[
"ตัว ให้เล่นง่ายขึ้น",
"notes, to make it easier to play"
],
[
"😕 แปลงไฟล์นี้ไม่ได้",
"😕 Can't convert this file"
],
[
"✅ ใช้ทำนองที่แนะนำ",
"✅ Use the suggested melody"
],
[
"บรรทัดในรูปต้นฉบับ",
"Line from the original photo"
],
[
"จุดที่ต้องแก้ถัดไป",
"Next spot to fix"
],
[
"ครึ่งเสียงทั้งเพลง",
"Half steps, whole song"
],
[
"อ่านตัวนี้ไม่ออก (",
"Can't read this ("
],
[
"ยังไม่มีโน้ตให้ฟัง",
"No notes to play yet"
],
[
"มุมขวาบนของ Chrome",
"in the top right of Chrome"
],
[
"ไฟล์จะไปอยู่ที่แอป",
"the file goes to the app"
],
[
"\"ใช้ทำนองที่แนะนำ\"",
"\"Use the suggested melody\""
],
[
"📋 วางจากคลิปบอร์ด",
"📋 Paste from clipboard"
],
[
"สูง 1 ออคเทฟ เช่น",
"1 octave higher, e.g."
],
[
"↵ เริ่มบรรทัดใหม่",
"↵ Start a new line"
],
[
"เครื่องฉันจูนก้าน",
"My kalimba tunes tine"
],
[
"เปิดในเบราว์เซอร์",
"Open in browser"
],
[
"(ถ้าไม่เห็น ให้กด",
"(if you do not see it, tap"
],
[
"เลื่อนลงแล้วเลือก",
"Scroll down and choose"
],
[
"⬆️ กู้คืนจากไฟล์",
"⬆️ Restore from file"
],
[
"📲 ติดตั้งเป็นแอป",
"📲 Install as an app"
],
[
"📤 ชวนเพื่อนมาลอง",
"📤 Invite a friend to try"
],
[
"คัดลอกโน้ตแล้ว ✓",
"Notes copied ✓"
],
[
"\" ออกจากเครื่อง?",
"\" from this device?"
],
[
"◂ ยืดตัวก่อนหน้า",
"◂ Stretch the previous one"
],
[
"ยังไม่มีห้องโน้ต",
"No bars yet"
],
[
"เพลงจากไฟล์ MIDI",
"Song from a MIDI file"
],
[
"โหมดมืด / สว่าง",
"Dark / light mode"
],
[
"เพิ่มเพลงของฉัน",
"Add my song"
],
[
"อ่านไฟล์ไม่ได้:",
"Can't read the file:"
],
[
"เว้นก่อนบรรทัด:",
"Gap before the line:"
],
[
"ขึ้น 1 ออคเทฟ →",
"Up 1 octave →"
],
[
"เปลี่ยนเป็นโน้ต",
"Change to note"
],
[
"✅ ผ่านการตรวจ —",
"✅ Check passed —"
],
[
"สูง/ต่ำเกินช่วง",
"Too high / too low"
],
[
"เลือกไฟล์ในเว็บ",
"Pick the file on the site"
],
[
"กลับมาที่แอปนี้",
"Back to this app"
],
[
"เปิดเว็บใหม่ ↗",
"Open new site ↗"
],
[
"บทเรียนคาลิมบา",
"Kalimba lessons"
],
[
"ฝึกสุ่มทุกโน้ต",
"Random practice, all notes"
],
[
"ความเร็ว (BPM)",
"Speed (BPM)"
],
[
"ออคเทฟทั้งเพลง",
"Octave, whole song"
],
[
"เปิดรูปไม่ได้:",
"Can't open the photo:"
],
[
"⚠️ มีข้อสังเกต",
"⚠️ Things to check:"
],
[
"บันทึกไว้ก่อน?",
"Save first?"
],
[
"อ่านไฟล์ไม่ได้",
"Can't read the file"
],
[
"โน้ต · ความยาก",
"notes · difficulty"
],
[
"⭐ นำเข้าฟรีครบ",
"⭐ All free imports used:"
],
[
"📖 ดูวิธีหาไฟล์",
"📖 See how to find files"
],
[
"รหัสไม่ถูกต้อง",
"Wrong code"
],
[
"ไม่มีบนคาลิมบา",
"is not on the kalimba"
],
[
"ด ร ม ฟ ซ ล ท",
"Thai (ด ร ม ฟ ซ ล ท)"
],
[
"จังหวะ / ห้อง",
"Beats / bar"
],
[
"▶ ฟังทั้งเพลง",
"▶ Play whole song"
],
[
"⚠️ ระวังให้ดี",
"⚠️ Be careful"
],
[
"เพลงไม่มีชื่อ",
"Untitled song"
],
[
"กำลังอ่านหน้า",
"Reading page"
],
[
"เว้นก่อนห้อง:",
"Gap before bar:"
],
[
"ลง 1 ออคเทฟ →",
"Down 1 octave →"
],
[
"บันทึกไม่ได้:",
"Couldn't save:"
],
[
"· ไม่พลาดเลย!",
"· no mistakes!"
],
[
"ชื่อเพลง midi",
"song name midi"
],
[
"→ แตะไฟล์เพลง",
"→ tap the song file"
],
[
"จังหวะ (กำหนด",
"beats (set to"
],
[
"📖 วิธีหาไฟล์",
"📖 How to find files"
],
[
"เลื่อนออคเทฟ",
"Octave shift"
],
[
"= พยางค์ว่าง",
"= empty syllable"
],
[
"ชาร์ป/แฟลต ·",
"sharp/flat ·"
],
[
"🎵 เลือกทำนอง",
"🎵 Choose the melody"
],
[
"✓ อยู่ในช่วง",
"✓ In range"
],
[
"คัดลอกไม่ได้",
"Couldn't copy"
],
[
"ไม่พบเลขโน้ต",
"No note numbers found"
],
[
"ยังไม่มีโน้ต",
"No notes yet"
],
[
"มี ? ต่อท้าย",
"Ends with ?"
],
[
"ย้อนกลับแล้ว",
"Undone"
],
[
"ตัด ♯/♭ แล้ว",
"Cut ♯/♭ from"
],
[
"\"ติดตั้งแอป\"",
"\"Install app\""
],
[
"➕ เพิ่ม/คลัง",
"➕ Add/Library"
],
[
"\"ไฟล์ล่าสุด\"",
"\"Recents\""
],
[
"⬇️ สำรองเพลง",
"⬇️ Back up songs"
],
[
"พยางค์ แต่มี",
"syllables but there are"
],
[
"🙋 ขอเพลงนี้",
"🙋 Request this song"
],
[
"📂 เลือกไฟล์",
"📂 Choose file"
],
[
"คอร์ด / เบส",
"Chord / bass"
],
[
"— ชื่อคอร์ด",
"— chord names"
],
[
"@title ชื่อ",
"@title name"
],
[
"คือหมายเหตุ",
"are comments"
],
[
"จังหวะ/ห้อง",
"Beats/bar"
],
[
"อ่านไม่ได้:",
"couldn't read:"
],
[
"(ไม่มีคีย์)",
"(no key)"
],
[
"คัดลอกลิงก์",
"Copy link"
],
[
"(เพลงไทยลอง",
"(for Thai songs try"
],
[
"\"ดาวน์โหลด\"",
"\"Download\""
],
[
"➕ เพิ่มเพลง",
"➕ Add song"
],
[
"อ่านคอร์ด \"",
"Can't read chord \""
],
[
"← คลังเพลง",
"← Library"
],
[
"📷 เลือกรูป",
"📷 Choose photos"
],
[
"🔍 ตรวจโน้ต",
"🔍 Check notes"
],
[
"อ่านจากรูป",
"Read from"
],
[
"ต่อเสียง ▸",
"Hold ▸"
],
[
"＋ เพิ่มซ้ำ",
"＋ Duplicate"
],
[
"↶ ย้อนกลับ",
"↶ Undo"
],
[
"⚠️ ต้องแก้",
"⚠️ To fix:"
],
[
"ติดตั้งเลย",
"Install now"
],
[
"แอปโซเชียล",
"a social app"
],
[
"→ โฟลเดอร์",
"→ folder"
],
[
"เนื้อร้อง",
"Lyrics"
],
[
"⚠ นอกช่วง",
"⚠ Out of range"
],
[
"ไม่มีชื่อ",
"Untitled"
],
[
"ลบไม่ได้:",
"Couldn't delete:"
],
[
"·ท่อนใหม่",
"· new section"
],
[
"คอร์ด/เบส",
"Chord/bass"
],
[
"\"ติดตั้ง\"",
"\"Install\""
],
[
"ดาวน์โหลด",
"Download"
],
[
"เลือกไฟล์",
"Choose file"
],
[
"\"เรียกดู\"",
"\"Browse\""
],
[
"→ ฟังดู →",
"→ listen →"
],
[
"ไฟล์นี้มี",
"This file has"
],
[
"ห้องนี้มี",
"This bar has"
],
[
": โน้ตเบส",
": bass note"
],
[
"ชื่อเพลง",
"Song title"
],
[
"ย้อนกลับ",
"Undo"
],
[
"ซ่อนแป้น",
"Hide keypad"
],
[
"เริ่มฝึก",
"Start"
],
[
"💾 บันทึก",
"💾 Save"
],
[
"จังหวะ •",
"beats •"
],
[
"ลบเพลง \"",
"Delete song \""
],
[
"เอาออก ✕",
"Remove ✕"
],
[
"⌒ ติดกัน",
"⌒ Join"
],
[
"ต่อเสียง",
"Hold"
],
[
"🗑 ลบโน้ต",
"🗑 Delete note"
],
[
"เปิดผ่าน",
"Opened through"
],
[
"พร้อมฝึก",
"Ready to practise"
],
[
"ฟรีเหลือ",
"Free left:"
],
[
"ย้ายคีย์",
"Transposed"
],
[
"เพลงแล้ว",
"songs"
],
[
"\" ไม่ได้",
"\""
],
[
"ใส่รหัส",
"Enter code"
],
[
"ไม่พบ \"",
"\""
],
[
"แป้นแอป",
"App keypad"
],
[
"เก่งมาก",
"Well done"
],
[
"ปลดล็อก",
"Unlock"
],
[
"จูนไว้:",
"Tuned:"
],
[
"ไม่เว้น",
"no gap"
],
[
"(แนะนำ)",
"(suggested)"
],
[
"พัก (0)",
"Rest (0)"
],
[
"พักก่อน",
"Rest before"
],
[
"พักหลัง",
"Rest after"
],
[
"✨ แนะนำ",
"✨ Suggested"
],
[
"ใช้เวลา",
"Time taken:"
],
[
"\"เพิ่ม\"",
"\"Add\""
],
[
"เปิดเลย",
"Open now"
],
[
"แล้วแตะ",
"then tap"
],
[
"ขั้นที่",
"Step"
],
[
"ท่อนที่",
"Section"
],
[
"← กลับ",
"← Back"
],
[
"~ กรีด",
"~ strum"
],
[
"ห้อง •",
"bars •"
],
[
"ลบแล้ว",
"Deleted"
],
[
"กู้คืน",
"Restored"
],
[
"จังหวะ",
"beats"
],
[
"· เว้น",
"· gap"
],
[
"เป็น ♯",
"to ♯"
],
[
"เป็น ♭",
"to ♭"
],
[
"· ห้อง",
"· bar"
],
[
"จัดการ",
"Manage"
],
[
"ตัวแดง",
"Red notes"
],
[
"ได้เลย",
"right away"
],
[
"⏹ หยุด",
"⏹ Stop"
],
[
"ลบห้อง",
"Delete bar"
],
[
"วินาที",
"sec"
],
[
"· พลาด",
"· missed"
],
[
"กดปุ่ม",
"Press the"
],
[
"แล้วกด",
"then tap"
],
[
"อ่าน \"",
"Can't read \""
],
[
"พยางค์",
"syllables"
],
[
"· ช่อง",
"· channel"
],
[
"▶ ฟัง",
"▶ Listen"
],
[
"✕ ปิด",
"✕ Close"
],
[
"ทำนอง",
"Melody"
],
[
"— เลข",
"— digits"
],
[
"ต่ำ ·",
"lower ·"
],
[
"พัก ·",
"rest ·"
],
[
". ต่อ",
". repeat"
],
[
"0 พัก",
"0 rest"
],
[
"สูง '",
"High '"
],
[
"✂ แยก",
"✂ Split"
],
[
"โน้ต)",
"notes)"
],
[
"ครั้ง",
"times"
],
[
"ก่อน)",
"first)"
],
[
"เลือก",
"Choose"
],
[
"ค้นหา",
"Search"
],
[
"🎯 ฝึก",
"🎯 Practise"
],
[
"เพลง)",
"songs)"
],
[
"อยู่)",
"now)"
],
[
"แทร็ก",
"Track"
],
[
"หน้า",
"Page"
],
[
"ห้อง",
"Bar"
],
[
"ล้าง",
"Clear"
],
[
"หรือ",
"or"
],
[
"กรีด",
"strum"
],
[
"นาที",
"min"
],
[
"แชร์",
"Share"
],
[
"แท็บ",
"Tab"
],
[
"ใช้",
"Use"
],
[
"ปิด",
"Close"
],
[
"จุด",
"spots"
],
[
"เบส",
"Bass"
],
[
"แทน",
"instead"
],
[
"ต่ำ",
"Low"
],
[
"แตะ",
"Tap"
],
[
"ลบ",
"Delete"
],
[
"กด",
"Tap"
],
[
"มี",
"has"
]

,["รอ", "Wait"], ["ฟัง", "Listen"], ["โหมด", "Mode"], ["เพลง", "songs"], ["เล่น", "Play"], ["ภาษา", "Language"], ["หยุด", "Stop"], ["โน้ต", "notes"], ["คอร์ด", "Chord"], ["เรียน", "Learn"], ["เริ่ม", "Start"], ["วนซ้ำ", "Loop"], ["โน้ตตก", "Falling notes"], ["บันทึก", "Save"], ["ตอบถูก", "Correct"], ["ฟังก่อน", "Listen"], ["ติดตั้ง", "Install"], ["ตั้งค่า", "Settings"], ["♭ ต่ำไป", "♭ flat"], ["สูงไป ♯", "sharp ♯"], ["ซ่อนป้าย", "No labels"], ["ชื่อโน้ต", "Note names"], ["เริ่มเลย", "Start"], ["พลาดบ่อย", "Often missed"], ["ลงชื่อรอ", "Join waitlist"], ["ทีละท่อน", "Line by line"], ["ความเร็ว", "Speed"], ["ข้อต่อไป", "Next note"], ["ทีละโน้ต", "Note by note"], ["เฉพาะเลข", "Numbers only"], ["แผ่นโน้ต", "Sheet"], ["เริ่มฟัง", "Start listening"], ["ป้ายคีย์", "Key labels"], ["ตั้งเสียง", "Tuner"], ["เพิ่มเพลง", "Add song"], ["เปิดเสียง", "Sound on"], ["ช้าลง 10%", "10% slower"], ["ตามจังหวะ", "In rhythm"], ["เฉพาะโน้ต", "Note names only"], ["เลข + โน้ต", "Number + note"], ["เพลงของฉัน", "My songs"], ["จบเพลงแล้ว", "Song complete"], ["คาลิมบาจริง", "Real kalimba"], ["แตะเปิดเสียง", "Tap for sound"], ["เล่นอีกครั้ง", "Play again"], ["ครูฝึกคาลิมบา", "Kalimba Coach"], ["บทเรียนจำโน้ต", "Learn the notes"], ["เลือกเพลงอื่น", "Choose another song"], ["ตั้งค่าคาลิมบา", "Kalimba options"], ["สองมือพร้อมกัน", "Both hands together"], ["หาแล้วดีดโน้ตนี้", "Find and play this note"], ["มีคาลิมบาจริงไหม", "Do you have a real kalimba?"], ["ฉันมีคาลิมบาจริง", "I have a real kalimba"], ["เพลงตัวอย่างในแอป", "Sample songs"], ["ยังไม่มี · ฝึกบนจอ", "Not yet · practise on screen"], ["ฟังท่อนนี้อีกครั้ง", "Hear this line again"], ["รุ่นพรีเมียมกำลังมา", "Premium is coming"], ["เล่นเพลงแรกใน 5 นาที", "Play your first song in 5 minutes"], ["หมุนมือถือกลับเป็นแนวตั้ง", "Turn your phone back upright"], ["ดีดทีละก้าน ดูว่าเสียงตรงไหม", "Pluck one tine at a time to check it"], ["ฝึกคาลิมบาฟรี · ใช้ออฟไลน์ได้", "Free kalimba practice · works offline"], ["คลังเพลงฟรี (เพลงหมดลิขสิทธิ์)", "Free songs (public domain)"], ["มี · ฝึกกับแผ่นโน้ต แอปฟังผ่านไมค์", "Yes · practise from the sheet, the app listens"], ["ค้นหาเพลง เช่น jingle, วันเกิด, ดาว", "Search songs, e.g. jingle, birthday, star"], ["หาคีย์ให้ถูก โน้ตที่พลาดบ่อยจะถามซ้ำ", "Find the right tine. Notes you miss come back more often."], ["แอปจะเลือกวิธีฝึกที่เหมาะให้ เปลี่ยนได้ในตั้งค่า", "The app picks the right way to practise. You can change this in Settings"], ["Twinkle, Twinkle, Little Star · แตะคีย์ที่เรืองแสงทีละโน้ต ไม่ต้องรีบ", "Twinkle, Twinkle, Little Star · tap the glowing key, one note at a time"]
,["เสียชีวิต ค.ศ.", "died"], ["ค.ศ.", "c."], ["ศตวรรษที่ 18", "18th century"], ["เพลงพื้นบ้านฝรั่งเศส", "French folk song"], ["เพลงพื้นบ้านอังกฤษ", "English folk song"], ["เพลงพื้นบ้านอเมริกัน", "American folk song"], ["เพลงพื้นบ้านเยอรมัน", "German folk song"], ["เบโธเฟน", "Beethoven"], ["(แสงจันทร์)", "(Moonlight)"], ["(สุขสันต์วันเกิด)", ""], ["(ท่อนฮุก)", "(chorus)"]
,["ความไวไมค์ (คาลิมบาจริง)", "Microphone sensitivity (real kalimba)"], ["ถ้าแอปไม่ได้ยินคาลิมบา ให้ลองเพิ่มความไว ถ้าจับโน้ตเกินมา ให้ลดลง", "If the app does not hear your kalimba, raise the sensitivity. If it hears notes you did not play, lower it."], ["ปกติ", "Normal"], ["สูง", "High"]
,["⭐ สมาชิกได้อะไรบ้าง · ราคา (แตะเพื่ออ่าน)", "⭐ What members get · price (tap to read)"]
,["ใช้ฟรีตลอด", "Free forever"]
,["เพลงในคลังฟรี · ฝึกโน้ตตก · บทเรียน · เครื่องตั้งเสียง · นำเข้าไฟล์ MIDI ฟรี 3 เพลง · หน้าตาคาลิมบาแบบพื้นฐาน", "Free song library · falling-note practice · lessons · tuner · 3 free MIDI imports · the basic kalimba look"]
,["สมาชิก", "Member"]
,["นำเข้าไฟล์ MIDI ได้ไม่จำกัด · หน้าตาและเสียงคาลิมบาพรีเมียมทุกแบบ · ใช้สิทธิ์ได้ทุกเครื่องที่เข้าสู่ระบบด้วย Google เดียวกัน", "Unlimited MIDI imports · every premium kalimba look and sound · works on every device signed in with the same Google account"]
,["ราคา", "Price"]
,["฿99 ต่อเดือน หรือ ฿790 ต่อปี · ทดลองฟรี 7 วัน · ยกเลิกได้ทุกเมื่อ (เปิดให้สมัครเร็วๆ นี้)", "฿99 per month or ฿790 per year · 7-day free trial · cancel any time (sign-up opens soon)"]
,["วิธีเป็นสมาชิก", "How to become a member"]
,["เข้าสู่ระบบด้วย Google ที่กล่อง \"Member account\" ด้านบน แล้วสมัครจากกล่องนั้น", "Sign in with Google in the \"Member account\" box above, then subscribe from that box"]
,["มีรหัสสมาชิกจากเรา? ใส่รหัสเพื่อปลดล็อกเครื่องนี้", "Got a member code from us? Enter it to unlock this device"]
,["สำหรับผู้ที่ได้รับรหัสจากเรา (เช่น ทดลองใช้ก่อนใคร) ปลดล็อกเฉพาะเครื่องนี้ ถ้าเข้าสู่ระบบด้วย Google จะไม่ต้องใช้รหัส", "For people we gave a code to (for example early testers). It unlocks this device only. If you sign in with Google you do not need a code."]
,["คาลิมบามีแต่โน้ตขาว (คีย์ C) จึงย้ายเพลงไปคีย์ที่เล่นง่ายที่สุด เสียงจึงต่างจากต้นฉบับ ถ้าจะเล่นคีย์เดิมต้องจูนก้านเป็น ♯/♭ ในตั้งค่า แล้วเปลี่ยนคีย์ในหน้านี้", "The kalimba only has the white notes (key of C), so the song was moved to the easiest key and sounds different from the original. To play the original key, tune tines to ♯/♭ in Settings, then change the key on this page."]
,["ใส่เบสจากแทร็ก", "Added the bass from track"]
,["โน้ตเบส) · ในโหมดเล่นเลือก", "bass notes) · in the player choose"]
,["ฝึกส่วน → เบส", "Practise → Bass"]
,["โน้ต · ช่วงเสียง", "notes · range"]
,["· เริ่มห้อง", "· starts at bar"]
,["· 🎹 คล้ายคอร์ดเกลี่ย", "· 🎹 looks like an accompaniment"]
,["เพื่อซ้อมแยกมือ", "to practise the hands apart"]
,["ย้ายออกเทฟ ให้ลงคาลิมบา 17 คีย์", "Moved by whole octaves to fit the 17 keys"]
];

const Xlate = (() => {
  const TH = /[ก-๙]/;
  const keys = EN_PAIRS.slice().sort((x, y) => y[0].length - x[0].length);   // longest first
  const cache = new Map();
  const SKIP = '.chip, .sh-l, #pl-lyric, textarea, input, script, style, [data-notrans]';
  const ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
  const textStore = new Map(), attrStore = [];
  let obs = null;

  const EXACT = { 'จังหวะ': 'Rhythm' };        // a whole text that means something else than the same word inside a sentence
  function tr(s, partial) {                    // partial: dialogs may keep a song title in Thai
    if (!TH.test(s)) return s;
    const t0 = s.trim();
    if (EXACT[t0]) return s.replace(t0, EXACT[t0]);
    const ck = (partial ? 'p' : 'f') + s;
    if (cache.has(ck)) return cache.get(ck);
    let out = s;
    for (let i = 0; i < keys.length; i++) { const k = keys[i][0]; if (out.indexOf(k) >= 0) out = out.split(k).join(keys[i][1]); }
    const res = partial || !TH.test(out) ? out : s;
    cache.set(ck, res);
    return res;
  }
  function attrs(el) {
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (v && TH.test(v)) { const r = tr(v); if (r !== v) { attrStore.push([el, a, v, r]); el.setAttribute(a, r); } }
    }
  }
  function walk(n) {
    if (n.nodeType === 3) {
      const p = n.parentElement;
      if (!p || p.closest(SKIP)) return;
      const s = n.nodeValue;
      if (!TH.test(s)) return;
      const r = tr(s);
      if (r !== s) { textStore.set(n, [s, r]); n.nodeValue = r; }
    } else if (n.nodeType === 1) {
      attrs(n);
      if (n.matches && n.matches(SKIP)) return;
      for (let c = n.firstChild; c; c = c.nextSibling) walk(c);
    }
  }
  function restore() {
    textStore.forEach(([o, r], n) => { if (n.nodeValue === r) n.nodeValue = o; });
    attrStore.forEach(([el, a, o, r]) => { if (el.getAttribute(a) === r) el.setAttribute(a, o); });
    textStore.clear(); attrStore.length = 0;
  }
  function set(lang) {
    if (obs) { obs.disconnect(); obs = null; }
    restore();
    if (lang !== 'en' || !document.body) return;
    walk(document.body);
    obs = new MutationObserver(recs => {
      for (const r of recs) {
        if (r.type === 'childList') r.addedNodes.forEach(walk);
        else if (r.type === 'characterData') walk(r.target);
        else if (r.type === 'attributes') attrs(r.target);
      }
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  return { tr, set };
})();
// a dialog text (confirm) in the chosen language; user text inside it stays as typed
const X = s => (LANG === 'en' ? Xlate.tr(s, true) : s);
