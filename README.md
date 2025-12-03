# Electron Starter Template

A modern, production-ready Electron application template with React 19, TypeScript, and comprehensive tooling.

## ✨ Features

### Core Stack
- **Electron 38+** - Latest stable Electron with security best practices
- **React 19** - With React Compiler for automatic optimization
- **TypeScript** - Full type safety across main and renderer processes
- **Vite** - Lightning-fast HMR and builds
- **electron-builder** - Professional packaging and distribution

### UI & Styling
- **shadcn-ui** - Beautiful, accessible components built on Radix UI
- **Tailwind CSS 4** - Utility-first CSS with oklch color space
- **Dark/Light/System Theme** - Persistent theme system with smooth transitions
- **Custom Title Bar** - Cross-platform custom window controls

### Internationalization
- **i18next** - Full i18n support with React integration
- **Polish & English** - Pre-configured bilingual support (easily extensible)
- **Persistent Language** - Language preference saved locally

### Routing & State
- **TanStack Router** - Type-safe file-based routing with memory history
- **TanStack Query** - Powerful data fetching and caching (included, ready to use)

### Developer Experience
- **pnpm Package Manager** - Fast installs, auto peer deps, disk space efficient
- **Debug Mode** - Separate debug console window with colored logs
- **DevTools Extensions** - React DevTools auto-installed in development
- **Hot Module Replacement** - Instant updates during development
- **ESLint + Prettier** - Code quality and formatting
- **React Compiler Plugin** - Automatic component optimization

### Testing
- **Vitest** - Fast unit testing with jsdom
- **Playwright** - End-to-end testing for Electron apps
- **Testing Library** - React component testing utilities
- **V8 Coverage** - Detailed code coverage reports

### Production Features
- **Auto-Update with Custom UI** - Beautiful update dialog with release notes, download progress, and changelog history
- **Code Signing Ready** - Configured for Windows/macOS signing
- **NSIS Installer** - Professional Windows installer
- **IPC Architecture** - Well-structured inter-process communication
- **Error Handling** - Comprehensive error boundaries

## 📦 Quick Start

### Prerequisites
- Node.js 18+ (20+ recommended)
- pnpm 9+ (install with `npm install -g pnpm` or `corepack enable`)

### Installation

```bash
# Clone the template
git clone https://github.com/yourusername/electron-starter-template.git
cd electron-starter-template

# Install dependencies
pnpm install

# Start development server
pnpm start
```

### Development

```bash
# Start with hot reload
pnpm start

# Start with debug console
pnpm run start:debug

# Run tests
pnpm test

# Lint code
pnpm run lint

# Format code
pnpm run format:write
```

### Building

```bash
# Build for development (no installer)
pnpm run dist:dir

# Build with NSIS installer
pnpm run dist

# Build and publish to GitHub Releases
pnpm run publish
```

## 🏗️ Project Structure

