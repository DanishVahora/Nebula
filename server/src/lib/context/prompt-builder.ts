import type { BuildContextResult } from "./context-builder";

/**
 * Convert a BuildContextResult and an error message
 * into a structured prompt suitable for an LLM.
 */
export function buildErrorPrompt(
    context: BuildContextResult,
    errorMessage: string
): string {
    const sections: string[] = [];

    // System instruction
    sections.push("You are a senior software engineer helping debug a project.");

    // Project structure
    if (context.projectStructure.length > 0) {
        sections.push(
            "Project structure:\n" + context.projectStructure.join("\n")
        );
    }

    // Dependencies
    if (context.dependencies.length > 0) {
        sections.push(
            "Dependencies:\n" + context.dependencies.join("\n")
        );
    }

    // Current file with code around the error
    if (context.currentFile) {
        sections.push(
            `Current file (error around line ${context.errorLine}):\n` +
            context.currentFile.path +
            "\n\n```\n" +
            context.currentFile.code +
            "\n```"
        );
    }

    // Related files
    if (context.relatedFiles.length > 0) {
        const parts = context.relatedFiles.map(
            (f) => f.path + "\n```\n" + f.code + "\n```"
        );
        sections.push("Related files:\n" + parts.join("\n\n"));
    }

    // Error message
    sections.push("Error:\n" + errorMessage);

    // Closing instruction
    sections.push(
        "Explain why this error occurs and suggest a fix. " +
        "Include a corrected code snippet if applicable."
    );

    return sections.join("\n\n");
}
