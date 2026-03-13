import * as fs from "fs";
import * as path from "path";

export type ProjectType = "nextjs" | "react" | "node" | "static" | "unknown";

export function detectProjectType(projectPath: string): ProjectType {
  const packageJsonPath = path.join(projectPath, "package.json");
  const indexHtmlPath = path.join(projectPath, "index.html");

  // Check if package.json exists
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJsonContent = fs.readFileSync(packageJsonPath, "utf-8");
      const packageJson = JSON.parse(packageJsonContent);

      // Combine dependencies and devDependencies
      const allDependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      // Check for Next.js
      if (allDependencies["next"]) {
        return "nextjs";
      }

      // Check for React
      if (allDependencies["react"]) {
        return "react";
      }

      // Check for Express
      if (allDependencies["express"]) {
        return "node";
      }

      // Default to node if package.json exists
      return "node";
    } catch (error) {
      console.error("Error reading package.json:", error);
      return "node";
    }
  }

  // Check if index.html exists (static site)
  if (fs.existsSync(indexHtmlPath)) {
    return "static";
  }

  // Unknown project type
  return "unknown";
}
