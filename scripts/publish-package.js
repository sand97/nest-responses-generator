#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get command line arguments
const packageName = process.argv[2];
const versionType = process.argv[3]; // patch, minor, major, or specific version

if (!packageName) {
  console.error('❌ Error: Package name is required');
  console.log('Usage: node scripts/publish-package.js <package-name> [version-type]');
  console.log('Example: node scripts/publish-package.js @nest-responses-generator/plugin patch');
  process.exit(1);
}

function runCommand(command, description) {
  console.log(`\n🔄 ${description}...`);
  try {
    const output = execSync(command, { stdio: 'inherit', cwd: process.cwd() });
    console.log(`✅ ${description} completed`);
    return output;
  } catch (error) {
    console.error(`❌ Error during ${description.toLowerCase()}:`);
    console.error(error.message);
    process.exit(1);
  }
}

function checkPackageExists(packageName) {
  try {
    const output = execSync(`pnpm list --filter ${packageName} --depth=0`, {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    return true;
  } catch (error) {
    console.error(`❌ Package "${packageName}" not found in workspace`);
    return false;
  }
}

async function main() {
  console.log(`📦 Publishing package: ${packageName}`);

  // Check if package exists
  if (!checkPackageExists(packageName)) {
    process.exit(1);
  }

  // Update version if specified
  if (versionType) {
    runCommand(
      `pnpm --filter ${packageName} version ${versionType}`,
      `Updating version (${versionType})`
    );
  }

  // Build the package
  runCommand(
    `pnpm --filter ${packageName} run build`,
    'Building package'
  );

  // Run prepublishOnly if it exists
  try {
    runCommand(
      `pnpm --filter ${packageName} run prepublishOnly`,
      'Running prepublishOnly script'
    );
  } catch (error) {
    console.log('ℹ️  No prepublishOnly script found, skipping...');
  }

  // Publish the package
  runCommand(
    `pnpm --filter ${packageName} publish --access public --no-git-checks`,
    'Publishing to npm'
  );

  console.log(`\n🎉 Successfully published ${packageName}!`);
}

// Handle dry run
if (process.argv.includes('--dry-run')) {
  console.log('🧪 Running in dry-run mode...');
  process.argv = process.argv.filter(arg => arg !== '--dry-run');

  if (!packageName) {
    console.error('❌ Error: Package name is required');
    process.exit(1);
  }

  runCommand(
    `pnpm --filter ${packageName} run build`,
    'Building package (dry-run)'
  );

  runCommand(
    `pnpm --filter ${packageName} publish --dry-run --no-git-checks`,
    'Dry-run publish'
  );

  console.log(`\n✅ Dry-run completed for ${packageName}`);
  process.exit(0);
}

main().catch(console.error);