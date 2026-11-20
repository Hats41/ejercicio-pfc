const sections = { points: '#puntos', offers: '#ofertas', mine: '#actividad' };

export function sectionHash(view) {
  return Object.hasOwn(sections, view) ? sections[view] : sections.points;
}

export function sectionFromHash(hash) {
  return Object.keys(sections).find(view => sections[view] === hash) ?? 'points';
}

export function accessHref(view) {
  return view === 'offers' || view === 'mine' ? `./acceso.html?next=${view}` : './acceso.html';
}

export function afterAccessHref(next) {
  return `./${next === 'offers' ? sections.offers : sections.mine}`;
}
