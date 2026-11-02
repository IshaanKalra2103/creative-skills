// Labels and numbers pinned to the 3D parts (DOM over the WebGL canvas). Anchors come from window.SET.at, which the set
// recomputes every frame after the camera moves, so a label rides on its part through the whole move.
(() => {
const { h, set, p, txt, clamp } = L;
scene({
  name: 'labels', t0: 0, t1: 1e9, z: 900, overlay: true,
  build(root) {
    const S = this;
    S.lb = {
      spk: [R.label('Speaker', 0, 0, -90, 210), W('speaker') - 0.05, W('light') - 0.1],
      emit: [R.label('IR emitter', 0, 0, -170, -210), W('light'), LINE(2).s],
      cheek: [R.label('Cheek', 0, 0, 70, 250), W('cheek'), W('sensor') + 0.6],
      recv: [R.label('Sensor', 0, 0, -60, 250), W('sensor'), LINE(3).s + 0.2],
    };
    for (const [el] of Object.values(S.lb)) root.append(el);
    S.cnt = h('span', { class: 'lbl-n' }, '');
    S.lb.recv[0].querySelector('.lbl-t').append(' ', S.cnt);   // the count rides on the sensor's label
    // the screen state hangs under the sensor's reading: count -> decision
    S.chip = h('div', { class: 'chip abs' }, 'SCREEN OFF');
    root.append(S.chip);
    // credit under the photo card
    S.credit = h('div', { class: 'credit abs' }, h('b', {}, 'The real part'), h('br'), 'iPhone 14 Pro sensor', h('br'), 'Photo: TechInsights');
    root.append(S.credit);
    S.note = R.note(['Infrared drawn in gold. Invisible to the eye.', 'Cutaway, magnified, slowed down']);
    root.append(S.note);
  },
  update(t) {
    const S = this, A = window.SET?.at;
    if (!A) return;
    S.lb.spk[0].at(A.spk.x, A.spk.y); S.lb.emit[0].at(A.emit.x, A.emit.y);
    S.lb.cheek[0].at(A.hit.x, A.hit.y); S.lb.recv[0].at(A.recv.x, A.recv.y);
    for (const [el, at, out] of Object.values(S.lb)) el.update(t, at, out);
    txt(S.cnt, String(SET.count));
    const on = SET.count < SET.TH;
    txt(S.chip, on ? 'SCREEN ON' : 'SCREEN OFF');
    S.chip.classList.toggle('on', on);
    const vis = p(t, W('counts') - 0.1, 0.25) * (1 - p(t, LINE(3).s, 0.2));
    set(S.chip, { left: `${(A.recv.x - 74).toFixed(1)}px`, top: `${(A.recv.y + 250 + 62).toFixed(1)}px`, opacity: vis.toFixed(3) });
    S.note.update(t, W('light'), LINE(3).s + 0.4);
    const cv = SET.cardVis ?? 0;
    set(S.credit, { left: `${A.card.x.toFixed(1)}px`, top: `${A.card.y.toFixed(1)}px`, opacity: clamp((cv - 0.6) / 0.4).toFixed(3) });
  },
});
})();
