/* Published, independently verified campus locations only. No guessed coordinates. */
(() => {
  'use strict';
  const URL = 'https://wutgiojgomcsocfqxnml.supabase.co';
  const KEY = 'sb_publishable_3-xb2zcXFzqfSiTKqip7Lw_6KF9qiI_';
  let approved = [];
  const el = id => document.getElementById(id);
  window.renderVerifiedCampusLocations = () => {
    const list = el('verifiedCampusLocationsList');
    if (!list) return;
    list.replaceChildren();
    const term = (el('verifiedCampusLocationFilter')?.value || '').trim().toLowerCase();
    const matches = approved.filter(p => (p.name + ' ' + p.category).toLowerCase().includes(term));
    for (const place of matches) {
      const card = document.createElement('div');
      card.className = 'list-item';
      const heading = document.createElement('strong');
      heading.textContent = place.name;
      const description = document.createElement('p');
      description.textContent = place.category + ' · Verified ' +
        new Date(place.verified_at).toLocaleDateString();
      const link = document.createElement('a');
      link.className = 'btn light';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.href = 'https://www.google.com/maps/search/?api=1&query=' +
        encodeURIComponent(place.latitude + ',' + place.longitude);
      link.textContent = 'View verified point on map ↗';
      link.setAttribute('aria-label', 'View verified location of ' + place.name + ' on map');
      card.append(heading, description);
      if (place.accessibility_note) {
        const note = document.createElement('p');
        note.textContent = place.accessibility_note;
        card.append(note);
      }
      card.append(link);
      list.append(card);
    }
    const status = el('verifiedCampusLocationsStatus');
    if (status) status.textContent = matches.length
      ? matches.length + ' verified location(s) shown.'
      : approved.length ? 'No verified locations match your search.'
        : 'No campus locations have been independently verified and published yet.';
  };
  async function load() {
    const status = el('verifiedCampusLocationsStatus');
    if (!status) return;
    try {
      const response = await fetch(URL + '/rest/v1/veritashub_verified_campus_locations?' +
        'published=eq.true&select=name,category,latitude,longitude,accessibility_note,verified_at&order=name.asc',
        {headers:{apikey:KEY}});
      if (!response.ok) throw new Error('Location directory is temporarily unavailable.');
      approved = await response.json();
      window.renderVerifiedCampusLocations();
    } catch (_) {
      status.textContent = 'Unable to load verified locations. Please try again later.';
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load);
  else load();
})();
