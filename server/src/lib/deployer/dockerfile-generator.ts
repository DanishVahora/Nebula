import * as fs from "fs";
import * as path from "path";
import { ProjectType } from "./project-detector";

const DOCKERFILE_TEMPLATES: Record<string, string> = {
  react: `FROM node:20
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
RUN npm install -g serve
EXPOSE 3000
CMD ["serve","-s","dist","-l","3000"]
`,

  nextjs: `FROM node:20
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
EXPOSE 3000
CMD ["npm","start"]
`,

  node: `FROM node:20
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 3000
CMD ["npm","start"]
`,

  static: `FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
`,
};

export function generateDockerfile(
  projectPath: string,
  projectType: ProjectType
): string {
  if (projectType === "unknown") {
    throw new Error("Cannot generate Dockerfile for unknown project type");
  }

  const template = DOCKERFILE_TEMPLATES[projectType];
  if (!template) {
    throw new Error(`No Dockerfile template available for project type: ${projectType}`);
  }

  const dockerfilePath = path.join(projectPath, "Dockerfile");
  fs.writeFileSync(dockerfilePath, template, "utf-8");

  console.log(`Dockerfile generated at: ${dockerfilePath}`);

  return dockerfilePath;
}