```
electron-starter-template/
├── src/
│   ├── main.ts                      # Electron main process
│   ├── preload.ts                   # Preload script
│   ├── renderer.ts                  # Renderer entry point
│   ├── App.tsx                      # React root component
│   ├── types.d.ts                   # TypeScript declarations
│   │
│   ├── assets/                      # Static assets
│   │   ├── fonts/                   # Geist, Tomorrow fonts
│   │   └── icon.ico                 # App icon
│   │
│   ├── components/                  # React components
│   │   ├── ui/                      # shadcn-ui components
│   │   ├── DragWindowRegion.tsx     # Custom title bar
│   │   ├── Navbar.tsx               # Navigation
│   │   ├── SettingsModal.tsx        # Settings UI
│   │   ├── ToggleTheme.tsx          # Theme switcher
│   │   ├── LangToggle.tsx           # Language switcher
│   │   ├── UpdateDialog.tsx         # Auto-update notification UI
│   │   └── ChangelogHistoryDialog.tsx # GitHub releases viewer
│   │
│   ├── config/                      # Configuration
│   │   └── app.config.ts            # Centralized app metadata
│   │
│   ├── helpers/                     # Helper functions
│   │   ├── ipc/                     # IPC infrastructure
│   │   │   ├── theme/               # Theme IPC
│   │   │   ├── window/              # Window controls IPC
│   │   │   ├── debug/               # Debug logging IPC
│   │   │   ├── updater/             # Auto-updater IPC
│   │   │   ├── context-exposer.ts   # Context aggregator
│   │   │   └── listeners-register.ts # Listener aggregator
│   │   │
│   │   ├── updater/                 # Auto-updater core
│   │   │   └── auto-updater.ts      # electron-updater setup
│   │   │
│   │   ├── debug-mode.ts            # Debug system (main)
│   │   ├── debug-logger.ts          # Debug logger (renderer)
│   │   ├── theme_helpers.ts         # Theme utilities
│   │   ├── language_helpers.ts      # i18n utilities
│   │   └── window_helpers.ts        # Window utilities
│   │
│   ├── layouts/                     # Layout components
│   │   └── BaseLayout.tsx           # Main layout
│   │
│   ├── localization/                # i18n configuration
│   │   ├── i18n.ts                  # i18next setup
│   │   ├── language.ts              # Language utilities
│   │   └── langs.ts                 # Available languages
│   │
│   ├── routes/                      # TanStack Router routes
│   │   ├── __root.tsx               # Root layout
│   │   └── index.tsx                # Home page
│   │
│   ├── styles/                      # Global styles
│   │   └── global.css               # Tailwind + theme vars
│   │
│   ├── tests/                       # Test files
│   │   ├── unit/                    # Vitest tests
│   │   └── e2e/                     # Playwright tests
│   │
│   ├── utils/                       # Utility functions
│   │   ├── tailwind.ts              # Tailwind utilities
│   │   ├── routes.ts                # Router setup
│   │   └── platform.ts              # Platform detection
│   │
│   ├── debug-console.html           # Debug console UI
│   └── debug-console-preload.ts     # Debug console preload
│
├── index.html                       # HTML entry point
├── vite.config.mts                  # Vite configuration
├── vitest.config.ts                 # Vitest configuration
├── playwright.config.ts             # Playwright configuration
├── tsconfig.json                    # TypeScript configuration
├── eslint.config.mjs                # ESLint configuration
├── components.json                  # shadcn-ui configuration
├── package.json                     # Project metadata
│
├── docs/                            # Documentation
│   └── CHANGELOG.md                 # Example release notes format
│
├── README.md                        # This file
└── TEMPLATE_SETUP.md                # Customization guide
```

## 🎨 Customization

See [TEMPLATE_SETUP.md](./TEMPLATE_SETUP.md) for a comprehensive guide on customizing this template for your project.

### Quick Customization Steps

1. **Update App Config**: Edit `src/config/app.config.ts` with your app name, titles, and IDs (single source of truth!)
2. **Update package.json**: Match the values from app.config.ts for productName, appId, etc.
3. **Replace Icon**: Put your icon in `src/assets/icon.ico`
4. **Add Routes**: Create new files in `src/routes/`
5. **Customize Theme**: Modify colors in `src/styles/global.css`

## 🔧 IPC Communication Pattern

This template uses a structured IPC pattern:

```
src/helpers/ipc/
└── feature/
    ├── feature-channels.ts    # Channel name constants
    ├── feature-context.ts     # contextBridge exposure
    └── feature-listeners.ts   # ipcMain handlers
```

