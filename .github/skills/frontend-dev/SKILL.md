# PrepRabbit Frontend Development Skill

## Purpose
Expert frontend development for PrepRabbit's Next.js/React applications with emphasis on educational UX, auth integration, and data visualization.

## When to Apply
Activate this skill when working on:
- Next.js App Router pages (`src/app/*`)
- React components (`src/components/*`)
- UI/UX for learning features
- Authentication flows
- Data visualization (D3.js, React Flow, Vega-Lite)
- Tailwind CSS styling
- TypeScript interfaces
- Playwright E2E tests

## Core Philosophy

### Non-Negotiables
1. **Education-First UX** - Every interface teaches Spark concepts
2. **Type Safety** - Full TypeScript coverage, no `any` types
3. **Accessibility** - WCAG 2.1 AA compliance minimum
4. **Performance** - Lighthouse score >90 on all metrics
5. **Responsive Design** - Mobile-first approach
6. **Testing** - E2E tests for critical user flows

### Architecture Principles
- **Server Components First**: Use client components only when needed (interactivity, hooks)
- **Progressive Enhancement**: Core features work without JavaScript
- **Cookie-Based Auth**: HttpOnly cookies for security, shared across *.preprabbit.in
- **Static Optimization**: Pre-render educational content when possible
- **Component Composition**: Small, reusable, single-purpose components

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14+ | React framework (App Router) |
| React | 18+ | UI library |
| TypeScript | 5+ | Type safety |
| Tailwind CSS | 3+ | Utility-first styling |
| shadcn/ui | Latest | Component library |
| D3.js | 7+ | DAG visualization |
| React Flow | 11+ | Interactive node graphs |
| Vega-Lite | 5+ | Declarative charts |
| Playwright | Latest | E2E testing |

---

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Landing page
│   │   ├── learn/              # Learning paths
│   │   ├── playground/         # DataFrame simulator
│   │   ├── scenarios/          # Real-life scenarios
│   │   └── auth/               # Auth callback
│   ├── components/             # React components
│   │   ├── NavBar.tsx
│   │   ├── AuthButton.tsx
│   │   ├── DAGVisualization.tsx
│   │   └── ...
│   ├── contexts/               # React Context providers
│   │   └── AuthContext.tsx
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utilities
│   │   └── api.ts              # API client
│   └── types/                  # TypeScript interfaces
│       └── index.ts
├── public/                     # Static assets
├── e2e/                        # Playwright tests
└── tailwind.config.js
```

---

## Component Patterns

### 1. Server Component (Default)

```typescript
// src/app/scenarios/page.tsx
import { ScenarioCard } from '@/components/ScenarioCard'

export const metadata = {
  title: 'Spark Scenarios | PrepRabbit',
  description: 'Real-world Spark optimization challenges'
}

export default async function ScenariosPage() {
  // Can fetch data directly (server-side)
  const scenarios = await fetch('http://backend:8000/api/scenarios', {
    cache: 'force-cache'  // Static optimization
  }).then(r => r.json())
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">
        Real-Life Scenarios
      </h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {scenarios.map((scenario) => (
          <ScenarioCard key={scenario.id} scenario={scenario} />
        ))}
      </div>
    </div>
  )
}
```

### 2. Client Component (Interactive)

```typescript
// src/components/DAGVisualization.tsx
'use client'

import { useEffect, useState } from 'react'
import ReactFlow, { Node, Edge } from 'reactflow'
import type { DAGNode, DAGEdge } from '@/types'

interface DAGVisualizationProps {
  dag: {
    nodes: DAGNode[]
    edges: DAGEdge[]
  }
  onNodeClick?: (nodeId: string) => void
}

