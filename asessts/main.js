```javascript
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

const ADMIN_EMAIL = "amkvaliollahi1313@gmail.com";

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const UPLOAD_DIR = path.join(ROOT, "uploads");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const files = {
  users: path.join(DATA_DIR, "users.json"),
  games: path.join(DATA_DIR, "games.json"),
  reels: path.join(DATA_DIR, "reels.json"),
  news: path.join(DATA_DIR, "news.json")
};

function ensureFile(file, defaultValue) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(defaultValue, null, 2));
  }
}

ensureFile(files.users, []);
ensureFile(files.games, []);
ensureFile(files.reels, []);
ensureFile(files.news, []);

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return [];
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(ROOT));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },

  filename: (req, file, cb) => {
    const safeName =
      Date.now() +
      "-" +
      file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");

    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 1024
  }
});

/* =========================
   AUTH
========================= */

app.post("/api/login", (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email required"
    });
  }

  const users = readJSON(files.users);

  let user = users.find(
    u => u.email.toLowerCase() === email
  );

  if (!user) {
    user = {
      id: Date.now().toString(),
      email,
      role: email === ADMIN_EMAIL ? "superadmin" : "user",
      createdAt: new Date().toISOString()
    };

    users.push(user);
    writeJSON(files.users, users);
  }

  const isAdmin =
    email === ADMIN_EMAIL ||
    user.role === "superadmin";

  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      role: isAdmin ? "superadmin" : "user",
      isAdmin
    }
  });
});

/* =========================
   USER
========================= */

app.get("/api/users", (req, res) => {
  const users = readJSON(files.users);

  res.json(
    users.map(u => ({
      id: u.id,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt
    }))
  );
});

/* =========================
   GAMES
========================= */

app.get("/api/games", (req, res) => {
  res.json(readJSON(files.games));
});

app.post(
  "/api/games",
  upload.fields([
    { name: "gameFile", maxCount: 1 },
    { name: "cover", maxCount: 1 }
  ]),
  (req, res) => {

    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

    if (!email) {
      return res.status(401).json({
        success: false,
        message: "Login required"
      });
    }

    const games = readJSON(files.games);

    const game = {
      id: Date.now().toString(),
      name: req.body.name || "Untitled Game",
      genre: req.body.genre || "Other",
      description: req.body.description || "",
      developer: email,
      downloads: 0,
      createdAt: new Date().toISOString(),
      gameFile: req.files?.gameFile?.[0]?.filename || null,
      cover: req.files?.cover?.[0]?.filename || null
    };

    games.unshift(game);
    writeJSON(files.games, games);

    res.json({
      success: true,
      game
    });
  }
);

app.delete("/api/games/:id", (req, res) => {

  const email = String(req.headers["x-admin-email"] || "")
    .trim()
    .toLowerCase();

  if (email !== ADMIN_EMAIL) {
    return res.status(403).json({
      success: false,
      message: "Admin only"
    });
  }

  let games = readJSON(files.games);

  games = games.filter(
    game => game.id !== req.params.id
  );

  writeJSON(files.games, games);

  res.json({
    success: true
  });
});

/* =========================
   REELS
========================= */

app.get("/api/reels", (req, res) => {
  res.json(readJSON(files.reels));
});

app.post(
  "/api/reels",
  upload.single("video"),
  (req, res) => {

    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

    if (!email) {
      return res.status(401).json({
        success: false,
        message: "Login required"
      });
    }

    const reels = readJSON(files.reels);

    const reel = {
      id: Date.now().toString(),
      title: req.body.title || "Untitled Reel",
      creator: email,
      views: 0,
      createdAt: new Date().toISOString(),
      video: req.file?.filename || null
    };

    reels.unshift(reel);
    writeJSON(files.reels, reels);

    res.json({
      success: true,
      reel
    });
  }
);

app.delete("/api/reels/:id", (req, res) => {

  const email = String(req.headers["x-admin-email"] || "")
    .trim()
    .toLowerCase();

  if (email !== ADMIN_EMAIL) {
    return res.status(403).json({
      success: false,
      message: "Admin only"
    });
  }

  let reels = readJSON(files.reels);

  reels = reels.filter(
    reel => reel.id !== req.params.id
  );

  writeJSON(files.reels, reels);

  res.json({
    success: true
  });
});

/* =========================
   NEWS
========================= */

app.get("/api/news", (req, res) => {
  res.json(readJSON(files.news));
});

app.post(
  "/api/news",
  upload.single("image"),
  (req, res) => {

    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

    if (email !== ADMIN_EMAIL) {
      return res.status(403).json({
        success: false,
        message: "Super Admin only"
      });
    }

    const news = readJSON(files.news);

    const article = {
      id: Date.now().toString(),
      title: req.body.title || "Untitled News",
      text: req.body.text || "",
      author: ADMIN_EMAIL,
      image: req.file?.filename || null,
      createdAt: new Date().toISOString()
    };

    news.unshift(article);

    writeJSON(files.news, news);

    res.json({
      success: true,
      news: article
    });
  }
);

app.delete("/api/news/:id", (req, res) => {

  const email = String(req.headers["x-admin-email"] || "")
    .trim()
    .toLowerCase();

  if (email !== ADMIN_EMAIL) {
    return res.status(403).json({
      success: false,
      message: "Super Admin only"
    });
  }

  let news = readJSON(files.news);

  news = news.filter(
    article => article.id !== req.params.id
  );

  writeJSON(files.news, news);

  res.json({
    success: true
  });
});

/* =========================
   ADMIN SETTINGS
========================= */

app.get("/api/admin/check", (req, res) => {

  const email = String(req.headers["x-admin-email"] || "")
    .trim()
    .toLowerCase();

  res.json({
    isAdmin: email === ADMIN_EMAIL,
    email
  });
});

/* =========================
   DOWNLOAD GAME
========================= */

app.get("/api/download/:id", (req, res) => {

  const games = readJSON(files.games);

  const game = games.find(
    g => g.id === req.params.id
  );

  if (!game || !game.gameFile) {
    return res.status(404).send("Game file not found");
  }

  game.downloads++;

  writeJSON(files.games, games);

  const file = path.join(
    UPLOAD_DIR,
    game.gameFile
  );

  if (!fs.existsSync(file)) {
    return res.status(404).send("File missing");
  }

  res.download(file);
});

/* =========================
   FILES
========================= */

app.use(
  "/uploads",
  express.static(UPLOAD_DIR)
);

/* =========================
   START
========================= */

app.listen(PORT, () => {
  console.log("");
  console.log("=================================");
  console.log("      AMK GAMES HUB ONLINE");
  console.log("=================================");
  console.log("");
  console.log(`Website: http://localhost:${PORT}`);
  console.log(`Admin: ${ADMIN_EMAIL}`);
  console.log("");
});
```
