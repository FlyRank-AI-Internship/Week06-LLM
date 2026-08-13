import express from "express";

import jobsRouter from "./routes/jobs.js";
import { startWorker } from "./jobs/worker.js";

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

app.use("/api", jobsRouter);

// Invalid JSON handler
app.use((err, req, res, next) => {
  if (
    err instanceof SyntaxError &&
    err.status === 400 &&
    "body" in err
  ) {
    return res.status(400).json({
      error: "Invalid JSON",
      field: "body",
      message: "Request body must contain valid JSON.",
    });
  }

  next(err);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);

  startWorker();
});