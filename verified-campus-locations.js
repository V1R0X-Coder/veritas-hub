/* Published, independently verified campus locations only. No guessed coordinates. */
(() => {
  'use strict';
  const URL = 'https://wutgiojgomcsocfqxnml.supabase.co';
  const KEY = 'sb_publishable_3-xb2zcXFzqfSiTKqip7Lw_6KF9qiI_';
  let approved = [];
  const CACHE_KEY = 'veritashub-public-campus-directory-v1';
  const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000;
  let offlineCopy = false;
  function readCachedLocations() {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (!cached || !Array.isArray(cached.places) ||
          !Number.isFinite(cached.savedAt) ||
          Date.now() - cached.savedAt < 0 ||
          Date.now() - cached.savedAt > MAX_CACHE_AGE_MS) return null;
      return cached;
    } catch (_) { return null; }
  }
  function cachePublishedLocations(places) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        savedAt: Date.now(), places: places.map(p => ({
          id:p.id,name:p.name,category:p.category,latitude:p.latitude,
          longitude:p.longitude,accessibility_note:p.accessibility_note,
          verified_at:p.verified_at
        }))
      }));
    } catch (_) { /* Browsers may disable local storage. */ }
  }
  const el = id => document.getElementById(id);
  let map = null;
  let pinLayer = null;
  function renderPinMap(matches) {
    const host = el('verifiedCampusPinMap');
    if (!host) return;
    if (!matches.length) {
      if (map) { map.remove(); map = null; pinLayer = null; }
      host.replaceChildren();
      return;
    }
    if (!window.L) {
      host.textContent = 'Map tiles are unavailable. Verified locations remain accessible in the list below.';
      return;
    }
    if (!map) {
      map = window.L.map(host, {scrollWheelZoom:false});
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:'&copy; OpenStreetMap contributors', maxZoom:19
      }).addTo(map);
      pinLayer = window.L.layerGroup().addTo(map);
    }
    pinLayer.clearLayers();
    const bounds = [];
    for (const place of matches) {
      const lat = Number(place.latitude), lng = Number(place.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) ||
          Math.abs(lat)>90 || Math.abs(lng)>180) continue;
      const marker = window.L.marker([lat,lng], {title:place.name,alt:'Verified location: '+place.name});
      const label = document.createElement('span');
      label.textContent = place.name;
      marker.bindPopup(label);
      marker.addTo(pinLayer);
      bounds.push([lat,lng]);
    }
    if (bounds.length) map.fitBounds(bounds, {padding:[32,32],maxZoom:17});
    setTimeout(() => map && map.invalidateSize(), 0);
  }
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
    if (offlineCopy) {
      // Offline copies can be outdated or revoked; never show cached pins as live map guidance.
      if (map) { map.remove(); map = null; pinLayer = null; }
      const host = el('verifiedCampusPinMap');
      if (host) host.textContent = 'Offline reference only: live map pins are disabled until connectivity returns.';
    } else renderPinMap(matches);
    const status = el('verifiedCampusLocationsStatus');
    if (status) status.textContent = offlineCopy
      ? 'OFFLINE REFERENCE — cached locations may be outdated or unpublished. Confirm with campus staff before traveling. ' + matches.length + ' saved place(s).'
      : matches.length
      ? matches.length + ' verified location(s) shown.'
      : approved.length ? 'No verified locations match your search.'
        : 'No campus locations have been independently verified and published yet.';
  };
  async function load() {
    const status = el('verifiedCampusLocationsStatus');
    if (!status) return;
    try {
      const response = await fetch(URL + '/rest/v1/veritashub_verified_campus_locations?' +
        'published=eq.true&select=id,name,category,latitude,longitude,accessibility_note,verified_at&order=name.asc',
        {headers:{apikey:KEY}});
      if (!response.ok) throw new Error('Location directory is temporarily unavailable.');
      const rows = await response.json();
      if (!Array.isArray(rows)) throw new Error('Invalid campus directory response.');
      approved = rows;
      offlineCopy = false;
      cachePublishedLocations(rows);
      window.renderVerifiedCampusLocations();
    } catch (_) {
      const cached = readCachedLocations();
      if (cached) {
        approved = cached.places;
        offlineCopy = true;
        window.renderVerifiedCampusLocations();
      } else {
        status.textContent = 'Verified locations are unavailable offline. Reconnect to load the current approved directory.';
      }
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load);
  else load();
})();
