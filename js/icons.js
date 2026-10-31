// Outline icons from Tabler Icons 3.19.0 (MIT licence, tabler.io/icons), inlined so they work offline.
const ICONS = {
"arrow-left": "<path d=\"M5 12l14 0\"/><path d=\"M5 12l6 6\"/><path d=\"M5 12l6 -6\"/>",
"check": "<path d=\"M5 12l5 5l10 -10\"/>",
"download": "<path d=\"M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2\"/><path d=\"M7 11l5 5l5 -5\"/><path d=\"M12 4l0 12\"/>",
"gauge": "<path d=\"M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0\"/><path d=\"M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0\"/><path d=\"M13.41 10.59l2.59 -2.59\"/><path d=\"M7 12a5 5 0 0 1 5 -5\"/>",
"headphones": "<path d=\"M4 13m0 2a2 2 0 0 1 2 -2h1a2 2 0 0 1 2 2v3a2 2 0 0 1 -2 2h-1a2 2 0 0 1 -2 -2z\"/><path d=\"M15 13m0 2a2 2 0 0 1 2 -2h1a2 2 0 0 1 2 2v3a2 2 0 0 1 -2 2h-1a2 2 0 0 1 -2 -2z\"/><path d=\"M4 15v-3a8 8 0 0 1 16 0v3\"/>",
"language": "<path d=\"M4 5h7\"/><path d=\"M9 3v2c0 4.418 -2.239 8 -5 8\"/><path d=\"M5 9c0 2.144 2.952 3.908 6.7 4\"/><path d=\"M12 20l4 -9l4 9\"/><path d=\"M19.1 18h-6.2\"/>",
"microphone": "<path d=\"M9 2m0 3a3 3 0 0 1 3 -3h0a3 3 0 0 1 3 3v5a3 3 0 0 1 -3 3h0a3 3 0 0 1 -3 -3z\"/><path d=\"M5 10a7 7 0 0 0 14 0\"/><path d=\"M8 21l8 0\"/><path d=\"M12 17l0 4\"/>",
"music": "<path d=\"M3 17a3 3 0 1 0 6 0a3 3 0 0 0 -6 0\"/><path d=\"M13 17a3 3 0 1 0 6 0a3 3 0 0 0 -6 0\"/><path d=\"M9 17v-13h10v13\"/><path d=\"M9 8h10\"/>",
"player-pause": "<path d=\"M6 5m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z\"/><path d=\"M14 5m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z\"/>",
"player-play": "<path d=\"M7 4v16l13 -8z\"/>",
"player-stop": "<path d=\"M5 5m0 2a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2z\"/>",
"playlist": "<path d=\"M14 17m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0\"/><path d=\"M17 17v-13h4\"/><path d=\"M13 5h-10\"/><path d=\"M3 9l10 0\"/><path d=\"M9 13h-6\"/>",
"refresh": "<path d=\"M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4\"/><path d=\"M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4\"/>",
"repeat": "<path d=\"M4 12v-3a3 3 0 0 1 3 -3h13m-3 -3l3 3l-3 3\"/><path d=\"M20 12v3a3 3 0 0 1 -3 3h-13m3 3l-3 -3l3 -3\"/>",
"school": "<path d=\"M22 9l-10 -4l-10 4l10 4l10 -4v6\"/><path d=\"M6 10.6v5.4a6 3 0 0 0 12 0v-5.4\"/>",
"settings": "<path d=\"M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z\"/><path d=\"M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0\"/>",
"star": "<path d=\"M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z\"/>",
"volume": "<path d=\"M15 8a5 5 0 0 1 0 8\"/><path d=\"M17.7 5a9 9 0 0 1 0 14\"/><path d=\"M6 15h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l3.5 -4.5a.8 .8 0 0 1 1.5 .5v14a.8 .8 0 0 1 -1.5 .5l-3.5 -4.5\"/>"
};
function icon(name, cls) {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="' + (cls || 'w-5 h-5') + '">' + (ICONS[name] || '') + '</svg>';
}
// <i data-icon="music" class="w-5 h-5"></i> placeholders in the markup
function fillIcons(root) {
  (root || document).querySelectorAll('i[data-icon]').forEach(i => { i.outerHTML = icon(i.dataset.icon, i.className || undefined); });
}
