# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## Example Release Notes Format

When creating GitHub releases, use the following format for release notes. These will be displayed in the update dialog when users receive an update notification.

---

## [1.2.0] - 2025-01-15

### Added
- New dark mode toggle with system preference detection
- Keyboard shortcuts for common actions (`Ctrl+S` to save, `Ctrl+O` to open)
- Export functionality with multiple format support (JSON, CSV, PDF)
- Drag and drop file import

### Changed
- Improved performance of large file handling by 40%
- Updated UI components with better accessibility support
- Migrated to React 19 with automatic optimizations

### Fixed
- Fixed memory leak when switching between tabs rapidly
- Resolved issue where settings weren't persisting after restart
- Fixed crash on startup when offline

### Security
- Updated electron to latest version with security patches
- Added Content Security Policy headers

---

## [1.1.0] - 2025-01-01

### Added
- Multi-language support (English, Polish)
- Auto-save feature with configurable interval
- Recent files list in the File menu

### Changed
- Redesigned settings modal with tabbed interface
- Improved error messages with actionable suggestions

### Fixed
- Fixed window position not restoring correctly on multi-monitor setups
- Resolved file encoding issues with UTF-8 characters

---

## [1.0.0] - 2024-12-15

### Added
- Initial release
- Core editor functionality
- Theme support (light/dark/system)
- Auto-update system
- Debug mode with separate console window

---

## Writing Good Release Notes

### Tips for the Update Dialog

The update dialog renders Markdown, so you can use:

1. **Headers** - Use `##` for version, `###` for categories
2. **Lists** - Bullet points for individual changes
3. **Code** - Inline `code` for shortcuts, commands, file names
4. **Bold** - **Highlight** important changes
5. **Links** - [Link to docs](https://example.com) if needed

### Recommended Categories

- **Added** - New features
- **Changed** - Changes in existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Vulnerability fixes

### Example Single Release (Copy-Paste Template)

```markdown
## What's New in v1.2.0

### New Features
- **Dark Mode** - Automatic theme switching based on system preferences
- **Keyboard Shortcuts** - Press `Ctrl+K` to open command palette
- **Export Options** - Export your work as PDF, JSON, or CSV

### Improvements
- Faster startup time (reduced by 50%)
- Better memory management for large files
- Updated translations for Polish locale

### Bug Fixes
- Fixed crash when opening files with special characters
- Resolved issue with window not maximizing correctly
- Fixed settings not saving on first launch

### Notes
This update requires a restart to apply all changes.
```

---

## GitHub Release Publishing

When publishing a new release on GitHub:

1. Go to your repository's **Releases** page
2. Click **Draft a new release**
3. Create a new tag (e.g., `v1.2.0`)
4. Set the release title (e.g., `v1.2.0 - Dark Mode & Performance`)
5. Paste your release notes in the description
6. Attach the built installers (from `release/` folder)
7. Click **Publish release**

The auto-updater will automatically detect the new release and show the update dialog to users.
