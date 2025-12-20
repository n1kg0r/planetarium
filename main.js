const STAR_COUNT = 1500;

let currentLST = 0;

const NAMED_STARS = [
  {
    name: "Polaris",
    bayer: "α UMi",
    ra: raToRad("02:31:49.09"),
    dec: decToRad("+89:15:50.8")
  },
  {
    name: "Sirius",
    bayer: "α CMa",
    ra: raToRad("06:45:08.92"),
    dec: decToRad("-16:42:58.0")
  },
  {
    name: "Betelgeuse",
    bayer: "α Ori",
    ra: raToRad("05:55:10.31"),
    dec: decToRad("+07:24:25.4")
  }
];

const CONSTELLATION_NAMES = {
  And: "Andromeda",
  Ant: "Antlia",
  Aps: "Apus",
  Aql: "Aquila",
  Aqr: "Aquarius",
  Ara: "Ara",
  Ari: "Aries",
  Aur: "Auriga",
  Boo: "Boötes",
  CMa: "Canis Major",
  CMi: "Canis Minor",
  CVn: "Canes Venatici",
  Cae: "Caelum",
  Cam: "Camelopardalis",
  Cap: "Capricornus",
  Car: "Carina",
  Cas: "Cassiopeia",
  Cen: "Centaurus",
  Cep: "Cepheus",
  Cet: "Cetus",
  Cha: "Chamaeleon",
  Cir: "Circinus",
  Cnc: "Cancer",
  Col: "Columba",
  Com: "Coma Berenices",
  CrA: "Corona Australis",
  CrB: "Corona Borealis",
  Crt: "Crater",
  Cru: "Crux",
  Crv: "Corvus",
  Cyg: "Cygnus",
  Del: "Delphinus",
  Dor: "Dorado",
  Dra: "Draco",
  Equ: "Equuleus",
  Eri: "Eridanus",
  For: "Fornax",
  Gem: "Gemini",
  Gru: "Grus",
  Her: "Hercules",
  Hor: "Horologium",
  Hya: "Hydra",
  Hyi: "Hydrus",
  Ind: "Indus",
  LMi: "Leo Minor",
  Lac: "Lacerta",
  Leo: "Leo",
  Lep: "Lepus",
  Lib: "Libra",
  Lup: "Lupus",
  Lyn: "Lynx",
  Lyr: "Lyra",
  Men: "Mensa",
  Mic: "Microscopium",
  Mon: "Monoceros",
  Mus: "Musca",
  Nor: "Norma",
  Oct: "Octans",
  Oph: "Ophiuchus",
  Ori: "Orion",
  Pav: "Pavo",
  Peg: "Pegasus",
  Per: "Perseus",
  Phe: "Phoenix",
  Pic: "Pictor",
  PsA: "Piscis Austrinus",
  Psc: "Pisces",
  Pup: "Puppis",
  Pyx: "Pyxis",
  Ret: "Reticulum",
  Scl: "Sculptor",
  Sco: "Scorpius",
  Sct: "Scutum",
  Ser: "Serpens",
  Sex: "Sextans",
  Sge: "Sagitta",
  Sgr: "Sagittarius",
  Tau: "Taurus",
  Tel: "Telescopium",
  TrA: "Triangulum Australe",
  Tri: "Triangulum",
  Tuc: "Tucana",
  UMa: "Ursa Major",
  UMi: "Ursa Minor",
  Vel: "Vela",
  Vir: "Virgo",
  Vol: "Volans",
  Vul: "Vulpecula"
};




const story = {
  enabled: false,
  activeConstellation: null,
  startTime: 0,
  phase: "idle" // "zoom-in" → "hold" → "zoom-out"
};


const visitedConstellations = [];
const MAX_VISITED = 6; // tweak: how much memory the story has


const STORY_INTERVAL = 10_000; // 10 seconds
const ZOOM_FACTOR = 0.9;      // 10% zoom in
const ZOOM_SPEED = 0.05;      // interpolation speed






const canvas = document.getElementById("sky");
const ctx = canvas.getContext("2d");


function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();




function raToRad(ra) {
  const [h, m, s] = ra.split(":").map(Number);
  return ((h + m / 60 + s / 3600) * 15) * Math.PI / 180;
}

function decToRad(dec) {
  const sign = dec.startsWith("-") ? -1 : 1;
  const [d, m, s] = dec.replace("+", "").replace("-", "").split(":").map(Number);
  return sign * (d + m / 60 + s / 3600) * Math.PI / 180;
}








/* ===============================
   Camera
================================ */

const camera = {
  yaw: 0,
  pitch: 0,              // START looking at zenith
  fov: Math.PI / 3
};


const BASE_FOV = camera.fov;


const atmosphere = {
  x: 0,
  y: 0
};

