# Frontend

See parent [README.md](../README.md) for project overview.

## Development Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run E2E tests
npx playwright install
npm run test
```

## Tech Stack

- **Next.js 14** - React framework with App Router
- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Flow** - DAG visualization
- **D3.js** - Charts and data visualization
- **Vega-Lite** - Declarative visualization
- **Playwright** - E2E testing

## Project Structure

```
src/
├── app/           # Next.js App Router pages
├── components/    # React components
├── lib/           # Utilities and API client
└── types/         # TypeScript type definitions
e2e/               # Playwright E2E tests
```
