/**
 * Migration script to add projectIdBytes32 to existing projects
 * Run with: pnpm --filter=api tsx src/scripts/migrate-project-ids.ts
 */

import { getDatabase } from "../db/client.js";
import type { Project } from "../db/models/project.js";
import { computeProjectId } from "../lib/contract-utils.js";

async function migrateProjectIds() {
  console.log("Starting project ID migration...");

  try {
    const db = await getDatabase();
    const projectsCollection = db.collection<Project>("projects");

    // Find all projects without projectIdBytes32
    const projectsToUpdate = await projectsCollection
      .find({
        $or: [
          { projectIdBytes32: { $exists: false } },
          { projectIdBytes32: "" as any },
        ],
      })
      .toArray();

    console.log(`Found ${projectsToUpdate.length} projects to update`);

    let updated = 0;
    let errors = 0;

    for (const project of projectsToUpdate) {
      try {
        const projectIdBytes32 = computeProjectId(
          project.repoUrl,
          project.ownerAddress
        );

        await projectsCollection.updateOne(
          { _id: project._id },
          {
            $set: {
              projectIdBytes32,
              updatedAt: new Date(),
            },
          }
        );

        console.log(
          `✓ Updated project ${project.repoOwner}/${project.repoName}: ${projectIdBytes32}`
        );
        updated++;
      } catch (error) {
        console.error(
          `✗ Failed to update project ${project.repoOwner}/${project.repoName}:`,
          error
        );
        errors++;
      }
    }

    console.log("\n=== Migration Complete ===");
    console.log(`Successfully updated: ${updated}`);
    console.log(`Errors: ${errors}`);
    console.log(`Total processed: ${projectsToUpdate.length}`);

    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrateProjectIds();