/* ===============================
   Star generation (angular sky)
================================ */



let stars = [];
let starById = {};

function indexStars() {
  starById = {};
  for (const s of stars) {
    starById[s.id] = s;
  }
}

function angularDistance(a, b) {
  return Math.acos(
    Math.sin(a.dec) * Math.sin(b.dec) +
    Math.cos(a.dec) * Math.cos(b.dec) *
    Math.cos(a.ra - b.ra)
  );
}

// TODO: check
function labelNamedStars(stars) {
  const MAX_DIST = 0.001; // ~1.7 arcmin

  for (const named of NAMED_STARS) {
    let best = null;
    let bestDist = Infinity;

    for (const s of stars) {
      const d = angularDistance(s, named);
      if (d < bestDist) {
        bestDist = d;
        best = s;
      }
    }

    if (best && bestDist < MAX_DIST) {
      best.name = named.name;
      best.bayer = named.bayer;
    }
  }
}


fetch("stars.json")
  .then(res => res.json())
  .then(data => {
    stars = data
      .filter(s => Number(s.MAG) <= 6.5) // naked-eye limit
      .map(s => ({
        id: s["harvard_ref_#"],
        ra: raToRad(s.RA),
        dec: decToRad(s.DEC),
        mag: Number(s.MAG),
        a: Math.max(0.2, 1.0 - Number(s.MAG) / 7)
      }));
      indexStars(); // ← REQUIRED
    labelNamedStars(stars);
  });












let constellations = {};

fetch("constellations.json")
  .then(res => res.json())
  .then(data => constellations = data);








const observer = {
  lat: 44.4949 * Math.PI / 180,
  lon: 11.3426 * Math.PI / 180
};
function getLocalSiderealTime(date, lonRad) {
  const JD = date / 86400000 + 2440587.5;
  const D = JD - 2451545.0;

  let GMST = 280.46061837
    + 360.98564736629 * D;

  GMST = ((GMST % 360) + 360) % 360;

  const LST = GMST * Math.PI / 180 + lonRad;
  return LST;
}


function raDecToAltAz(ra, dec, lat, lst) {
  const H = lst - ra; // hour angle

  const sinAlt =
    Math.sin(dec) * Math.sin(lat) +
    Math.cos(dec) * Math.cos(lat) * Math.cos(H);

  const alt = Math.asin(sinAlt);

  const cosAz =
    (Math.sin(dec) - Math.sin(alt) * Math.sin(lat)) /
    (Math.cos(alt) * Math.cos(lat));

  let az = Math.acos(Math.min(1, Math.max(-1, cosAz)));

  if (Math.sin(H) > 0) az = 2 * Math.PI - az;

  return { alt, az };
}














let projectedStars = [];



/* ===============================
   Projection (dome, no edges)
================================ */
function projectStar(s) {


  const { alt, az } = raDecToAltAz(
    s.ra,
    s.dec,
    observer.lat,
    currentLST
  );

  // Below horizon → invisible
  if (alt <= 0) return null;

  // Convert Alt/Az to direction vector
  // Planetarium convention:
  // x = south, y = east, z = up
  let x = Math.cos(alt) * Math.cos(az);
  let y = Math.cos(alt) * Math.sin(az);
  let z = Math.sin(alt);

  // Apply camera yaw (left-right)
  const cy = Math.cos(camera.yaw);
  const sy = Math.sin(camera.yaw);
  let dx = x * cy - y * sy;
  let dy = x * sy + y * cy;
  let dz = z;

  // Apply camera pitch (up-down)
  const cp = Math.cos(camera.pitch);
  const sp = Math.sin(camera.pitch);
  const dz2 = dz * cp + dx * sp;
  dx = -dz * sp + dx * cp;
  dz = dz2;

  if (dz <= 0) return null;

  const f = 0.5 * window.innerHeight / Math.tan(camera.fov / 2);

  return {
    x: window.innerWidth / 2 + (dy / dz) * f,
    y: window.innerHeight / 2 - (dx / dz) * f,
    alt
  };
}




