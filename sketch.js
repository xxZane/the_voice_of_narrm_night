let images = {};
let soundObjects = [];
let bulletHistory = [];
let maxBullets = 35;
let minDistanceStrong = 140; // 控制间距（可以调）

// --------------------
// SOUND MAPPING
// --------------------
const labelToSound = [
  { keywords: ["dog", "bark"], name: "dog barking", type: "burst" },
  { keywords: ["horn"], name: "car horn", type: "burst" },
  { keywords: ["engine"], name: "engine sound", type: "burst" },
  { keywords: ["siren", "alarm", "emergency"], name: "siren", type: "burst" },
  { keywords: ["clap", "cheer", "applause"], name: "cheering", type: "burst" },

  { keywords: ["hum", "air conditioning"], name: "air condition hum", type: "soft" },
  { keywords: ["rain"], name: "raining", type: "soft" },
  { keywords: ["tap"], name: "myki tap on", type: "soft" },
  { keywords: ["footstep"], name: "footsteps", type: "soft" },
  { keywords: ["door"], name: "automatic doors opening", type: "soft" },
  { keywords: ["microwave"], name: "microwave", type: "soft" },

  { keywords: ["speech", "conversation", "talking"], name: "chat", type: "flow" },
  { keywords: ["music", "singing"], name: "busking", type: "flow" },
  { keywords: ["bird"], name: "bird sound", type: "flow" },
  { keywords: ["water", "river"], name: "yarra river", type: "flow" },
  { keywords: ["announcement"], name: "station announcement", type: "flow" },
  { keywords: ["vehicle", "car", "traffic", "train", "rail"], name: "car running over tram tracks", type: "flow" },
  { keywords: ["construction", "tools"], name: "construction noise", type: "flow" },

  { keywords: ["bell", "ding"], name: "tram ding", type: "attention" },
  { keywords: ["tram"], name: "tram stop", type: "attention" },
  { keywords: ["bicycle", "bike"], name: "bike whooshing past", type: "attention" },
  { keywords: ["signal", "beep"], name: "traffic light sound", type: "attention" },
  { keywords: ["wind"], name: "wind", type: "attention" }
];

const soundLibrary = {
  burst: [
    "burst_dog_barking",
    "burst_car_horn",
    "burst_siren",
    "burst_cheering",
    "burst_engine_sound"
  ],
  soft: [
    "soft_air_condition_hum",
    "soft_raining",
    "soft_myki_tap_on",
    "soft_footsteps",
    "soft_automatic_doors_opening",
    "soft_microwave"
  ],
  flow: [
    "flow_bird_sound",
    "flow_chat",
    "flow_yarra_river",
    "flow_busking",
    "flow_station_announcement",
    "flow_car_running_over_tram_tracks",
    "flow_pub_bgm",
    "flow_construction_noise"
  ],
  attention: [
    "attention_tram_ding",
    "attention_tram_stop",
    "attention_wind",
    "attention_bike_whooshing_past",
    "attention_traffic_light_sound"
  ]
};

function preload() {
  for (let type in soundLibrary) {
    for (let name of soundLibrary[type]) {
      images[name] = loadImage(
        "assets/svg/" + name + ".svg",
        () => console.log("loaded:", name),
        () => console.log("failed:", name)
      );
    }
  }
}

function setup() {
  pixelDensity(2);
  let canvas = createCanvas(595, 842);
  canvas.parent("poster-page");
}

function draw() {
  background(255);

  for (let obj of soundObjects) {
    imageMode(CENTER);

    push();
    translate(obj.x, obj.y);

    if (obj.type === "soft") {
      let bounce = sin(frameCount * 0.08 + obj.offset) * obj.bounceAmount;
      translate(0, bounce);
    }

    tint(255, obj.opacity);

    let displayW = obj.w;
    let displayH = obj.h;

    if (obj.type === "attention") {
      let compress = map(
        sin(frameCount * 0.04 + obj.offset),
        -1,
        1,
        0.3,
        1
      );

      displayH = obj.h * compress;
    }

    if (images[obj.imageName]) {
      image(images[obj.imageName], 0, 0, displayW, displayH);
    } else {
      console.warn("IMAGE MISSING:", obj.imageName);
    }

    noTint();
    pop();
  }
}

window.setSound = function(type, soundName) {
  console.log("RECEIVED BY SKETCH:", type, soundName);

  const imageName = soundName
    ? soundNameToImageName(type, soundName)
    : null;

  console.log("IMAGE NAME CREATED:", imageName);

  if (type === "burst") createBurst(imageName);
  if (type === "soft") createSoft(imageName);
  if (type === "flow") createFlow(imageName);
  if (type === "attention") createAttention(imageName);
};

// --------------------
// POSITION SYSTEM
// --------------------
function getRandomPosition() {
  const margin = 70;
  const safeBottom = height * 0.88;

  const zones = [
    { x1: margin, x2: width * 0.32, y1: margin, y2: safeBottom },
    { x1: width * 0.32, x2: width * 0.68, y1: margin, y2: safeBottom },
    { x1: width * 0.68, x2: width - margin, y1: margin, y2: safeBottom }
  ];

  const zone = random(zones);

  return {
    x: random(zone.x1, zone.x2),
    y: random(zone.y1, zone.y2)
  };
}

