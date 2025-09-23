# Publishing Packages

This monorepo is set up with scripts to easily publish packages to npm. The publishing system supports any package in the workspace.

## Quick Commands

### Plugin Package

```bash
# Dry run (test without publishing)
pnpm run publish:plugin:dry

# Publish current version
pnpm run publish:plugin

# Publish with version bump
pnpm run publish:plugin:patch   # 0.0.1 -> 0.0.2
pnpm run publish:plugin:minor   # 0.0.1 -> 0.1.0
pnpm run publish:plugin:major   # 0.0.1 -> 1.0.0
```

### Any Package (Generic)

```bash
# Publish any package by name
node scripts/publish-package.js <package-name> [version-type]

# Examples:
node scripts/publish-package.js nest-responses-generator-plugin
node scripts/publish-package.js nest-responses-generator-plugin patch
node scripts/publish-package.js nest-responses-generator-plugin --dry-run
```

## Publishing Process

The publishing script automatically:

1. ✅ Validates package exists in workspace
2. ✅ Updates version (if specified)
3. ✅ Builds the package (`pnpm run build`)
4. ✅ Runs `prepublishOnly` script (if exists)
5. ✅ Publishes to npm with public access
6. ✅ Bypasses git checks for flexibility

## Before Publishing

### First Time Setup

1. **Login to npm:**
   ```bash
   npm login
   ```

2. **Verify login:**
   ```bash
   npm whoami
   ```

### Pre-publish Checklist

- [ ] Update package version appropriately
- [ ] Update README.md with latest features
- [ ] Test the package builds correctly
- [ ] Run dry-run to verify package contents
- [ ] Ensure all dependencies are correct in package.json

## Package Configuration

Each publishable package should have:

```json
{
  "name": "@nest-responses-generator/plugin",
  "version": "0.0.1",
  "main": "plugin.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist/**/*",
    "plugin.js"
  ],
  "scripts": {
    "build": "tsc",
    "prepublishOnly": "npm run build"
  }
}
```

## Adding New Packages

To add a new publishable package:

1. Create package in `packages/your-package/`
2. Add proper `package.json` configuration
3. Add specific scripts to root `package.json`:
   ```json
   {
     "scripts": {
       "publish:your-package": "node scripts/publish-package.js @your-scope/your-package",
       "publish:your-package:dry": "node scripts/publish-package.js @your-scope/your-package --dry-run"
     }
   }
   ```

## 🤖 Automated Publishing (GitHub Actions)

### Setup Required
1. **Add NPM_TOKEN to GitHub repository secrets**
   - See `scripts/setup-github-secrets.md` for detailed instructions
   - Token type: "Automation" from npmjs.com

### How It Works
- **Automatic**: Pushes to main/master trigger auto-publishing
- **Smart Detection**: Only publishes packages with actual changes
- **Version Management**: Auto-bumps versions if current version exists on npm
- **Git Integration**: Commits version bumps and creates tags

### Usage
```bash
# Automatic publishing
git add packages/plugin/src/new-feature.ts
git commit -m "feat: add new feature"
git push origin main
# → Workflow automatically publishes changed packages

# Manual trigger via GitHub Actions UI
# → Go to Actions tab → Auto Publish Packages → Run workflow
```

For complete GitHub workflow documentation, see `GITHUB_WORKFLOW.md`.

## 📋 Manual Publishing

### Manual Versioning
```bash
# Update version manually
pnpm --filter nest-responses-generator-plugin version patch
pnpm --filter nest-responses-generator-plugin version minor
pnpm --filter nest-responses-generator-plugin version major
```

### Automated Versioning
The publish script can handle versioning:
```bash
node scripts/publish-package.js nest-responses-generator-plugin patch
```

### Future: Changesets (Recommended)
For better version management, consider using changesets:
```bash
npm install @changesets/cli
npx changeset init
```

## Troubleshooting

### Common Issues

1. **Package not found:**
   - Verify package name matches workspace configuration
   - Check `pnpm-workspace.yaml` includes the package path

2. **Build fails:**
   - Ensure TypeScript compiles without errors
   - Check all dependencies are installed

3. **Git checks fail:**
   - Scripts automatically use `--no-git-checks`
   - Commit changes if you want clean git state

4. **Authentication issues:**
   - Run `npm login` to authenticate
   - Verify with `npm whoami`

### Debug Mode

Add debug logging to the publish script:
```bash
DEBUG=1 node scripts/publish-package.js @nest-responses-generator/plugin --dry-run
```