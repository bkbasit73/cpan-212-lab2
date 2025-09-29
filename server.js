// CPAN 212 — Lab 2
// Express server with callbacks, promises, async/await, fs.promises, and chaining

const express = require("express");
const path = require("path");
const fs = require("fs").promises; // (5) Use fs.promises

const app = express();
const PORT = process.env.PORT || 3000;

// Change this to your own info if you want.
const DATA = { id: 123, name: "Abdul Basit" };

// (6) Helper that resolves after ms milliseconds
function simulateDelay(ms, value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

// (3) Callback style
function getUserWithCallback(shouldFail, cb) {
  setTimeout(() => {
    if (shouldFail) return cb(new Error("Simulated callback API failure"));
    cb(null, { ...DATA });
  }, 1000);
}

// (3/4) Promise style
function getUserWithPromise(shouldFail) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldFail) return reject(new Error("Simulated promise API failure"));
      resolve({ ...DATA });
    }, 1000);
  });
}

// (4) Async/Await style
async function getUserWithAsync(shouldFail) {
  const user = await getUserWithPromise(shouldFail);
  return user;
}

// Middleware logger
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Root endpoint
app.get("/", (req, res) => {
  res.type("text").send(
    [
      "CPAN 212 Lab 2 server is running.",
      "Available endpoints:",
      "/callback   /promise   /async   /file   /chain",
      "Use ?fail=true to simulate an error, e.g. /promise?fail=true",
      "Use /chain?failAt=login|fetch|render to fail a specific step.",
    ].join("\n")
  );
});

// (7) /callback
app.get("/callback", (req, res, next) => {
  const shouldFail = req.query.fail === "true";
  getUserWithCallback(shouldFail, (err, data) => {
    if (err) return next(err);
    res.json({ ok: true, style: "callback", data });
  });
});

// (7) /promise
app.get("/promise", (req, res, next) => {
  const shouldFail = req.query.fail === "true";
  getUserWithPromise(shouldFail)
    .then((data) => res.json({ ok: true, style: "promise", data }))
    .catch(next);
});

// (7) /async
app.get("/async", async (req, res, next) => {
  try {
    const shouldFail = req.query.fail === "true";
    const data = await getUserWithAsync(shouldFail);
    res.json({ ok: true, style: "async/await", data });
  } catch (err) {
    next(err);
  }
});

// (5) /file
app.get("/file", async (_req, res, next) => {
  try {
    const filepath = path.join(__dirname, "sample.txt");
    const content = await fs.readFile(filepath, "utf8");
    res.type("text").send(content);
  } catch (err) {
    next(new Error("Failed to read sample.txt: " + err.message));
  }
});

// (6 + 7) /chain
app.get("/chain", (req, res, next) => {
  const failAt = (req.query.failAt || "").toLowerCase();
  const messages = [];

  const stamp = (msg) => {
    const line = `${new Date().toLocaleTimeString()} - ${msg}`;
    messages.push(line);
    console.log(line);
  };

  simulateDelay(400)
    .then(() => {
      stamp("Step 1: Logging in...");
      if (failAt === "login") throw new Error("Login failed (simulated).");
      return simulateDelay(600);
    })
    .then(() => {
      stamp("Step 2: Fetching data...");
      if (failAt === "fetch") throw new Error("Data fetch failed (simulated).");
      return simulateDelay(500, { ...DATA });
    })
    .then((user) => {
      stamp(`Step 3: Rendering UI for ${user.name}...`);
      if (failAt === "render") throw new Error("Render failed (simulated).");
      return simulateDelay(300, { user, html: `<h1>Hello, ${user.name}</h1>` });
    })
    .then((result) => {
      stamp("Done!");
      res.json({ ok: true, style: "promise-chain", result, log: messages });
    })
    .catch(next);
});

// Error handler
app.use((err, req, res, _next) => {
  console.error("ERROR:", err.message);
  res.status(500).json({ ok: false, error: err.message, route: req.originalUrl });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