To add a new IPC feature, see the [IPC section in TEMPLATE_SETUP.md](./TEMPLATE_SETUP.md#5-add-custom-ipc-channels).

## 🐛 Debug Mode

Enable powerful debugging features:

```bash
# Development
pnpm run start:debug

# Production
your-app.exe --debug
```

**Features:**
- Separate debug console window
- Colored, categorized logs
- Auto-open DevTools
- Persistent debug logs

## 🔄 Auto-Update System

This template includes a sophisticated auto-update system with a custom UI that shows release notes, download progress, and a changelog history viewer.

### Features

- **Custom Update Dialog** - Beautiful UI with release notes in Markdown
- **User-Controlled Downloads** - User decides when to download (not automatic)
- **Download Progress** - Real-time progress bar with speed and ETA
- **Changelog History** - Button in navbar to browse all GitHub releases
- **Multi-format Support** - Renders both Markdown and HTML release notes

### Configuration

Update `src/config/app.config.ts` with your GitHub repository:

```typescript
export const GITHUB_CONFIG = {
  owner: "yourusername",
  repo: "your-repo",
};
```

Also update `package.json` build.publish section:

```json
"publish": {
  "provider": "github",
  "owner": "yourusername",
  "repo": "your-repo"
}
```

### Testing the Update UI

In development mode, you can simulate the update flow using DevTools console:

```javascript
// Show update available dialog with mock release notes
window.updaterAPI._testShowUpdate()

// Simulate full download flow (progress bar + completion)
window.updaterAPI._testSimulateDownload()
```

This allows you to test and style the update UI without publishing actual releases.

### Update Flow

1. **Check for Updates** - Automatic check 3 seconds after launch, then hourly
2. **Update Available** - Dialog appears with version info and release notes
3. **Download** - User clicks "Download", progress bar shows status
4. **Install** - After download, user can install now or later (installs on quit)

### Writing Release Notes

Create release notes in Markdown format when publishing GitHub releases. The system supports:

- Headers (`#`, `##`, `###`)
- Lists (bulleted and numbered)
- Code blocks and inline code
- Bold, italic, and links
- All standard Markdown syntax

See [docs/CHANGELOG.md](./docs/CHANGELOG.md) for an example format.

## 🧪 Testing

```bash
# Unit tests (Vitest)
pnpm test                  # Run once
pnpm run test:watch        # Watch mode

# E2E tests (Playwright)
pnpm run dist:dir          # Build first
pnpm run test:e2e          # Run E2E tests

# All tests
pnpm run test:all
```

## 📦 Building & Distribution

### Development Build

```bash
pnpm run dist:dir
```

Outputs to `release/` without creating installer (fast for testing).

### Production Build

```bash
pnpm run dist
```

Creates NSIS installer in `release/`.

### Publishing to GitHub Releases

```bash
# Set GitHub token
export GH_TOKEN=your_github_token

# Build and publish
pnpm run publish
```

Auto-updater will use GitHub Releases to distribute updates.

## 🔐 Security

- **Context Isolation**: Enabled by default
- **Node Integration**: Limited to preload scripts
- **CSP**: Content Security Policy configured
- **contextBridge**: All APIs exposed via secure bridge
- **No Remote Module**: Modern IPC patterns only

## 🌐 Browser Support

- **Chromium** (Electron's engine)
- React 19 features enabled
- Modern JavaScript (ES2022+)
- No polyfills needed

## 📝 Scripts Reference

| Script | Description |
|--------|-------------|
| `pnpm start` | Start development server |
| `pnpm run start:debug` | Start with debug console |
| `pnpm run build` | Build for production (no packaging) |
| `pnpm run dist:dir` | Build and package (no installer) |
| `pnpm run dist` | Build with installer |
| `pnpm run publish` | Build and publish to GitHub |
| `pnpm test` | Run unit tests once |
| `pnpm run test:watch` | Run tests in watch mode |
| `pnpm run test:e2e` | Run E2E tests |
| `pnpm run test:all` | Run all tests |
| `pnpm run lint` | Lint code |
| `pnpm run format` | Check formatting |
| `pnpm run format:write` | Format code |

## 🤝 Contributing

This is a template repository. Feel free to:
- Fork and modify for your needs
- Submit issues for bugs or improvements
- Share your projects built with this template

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

Built with these amazing technologies:
- [Electron](https://electronjs.org)
- [React](https://react.dev)
- [TypeScript](https://www.typescriptlang.org)
- [Vite](https://vitejs.dev)
- [shadcn-ui](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)
- [TanStack Router](https://tanstack.com/router)
- [i18next](https://i18next.com)
- [Vitest](https://vitest.dev)
- [Playwright](https://playwright.dev)

## 📦 Package Manager

This template uses **pnpm** for better performance and peer dependency handling. See [PNPM_MIGRATION.md](./PNPM_MIGRATION.md) for details on why and how to use it.

**Benefits:**
- ⚡ 2-3x faster installs
- 💾 50% less disk space
- 🔧 Auto-installs peer dependencies (no more `--force`!)
- 🏗️ Monorepo-ready with workspaces

## 📞 Support

- Report bugs via [GitHub Issues](https://github.com/yourusername/electron-starter-template/issues)
- Read [TEMPLATE_SETUP.md](./TEMPLATE_SETUP.md) for detailed guidance
- Read [PNPM_MIGRATION.md](./PNPM_MIGRATION.md) for pnpm details
- Check [Electron docs](https://electronjs.org/docs) for framework questions

---

**Ready to build something amazing? Start customizing!** 🚀

See [TEMPLATE_SETUP.md](./TEMPLATE_SETUP.md) for your next steps.