export function DAGVisualization({ dag, onNodeClick }: DAGVisualizationProps) {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  
  useEffect(() => {
    // Transform backend DAG to React Flow format
    const flowNodes: Node[] = dag.nodes.map(node => ({
      id: node.id,
      type: node.type === 'shuffle' ? 'shuffleNode' : 'defaultNode',
      position: { x: node.x, y: node.y },
      data: { 
        label: node.name,
        metrics: node.metrics,
        isShuffle: node.type === 'shuffle'
      }
    }))
    
    const flowEdges: Edge[] = dag.edges.map(edge => ({
      id: `${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      animated: edge.isShuffle,
      label: edge.shuffleBytes ? formatBytes(edge.shuffleBytes) : undefined
    }))
    
    setNodes(flowNodes)
    setEdges(flowEdges)
  }, [dag])
  
  return (
    <div className="h-[600px] border rounded-lg bg-slate-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={(event, node) => onNodeClick?.(node.id)}
        fitView
      />
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`
}
```

### 3. Auth-Protected Component

```typescript
// src/components/LearningPath.tsx
'use client'

import { useAuth } from '@/contexts/AuthContext'
import { LoginPrompt } from '@/components/LoginPrompt'

export function LearningPath() {
  const { user, isLoading } = useAuth()
  
  if (isLoading) {
    return <LoadingSpinner />
  }
  
  if (!user) {
    return (
      <LoginPrompt 
        message="Sign in to track your learning progress"
        feature="Learning Paths"
      />
    )
  }
  
  return (
    <div>
      <h2>Welcome back, {user.name}!</h2>
      {/* Learning path components */}
    </div>
  )
}
```

---

## TypeScript Patterns

### Interface Definitions

```typescript
// src/types/index.ts

// API Response Types
export interface DAGNode {
  id: string
  name: string
  type: 'map' | 'shuffle' | 'reduce' | 'source' | 'sink'
  x: number
  y: number
  metrics: {
    duration_ms: number
    input_bytes: number
    output_bytes: number
  }
}

export interface DAGEdge {
  source: string
  target: string
  isShuffle: boolean
  shuffleBytes?: number
}

export interface Insight {
  type: 'shuffle_boundary' | 'data_skew' | 'broadcast_join' | 'partition_count'
  title: string
  description: string
  evidence: Record<string, unknown>
  confidence: 'high' | 'medium' | 'low'
  suggestion: string | null
  spark_docs_ref: string | null
}

export interface AnalysisResult {
  dag: {
    nodes: DAGNode[]
    edges: DAGEdge[]
  }
  insights: Insight[]
  stats: {
    total_jobs: number
    total_stages: number
    total_tasks: number
  }
}

// Auth Types
export interface User {
  id: string
  email: string
  name: string
  picture: string
}

export interface UserProgress {
  completed_tutorials: string[]
  completed_scenarios: string[]
  achievements: string[]
  total_points: number
}
```

### Type-Safe API Client

```typescript
// src/lib/api.ts
import type { AnalysisResult, User, UserProgress } from '@/types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

class APIClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      credentials: 'include',  // Include cookies
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
      throw new Error(error.detail || `HTTP ${response.status}`)
    }
    
    return response.json()
  }
  
  async uploadEventLog(file: File): Promise<AnalysisResult> {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await fetch(`${API_BASE}/api/upload/event-log`, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    })
    
    if (!response.ok) throw new Error('Upload failed')
    return response.json()
  }
  
  async getCurrentUser(): Promise<User | null> {
    return this.request<User>('/api/auth/me').catch(() => null)
  }
  
  async getUserProgress(): Promise<UserProgress | null> {
    return this.request<UserProgress>('/api/progress').catch(() => null)
  }
  
  async logout(): Promise<void> {
    await this.request('/api/auth/logout', { method: 'POST' })
  }
}

export const api = new APIClient()
```

---

## Styling Guidelines

### Tailwind Best Practices

```typescript
// ✅ DO: Use semantic class groups
<button className="
  px-4 py-2 
  bg-blue-600 hover:bg-blue-700 
  text-white font-medium 
  rounded-lg shadow-sm
  transition-colors duration-200
  disabled:opacity-50 disabled:cursor-not-allowed
">
  Analyze
</button>

// ✅ DO: Extract repeated patterns to components
// src/components/ui/button.tsx (shadcn/ui)
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({ 
  variant = 'default', 
  size = 'md',
  className,
  ...props 
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
        {
          'bg-blue-600 text-white hover:bg-blue-700': variant === 'default',
          'border border-gray-300 hover:bg-gray-50': variant === 'outline',
          'hover:bg-gray-100': variant === 'ghost',
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-4 py-2 text-base': size === 'md',
          'px-6 py-3 text-lg': size === 'lg'
        },
        className
      )}
      {...props}
    />
  )
}
```

### Responsive Design

```typescript
// Mobile-first approach
<div className="
  grid
  grid-cols-1           sm:grid-cols-2        md:grid-cols-3
  gap-4                 sm:gap-6              md:gap-8
  px-4                  sm:px-6               lg:px-8
  text-sm               md:text-base
">
  {/* Content */}
</div>
```

### Dark Mode Support

```typescript
// Use Tailwind's dark: prefix
<div className="
  bg-white dark:bg-gray-900
  text-gray-900 dark:text-gray-100
  border border-gray-200 dark:border-gray-700
">
  {/* Content adapts to theme */}
