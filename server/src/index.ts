import cors from "cors";
import express from "express";
import { router } from "./routes.js";

const app = express();
const PORT = 3001;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());
app.use(router);

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