/* ===============================
   Background (sky gradient)
================================ */
function projectZenith() {
  // Zenith vector in world space
  const zx = 0;
  const zy = 0;
  const zz = 1;

  // Rotate by camera yaw
  const cosYaw = Math.cos(-camera.yaw);
  const sinYaw = Math.sin(-camera.yaw);
  let dx = zx * cosYaw - zy * sinYaw;
  let dy = zx * sinYaw + zy * cosYaw;
  let dz = zz;

  // Rotate by camera pitch
  // Rotate by camera pitch (planetarium mode)
  const cosPitch = Math.cos(camera.pitch);
  const sinPitch = Math.sin(camera.pitch);

  const dz2 = dz * cosPitch + dx * sinPitch;
  dx = -dz * sinPitch + dx * cosPitch;
  dz = dz2;

  // Perspective projection
  if (dz <= 0) return null;

  const f = 0.5 * window.innerHeight / Math.tan(camera.fov / 2);

  return {
    x: window.innerWidth / 2 + (dy / dz) * f,
    y: window.innerHeight / 2 - (dx / dz) * f
  };
}
function drawBackground() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  const zenith = projectZenith();

  const zx = zenith ? zenith.x : w / 2;
  const zy = zenith ? zenith.y : h / 2;

  const R = Math.max(w, h) * 1.1;

  const g = ctx.createRadialGradient(
    zx,
    zy,
    R * 0.05,   // zenith
    zx,
    zy,
    R          // horizon
  );

  // DARK zenith
  g.addColorStop(0.0, "#000000");
  g.addColorStop(0.4, "#02060b");
  g.addColorStop(0.7, "#06131f");
  g.addColorStop(1.0, "#0c2435"); // faint horizon glow

  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}




/* ===============================
   Draw sky (clipped dome)
================================ */


  function getStarTooltipText(star) {
    if (star.name) {
      return `${star.name}${star.bayer ? ` (${star.bayer})` : ""}\nMag ${star.mag.toFixed(2)}`;
    }
    return `Star\nMag ${star.mag.toFixed(2)}`;
  }


function drawSky() {


  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawBackground();

  
  projectedStars.length = 0;

  for (const s of stars) {
    const p = projectStar(s);
    if (!p) continue;

    projectedStars.push({
      x: p.x,
      y: p.y,
      star: s
    });

    ctx.beginPath();
    ctx.fillStyle = `rgba(255,255,255,${s.a})`;
    const r = Math.max(0.6, 1.5 - s.mag);
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  }






  ctx.strokeStyle = "rgba(150,180,255,0.25)";
  ctx.lineWidth = 1;

  for (const abr in constellations) {


    const isActive = story.enabled && story.activeConstellation === abr;
    ctx.strokeStyle = isActive
      ? "rgba(220,230,255,0.8)"
      : "rgba(150,180,255,0.25)";
    ctx.lineWidth = isActive ? 2 : 1;

    for (const [a, b] of constellations[abr]) {
      const sa = starById[a];
      const sb = starById[b];
      if (!sa || !sb) continue;

      const pa = projectStar(sa);
      const pb = projectStar(sb);
      if (!pa || !pb) continue;

      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    }
  }




  let hoveredStar = null;
  let hoveredConstellation = null;

  if (story.enabled && story.activeConstellation) {
    hoveredConstellation =
      CONSTELLATION_NAMES[story.activeConstellation] ??
      story.activeConstellation;
  } else {
    hoveredStar = findHoveredStar();
    hoveredConstellation = hoveredStar
      ? null
      : findHoveredConstellation();
  }


  if (hoveredStar || hoveredConstellation) {
    drawTooltip(
      mouse.x + 12,
      mouse.y + 12,
      hoveredStar
      ? getStarTooltipText(hoveredStar)
      : hoveredConstellation

    );
  }

}

  /* ===============================
    Interaction
  ================================ */

  let dragging = false;
  let lastX = 0;



  let lastY = 0;

  const mouse = {
    x: 0,
    y: 0
  };

  canvas.addEventListener("click", () => {
    story.enabled = !story.enabled;

    if (story.enabled) {
      advanceStory();
      storyTimer = setInterval(advanceStory, STORY_INTERVAL);
    } else {
      clearInterval(storyTimer);
      story.activeConstellation = null;
    }
  });


  canvas.addEventListener("mousemove", e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });


  canvas.addEventListener("mousedown", e => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  });

  window.addEventListener("mouseup", () => dragging = false);

  window.addEventListener("mousemove", e => {
    if (!dragging) return;

    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    // Camera rotation
    camera.yaw -= dx * 0.002;
    camera.pitch = Math.max(
      -Math.PI / 2,
      Math.min(0, camera.pitch + dy * 0.002)
    );



    // Atmospheric parallax (slower than stars)
    atmosphere.x -= dx * 0.15;
    atmosphere.y -= dy * 0.25;

    // Clamp atmosphere so it never detaches
    atmosphere.x = Math.max(-200, Math.min(200, atmosphere.x));
    atmosphere.y = Math.max(-150, Math.min(150, atmosphere.y));
  });





  canvas.addEventListener("wheel", e => {
    e.preventDefault();

    camera.fov *= Math.exp(e.deltaY * 0.001);
    camera.fov = Math.max(
      Math.PI / 6,   // ~30°
      Math.min(Math.PI / 2, camera.fov) // ~90°
    );
  }, { passive: false });


  canvas.addEventListener("contextmenu", e => e.preventDefault());

  /* ===============================
    Animation loop (Earth rotation)
  ================================ */

  let lastTime = performance.now();