</div>
```

---

## Auth Integration

### Context Provider

```typescript
// src/contexts/AuthContext.tsx
'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { api } from '@/lib/api'
import type { User } from '@/types'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: () => void
  logout: () => Promise<void>
  refetch: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  async function checkAuth() {
    setIsLoading(true)
    const userData = await api.getCurrentUser()
    setUser(userData)
    setIsLoading(false)
  }
  
  useEffect(() => {
    checkAuth()
  }, [])
  
  function login() {
    const currentUrl = encodeURIComponent(window.location.href)
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/login?redirect_back=${currentUrl}`
  }
  
  async function logout() {
    await api.logout()
    setUser(null)
    window.location.href = '/'
  }
  
  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refetch: checkAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
```

### Protected Route Pattern

```typescript
// src/app/learn/page.tsx
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

async function getUser() {
  const cookieStore = cookies()
  const token = cookieStore.get('access_token')
  
  if (!token) return null
  
  // Verify token server-side
  const res = await fetch(`${process.env.API_URL}/api/auth/me`, {
    headers: { Cookie: `access_token=${token.value}` }
  })
  
  if (!res.ok) return null
  return res.json()
}

export default async function LearnPage() {
  const user = await getUser()
  
  if (!user) {
    redirect('/login')
  }
  
  return <LearningDashboard user={user} />
}
```

---

## Data Visualization

### D3.js Pattern

```typescript
// src/components/TimelineChart.tsx
'use client'

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import type { TaskMetric } from '@/types'

interface TimelineChartProps {
  tasks: TaskMetric[]
}

export function TimelineChart({ tasks }: TimelineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  
  useEffect(() => {
    if (!svgRef.current || tasks.length === 0) return
    
    const svg = d3.select(svgRef.current)
    const width = 800
    const height = 400
    const margin = { top: 20, right: 30, bottom: 30, left: 40 }
    
    // Clear previous render
    svg.selectAll('*').remove()
    
    // Scales
    const xScale = d3.scaleLinear()
      .domain([0, d3.max(tasks, d => d.end_time) || 0])
      .range([margin.left, width - margin.right])
    
    const yScale = d3.scaleBand()
      .domain(tasks.map((_, i) => i.toString()))
      .range([margin.top, height - margin.bottom])
      .padding(0.1)
    
    // Bars
    svg.append('g')
      .selectAll('rect')
      .data(tasks)
      .join('rect')
      .attr('x', d => xScale(d.start_time))
      .attr('y', (_, i) => yScale(i.toString()) || 0)
      .attr('width', d => xScale(d.end_time) - xScale(d.start_time))
      .attr('height', yScale.bandwidth())
      .attr('fill', d => d.is_shuffle ? '#ef4444' : '#3b82f6')
      .attr('opacity', 0.8)
    
    // Axes
    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xScale))
    
  }, [tasks])
  
  return (
    <svg 
      ref={svgRef} 
      width="100%" 
      height="400" 
      viewBox="0 0 800 400"
      className="border rounded-lg bg-white"
    />
  )
}
```

---

## Testing Patterns

### Playwright E2E Test

```typescript
// e2e/upload_page.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Event Log Upload Flow', () => {
  test('should upload event log and display DAG', async ({ page }) => {
    // Navigate to upload page
    await page.goto('http://localhost:3000/upload')
    
    // Upload file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('tests/fixtures/sample_event_log.json')
    
    // Click analyze button
    const analyzeButton = page.getByRole('button', { name: /analyze/i })
    await analyzeButton.click()
    
    // Wait for analysis to complete
    await page.waitForSelector('[data-testid="dag-visualization"]', {
      timeout: 5000
    })
    
    // Verify insights appear
    const insights = page.locator('[data-testid="insight-card"]')
    await expect(insights).toHaveCount(3)  // Expected number based on fixture
    
    // Verify DAG nodes
    const dagNodes = page.locator('.react-flow__node')
    await expect(dagNodes.first()).toBeVisible()
    
    // Check insight details
    const firstInsight = insights.first()
    await expect(firstInsight).toContainText('shuffle')
    await expect(firstInsight).toContainText('confidence')
  })
  
  test('should handle auth-required features', async ({ page }) => {
    await page.goto('http://localhost:3000/learn')
    
    // Should show login prompt
    const loginPrompt = page.getByText(/sign in to track/i)
    await expect(loginPrompt).toBeVisible()
    
    // Click login button
    await page.getByRole('button', { name: /sign in/i }).click()
    
    // Should redirect to OAuth
    await expect(page).toHaveURL(/accounts\.google\.com/)
  })
})
```

---

## Environment Configuration

### .env.local

```bash
# API Connection
NEXT_PUBLIC_API_URL=http://localhost:8000

# Auth
NEXT_PUBLIC_COOKIE_DOMAIN=localhost

# Feature Flags
NEXT_PUBLIC_ENABLE_DEMO_MODE=true
NEXT_PUBLIC_ENABLE_TUTORIALS=true
```

### Production (.env.production)

```bash
NEXT_PUBLIC_API_URL=https://api.spark.preprabbit.in
NEXT_PUBLIC_COOKIE_DOMAIN=.preprabbit.in
NEXT_PUBLIC_ENABLE_DEMO_MODE=false
```

---

## Common Patterns & Anti-Patterns

### ✅ DO

```typescript
// Type-safe props
interface CardProps {
  title: string
  children: React.ReactNode
  className?: string
}

// Accessible components
<button 
  aria-label="Close dialog"
  aria-pressed={isOpen}
>

// Loading states
{isLoading ? <Skeleton /> : <Content />}

// Error boundaries
<ErrorBoundary fallback={<ErrorFallback />}>
  <Component />
</ErrorBoundary>
```

### ❌ DON'T

```typescript
// ❌ Using 'any' type
function handleClick(data: any) { }

// ❌ Client component when not needed
'use client'
export default function StaticPage() { }

// ❌ Hardcoded API URLs
fetch('http://localhost:8000/api/...')

// ❌ Missing accessibility
<div onClick={...}>  // Use <button> instead

// ❌ Inline styles (use Tailwind)
<div style={{ color: 'red' }}>
```

---

## Performance Optimization

### Image Optimization

```typescript
import Image from 'next/image'

<Image
  src="/spark-logo.png"
  alt="Spark Sword Logo"
  width={200}
  height={200}
  priority  // For LCP images
/>
```

### Code Splitting

```typescript
import dynamic from 'next/dynamic'

// Lazy load heavy visualization
const DAGVisualization = dynamic(
  () => import('@/components/DAGVisualization'),
  { 
    loading: () => <LoadingSpinner />,
    ssr: false  // Disable SSR for client-only libraries
  }
)
```

### React Query (Optional)

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function ScenarioList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['scenarios'],
    queryFn: () => api.getScenarios(),
    staleTime: 5 * 60 * 1000  // Cache for 5 minutes
  })
  
  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />
  
  return (
    <div>
      {data?.map(scenario => (
        <ScenarioCard key={scenario.id} scenario={scenario} />
      ))}
    </div>
  )
}
```

---

## Pre-Commit Checklist

Before committing frontend code:

- [ ] All TypeScript errors resolved (`npm run build`)
- [ ] No `any` types used
- [ ] Components have proper accessibility attributes
- [ ] Responsive design tested (mobile, tablet, desktop)
- [ ] Loading and error states implemented
- [ ] E2E tests pass (`npx playwright test`)
- [ ] Lighthouse score >90 on all metrics
- [ ] No hardcoded URLs (use environment variables)
- [ ] Images optimized using Next.js Image component
- [ ] Dark mode considered (if applicable)

---

## Development Workflow

### Starting Frontend

```bash
cd /home/soloengine/Github/spark-sword/frontend