// --------------------
// BURST
// --------------------
function createBurst(imageName) {
  const list = soundLibrary.burst;
  imageName = validateImageName(imageName, list);

  let baseSize = random(100, 500);

  let stretchChance = random(1);
  let stretchX = 1;
  let stretchY = 1;

  if (stretchChance > 0.4) {
    stretchX = random(1.2, 1.3);
    stretchY = random(0.8, 1.0);
  }

  // 防重叠（只针对 burst / attention）
  let x, y;
  let attempts = 0;

  do {
    x = random(60, width - 60);
    y = random(60, height * 0.88);
    attempts++;
  } while (isTooCloseStrong(x, y) && attempts < 20);

  soundObjects.push({
    type: "burst",
    imageName: imageName,
    x: x,
    y: y,
    w: baseSize * stretchX,
    h: baseSize * stretchY,
    opacity: 200,
    offset: random(100)
  });
}

// --------------------
// SOFT
// --------------------
function createSoft(imageName) {
  const list = soundLibrary.soft;
  imageName = validateImageName(imageName, list);

  let baseSize = random(90, 160);
  let compressX = random(0.7, 1.0);
  let opacityValue = random(120, 210);

  soundObjects.push({
    type: "soft",
    imageName: imageName,
    ...getRandomPosition(),
    w: baseSize * compressX,
    h: baseSize,
    opacity: opacityValue,
    bounceAmount: random(8, 24),
    offset: random(100)
  });
}

// --------------------
// FLOW
// --------------------
function createFlow(imageName) {
  const list = soundLibrary.flow;
  imageName = validateImageName(imageName, list);

  let count = floor(random(3, 5));

  let pos = getRandomPosition();
  let startX = pos.x;
  let startY = pos.y;

  let angle = random(TWO_PI);
  let distance = random(30, 55);

  let growDirection = random([-1, 1]);

  for (let i = 0; i < count; i++) {
    let opacityPercent = 60 - i * 10;
    let opacityValue = map(opacityPercent, 0, 100, 0, 255);

    let sizePercent = 100 + growDirection * i * 10;
    sizePercent = constrain(sizePercent, 60, 140);

    let baseSize = 150;
    let size = baseSize * (sizePercent / 100);

    let spreadX = cos(angle) * distance * i;
    let spreadY = sin(angle) * distance * i;

    let finalX = constrain(startX + spreadX, 60, width - 60);
    let finalY = constrain(startY + spreadY, 60, height * 0.88);

    soundObjects.push({
      type: "flow",
      imageName: imageName,
      x: finalX,
      y: finalY,
      w: size,
      h: size,
      opacity: opacityValue,
      offset: random(100)
    });
  }
}

// --------------------
// ATTENTION
// --------------------
function createAttention(imageName) {
  const list = soundLibrary.attention;
  imageName = validateImageName(imageName, list);

  let baseSize = random(40, 220);

  // 防重叠
  let x, y;
  let attempts = 0;

  do {
    x = random(60, width - 60);
    y = random(60, height * 0.88);
    attempts++;
  } while (isTooCloseStrong(x, y) && attempts < 20);

  soundObjects.push({
    type: "attention",
    imageName: imageName,
    x: x,
    y: y,
    w: baseSize,
    h: baseSize,
    opacity: 200,
    offset: random(100)
  });
}

// --------------------
// DATE + TIME
// --------------------
function updateDateTime() {
  const now = new Date();

  const months = [
    "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
    "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
  ];

  const month = months[now.getMonth()];
  const day = now.getDate();
  const dateText = month + day;

  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";

  hours = hours % 12;
  hours = hours ? hours : 12;

  const timeText = hours + ":" + minutes + ampm;

  document.getElementById("dateText").textContent = dateText;
  document.getElementById("timeText").textContent = timeText;
}

updateDateTime();

window.exportPoster = function() {
  const poster = document.getElementById("poster-page");

  html2canvas(poster, {
    backgroundColor: null,
    scale: 2
  }).then(canvas => {
    const link = document.createElement("a");
    link.download = "sound_poster.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
};

// --------------------
// BULLET NOTES
// --------------------
function addBulletNote(soundName) {
  if (!soundName) return;

  bulletHistory.push(soundName);

  if (bulletHistory.length > maxBullets) {
    bulletHistory.shift();
  }

  const list = document.getElementById("soundNotes");
  list.innerHTML = "";

  for (let i = 0; i < bulletHistory.length; i++) {
    const li = document.createElement("li");
    li.textContent = bulletHistory[i];
    list.appendChild(li);
  }
}

// --------------------
// HELPERS
// --------------------
function mapLabelToSound(label) {
  let matches = [];

  for (let item of labelToSound) {
    for (let key of item.keywords) {
      if (label.includes(key)) {
        matches.push(item);
        break;
      }
    }
  }

  if (matches.length === 0) return null;

  return random(matches);
}

function soundNameToImageName(type, soundName) {
  return type + "_" + soundName.replaceAll(" ", "_");
}

function validateImageName(imageName, list) {
  console.log("VALIDATING IMAGE:", imageName);

  if (imageName && images[imageName]) {
    console.log("IMAGE FOUND:", imageName);
    return imageName;
  }

  const fallback = random(list);
  console.warn("IMAGE NOT FOUND, FALLBACK TO:", fallback);
  return fallback;
}

function isTooCloseStrong(x, y) {
  for (let obj of soundObjects) {
    if (obj.type === "burst" || obj.type === "attention") {
      let d = dist(x, y, obj.x, obj.y);
      if (d < minDistanceStrong) {
        return true;
      }
    }
  }
  return false;
}

window.addBulletNote = addBulletNote;
window.mapLabelToSound = mapLabelToSound;