function isOnScreen(p, margin = 40) {
  return (
    p.x >= -margin &&
    p.x <= window.innerWidth + margin &&
    p.y >= -margin &&
    p.y <= window.innerHeight + margin
  );
}


function getVisibleConstellationsInView() {
  const visible = [];

  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  const maxDist = Math.min(cx, cy) * 0.85; 

  for (const abr in constellations) {
    const centroid = getConstellationCentroid(abr);
    if (!centroid) continue;

    const dx = centroid.x - cx;
    const dy = centroid.y - cy;
    const dist = Math.hypot(dx, dy);

    // must be clearly inside the view
    if (dist < maxDist) {
      visible.push(abr);
    }
  }

  return visible;
}





  function lerp(a, b, t) {
    return a + (b - a) * t;
  }


  function animate(time) {

    if (story.enabled && story.activeConstellation) {
      const targetFov = BASE_FOV * ZOOM_FACTOR;
      camera.fov = lerp(camera.fov, targetFov, ZOOM_SPEED);
    } else {
      camera.fov = lerp(camera.fov, BASE_FOV, ZOOM_SPEED);
    }


    const dt = (time - lastTime) / 1000;
    lastTime = time;

    camera.yaw += dt * 0.02;// very slow celestial drift

    atmosphere.x *= 0.98;
    atmosphere.y *= 0.98;


    currentLST = getLocalSiderealTime(Date.now(), observer.lon);

    drawSky();
    requestAnimationFrame(animate);
  }

  function advanceStory() {
    if (!story.enabled) return;

    const next = pickRandomVisibleConstellation();
    if (!next) return;

    story.activeConstellation = next;
    story.startTime = performance.now();

    // remember it
    visitedConstellations.push(next);
    if (visitedConstellations.length > MAX_VISITED) {
      visitedConstellations.shift();
    }

    setTimeout(() => {
      if (!story.enabled) return;
      story.activeConstellation = null;
    }, STORY_INTERVAL - 1500);
  }



  requestAnimationFrame(animate);





  function findHoveredStar() {
  let closest = null;
  let minDist = 8; // pixels

  for (const p of projectedStars) {
    const dx = p.x - mouse.x;
    const dy = p.y - mouse.y;
    const d = Math.sqrt(dx * dx + dy * dy);

    if (d < minDist) {
      minDist = d;
      closest = p.star;
    }
  }
  return closest;
}
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1,
    ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)
  ));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}
function findHoveredConstellation() {
  const threshold = 5;

  for (const abr in constellations) {
    for (const [a, b] of constellations[abr]) {
      const sa = starById[a];
      const sb = starById[b];
      if (!sa || !sb) continue;

      const pa = projectStar(sa);
      const pb = projectStar(sb);
      if (!pa || !pb) continue;

      if (distToSegment(mouse.x, mouse.y, pa.x, pa.y, pb.x, pb.y) < threshold) {
        return CONSTELLATION_NAMES[abr] || abr;
      }
    }
  }
  return null;
}



function drawTooltip(x, y, text) {
  const lines = text.split("\n");
  ctx.font = "12px system-ui";
  ctx.textBaseline = "top";

  const padding = 8;
  const lineHeight = 16;
  const width = Math.max(
    ...lines.map(l => ctx.measureText(l).width)
  ) + padding * 2;
  const height = lines.length * lineHeight + padding * 2;

  // glow
  ctx.shadowColor = "rgba(200,220,255,0.4)";
  ctx.shadowBlur = 10;

  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.strokeStyle = "rgba(180,200,255,0.35)";
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 6);
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0;

  ctx.fillStyle = "#eaeef5";
  lines.forEach((l, i) =>
    ctx.fillText(l, x + padding, y + padding + i * lineHeight)
  );
}



function getConstellationCentroid(abr) {
  let sx = 0, sy = 0, n = 0;

  for (const [a, b] of constellations[abr]) {
    const sa = starById[a];
    const sb = starById[b];
    if (!sa || !sb) continue;

    const pa = projectStar(sa);
    const pb = projectStar(sb);
    if (!pa || !pb) continue;

    sx += pa.x + pb.x;
    sy += pa.y + pb.y;
    n += 2;
  }

  if (n === 0) return null;

  return {
    x: sx / n,
    y: sy / n
  };
}




function pickRandomVisibleConstellation() {
  const visible = getVisibleConstellationsInView();
  if (visible.length === 0) return null;

  const unvisited = visible.filter(
    abr => !visitedConstellations.includes(abr)
  );

  const pool = unvisited.length > 0 ? unvisited : visible;
  return pool[Math.floor(Math.random() * pool.length)];
}



