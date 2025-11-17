#!/usr/bin/env node
import openapiTS, { astToString } from "openapi-typescript";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
const OUTPUT_FILE = path.join(__dirname, "../src/types/api.ts");

async function generateTypes() {
  try {
    console.log(`Fetching OpenAPI schema from ${BACKEND_URL}/openapi.json...`);

    const ast = await openapiTS(`${BACKEND_URL}/openapi.json`, {
      exportType: true,
    });

    // Ensure the types directory exists
    const typesDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(typesDir)) {
      fs.mkdirSync(typesDir, { recursive: true });
    }

    // In openapi-typescript v7+, output is an AST that needs to be converted to string
    const typesContent = astToString(ast);

    // Write the generated types to file
    fs.writeFileSync(OUTPUT_FILE, typesContent);

    console.log(`✓ API types generated successfully at ${OUTPUT_FILE}`);
  } catch (error) {
    console.error("Failed to generate API types:", error.message);
    console.error("\nMake sure the FastAPI backend is running at", BACKEND_URL);
    process.exit(1);
  }
}

generateTypes();