# Install dependencies
npm install

# Run dev server
npm run dev

# Open http://localhost:3000
```

### Running Tests

```bash
# Type checking
npm run type-check

# Build (catches type errors)
npm run build

# E2E tests
npx playwright test

# Specific test
npx playwright test e2e/upload_page.spec.ts

# UI mode (interactive)
npx playwright test --ui
```

---

## Educational UX Principles

### Progressive Disclosure

```typescript
// Start simple, reveal complexity on demand
<Card>
  <CardHeader>
    <h3>Shuffle Detected</h3>
    <Badge>High Confidence</Badge>
  </CardHeader>
  <CardContent>
    <p>Stage 2 reads 1.2GB of shuffled data</p>
    <Accordion>
      <AccordionItem value="why">
        <AccordionTrigger>Why does this happen?</AccordionTrigger>
        <AccordionContent>
          GroupBy operations require Spark to repartition data...
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="impact">
        <AccordionTrigger>What's the impact?</AccordionTrigger>
        <AccordionContent>
          Shuffles involve disk I/O and network transfer...
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </CardContent>
</Card>
```

### Interactive Learning

```typescript
// Let users experiment
<ShapePlayground>
  <ConfigPanel>
    <Slider 
      label="Input Partitions" 
      value={partitions} 
      onChange={setPartitions}
      min={1}
      max={1000}
    />
    <Select
      label="Operation"
      value={operation}
      onChange={setOperation}
      options={['map', 'filter', 'groupBy', 'join']}
    />
  </ConfigPanel>
  <PredictionPanel>
    <Metric label="Estimated Shuffle" value={estimatedShuffle} />
    <Metric label="Output Partitions" value={outputPartitions} />
  </PredictionPanel>
</ShapePlayground>
```

---

## References

- [Next.js Documentation](https://nextjs.org/docs)
- [React Best Practices](https://react.dev/learn)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [D3.js Gallery](https://d3-graph-gallery.com/)
- [Playwright Documentation](https://playwright.dev/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
