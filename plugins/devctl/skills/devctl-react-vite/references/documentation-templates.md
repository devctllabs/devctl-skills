# Documentation Templates

Includes documentation standards and reusable feature documentation templates.

## Contents

- Documentation Standards
  - File Structure for Documentation
  - Template: README.md (Feature Documentation)
  - Template: CHANGELOG.md
  - Template: API.md
  - Template: COMPONENTS.md
  - Template: TROUBLESHOOTING.md

## Documentation Standards

### File Structure for Documentation

Every feature module should maintain these documentation files:

```
features/[feature-name]/
|-- README.md              # Main feature documentation
|-- CHANGELOG.md           # Feature version history
|-- API.md                 # API endpoints documentation
|-- COMPONENTS.md          # Component documentation
`-- TROUBLESHOOTING.md     # Common issues & solutions
```

---

### Template: README.md (Feature Documentation)

```markdown
# [Feature Name] Module

> Brief description of what this feature does and its purpose

## Table of Contents
- [Overview](#overview)
- [Installation](#installation)
- [Features](#features)
- [Usage](#usage)
- [Components](#components)
- [Hooks](#hooks)
- [API](#api)
- [Types](#types)
- [Examples](#examples)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## Overview

### Purpose
Explain what this feature does and why it exists.

### Key Features
- [ ] Feature 1 description
- [ ] Feature 2 description
- [ ] Feature 3 description

### Dependencies
```json
{
  "@tanstack/react-query": "^5.0.0",
  "axios": "^1.6.0"
}
```

---

## Installation

```bash
# No additional installation required
# This module is part of the main application
```

### Environment Variables
```bash
# Required environment variables
VITE_API_URL=http://localhost:3000
VITE_FEATURE_ENABLED=true
```

---

## Features

### Feature 1: [Name]
Description of what this feature does and how it works.

### Feature 2: [Name]
Description of what this feature does and how it works.

---

## Usage

### Basic Usage

```typescript
import { FeaturePage, useFeatureData } from '@features/feature-name';

function App() {
  return <FeaturePage />;
}
```

### Advanced Usage

```typescript
import { useFeatureData, useFeatureActions } from '@features/feature-name';
import type { Feature } from '@features/feature-name';

function CustomComponent() {
  const { data, isLoading } = useFeatureData();
  const { create, update, delete: remove } = useFeatureActions();

  const handleCreate = async (data: CreateFeatureDto) => {
    await create(data);
  };

  return (
    <div>
      {/* Your component JSX */}
    </div>
  );
}
```

---

## Components

### `FeatureList`
Displays a list of feature items.

**Props:**
```typescript
interface FeatureListProps {
  items: Feature[];
  onSelect?: (item: Feature) => void;
  onDelete?: (id: string) => void;
  loading?: boolean;
}
```

**Example:**
```typescript
<FeatureList
  items={features}
  onSelect={handleSelect}
  onDelete={handleDelete}
/>
```

### `FeatureForm`
Form component for creating/editing features.

**Props:**
```typescript
interface FeatureFormProps {
  initialData?: Feature;
  onSubmit: (data: CreateFeatureDto) => Promise<void>;
  onCancel?: () => void;
}
```

**Example:**
```typescript
<FeatureForm
  initialData={feature}
  onSubmit={handleSubmit}
/>
```

---

## Hooks

### `useFeatureData(filters?)`
Fetches feature data with optional filters.

**Parameters:**
- `filters` (optional): Filter parameters

**Returns:**
```typescript
{
  data: Feature[] | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}
```

**Example:**
```typescript
const { data, isLoading, error } = useFeatureData({
  status: 'active',
  category: 'electronics'
});
```

### `useCreateFeature()`
Mutation hook for creating new features.

**Returns:**
```typescript
{
  mutate: (data: CreateFeatureDto) => void;
  mutateAsync: (data: CreateFeatureDto) => Promise<Feature>;
  isLoading: boolean;
  error: Error | null;
}
```

**Example:**
```typescript
const { mutate, isLoading } = useCreateFeature();

mutate({ name: 'New Feature', description: 'Description' });
```

---

## API

### Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/features` | Get all features | Yes |
| GET | `/api/features/:id` | Get feature by ID | Yes |
| POST | `/api/features` | Create new feature | Yes |
| PUT | `/api/features/:id` | Update feature | Yes |
| DELETE | `/api/features/:id` | Delete feature | Yes |

### Request/Response Examples

**GET /api/features**
```typescript
// Request
GET /api/features?status=active&page=1&limit=10

// Response
{
  "success": true,
  "data": [
    {
      "id": "1",
      "name": "Feature 1",
      "status": "active",
      "createdAt": "2025-11-14T00:00:00Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 10
}
```

**POST /api/features**
```typescript
// Request
POST /api/features
Content-Type: application/json

{
  "name": "New Feature",
  "description": "Feature description",
  "category": "electronics"
}

// Response
{
  "success": true,
  "data": {
    "id": "2",
    "name": "New Feature",
    "description": "Feature description",
    "category": "electronics",
    "createdAt": "2025-11-14T00:00:00Z"
  }
}
```

---

## Types

### Core Types

```typescript
interface Feature {
  id: string;
  name: string;
  description: string;
  category: string;
  status: FeatureStatus;
  createdAt: string;
  updatedAt: string;
}

enum FeatureStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

interface CreateFeatureDto {
  name: string;
  description: string;
  category: string;
}

type UpdateFeatureDto = Partial<CreateFeatureDto>;

interface FeatureFilters {
  status?: FeatureStatus;
  category?: string;
  search?: string;
}
```

---

## Examples

### Complete CRUD Example

```typescript
import { FC, useState } from 'react';
import {
  useFeatureData,
  useCreateFeature,
  useUpdateFeature,
  useDeleteFeature,
  type Feature
} from '@features/feature-name';

const FeatureManagement: FC = () => {
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);

  const { data: features, isLoading } = useFeatureData();
  const createMutation = useCreateFeature();
  const updateMutation = useUpdateFeature();
  const deleteMutation = useDeleteFeature();

  const handleCreate = async (data: CreateFeatureDto) => {
    await createMutation.mutateAsync(data);
  };

  const handleUpdate = async (id: string, data: UpdateFeatureDto) => {
    await updateMutation.mutateAsync({ id, data });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <FeatureForm onSubmit={handleCreate} />
      <FeatureList
        items={features || []}
        onEdit={setSelectedFeature}
        onDelete={handleDelete}
      />
    </div>
  );
};
```

---

## Testing

### Running Tests
Command examples assume `pnpm` for new projects. For existing projects, use the package manager indicated by the lockfile.

```bash
# Run all tests
pnpm test

# Run feature-specific tests
pnpm test -- features/feature-name

# Run with coverage
pnpm test -- --coverage
```

### Test Examples

```typescript
// features/feature-name/hooks/useFeatureData.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFeatureData } from './useFeatureData';

describe('useFeatureData', () => {
  it('fetches features successfully', async () => {
    const { result } = renderHook(() => useFeatureData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(Array.isArray(result.current.data)).toBe(true);
  });
});
```

---

## Troubleshooting

### Common Issues

**Issue: Data not loading**
```typescript
// Check if API URL is correct
console.log(import.meta.env.VITE_API_URL);

// Verify authentication token
console.log(localStorage.getItem('token'));
```

**Issue: Type errors**
```bash
# Clear TypeScript cache
rm -rf node_modules/.vite
pnpm dev
```

---

## Contributing

### Adding New Features
1. Create feature branch: `git checkout -b feature/new-feature`
2. Implement changes
3. Add tests
4. Update documentation
5. Submit pull request

### Code Style
Follow the project's ESLint and Prettier configurations.

---

## License
MIT

## Authors
- Development Team

## Support
For issues and questions, please open an issue on GitHub.

---

**Last Updated:** November 2025
**Version:** 1.0.0
```

---

### Template: CHANGELOG.md

```markdown
# Changelog

All notable changes to this feature will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- New features that are in development

### Changed
- Changes in existing functionality

### Deprecated
- Soon-to-be removed features

### Removed
- Removed features

### Fixed
- Bug fixes

### Security
- Security improvements

---

## [1.0.0] - 2025-11-14

### Added
- Initial release
- Feature list component
- Feature form component
- CRUD operations
- API integration
- TypeScript support
- Unit tests
- Documentation

### Features
- [ ] Create features
- [ ] Read/List features
- [ ] Update features
- [ ] Delete features
- [ ] Filter and search
- [ ] Pagination support

---

## [0.2.0] - 2025-11-10

### Added
- Feature filtering functionality
- Search capability
- Pagination component

### Changed
- Improved error handling
- Updated UI components
- Optimized API calls

### Fixed
- Fixed pagination bug
- Resolved type errors
- Fixed form validation issues

---

## [0.1.0] - 2025-11-01

### Added
- Basic feature structure
- Initial components
- Basic API integration

---

## Version History

- **1.0.0** - Production release with full features
- **0.2.0** - Beta release with filtering and search
- **0.1.0** - Alpha release with basic functionality

---

**Note:** For detailed commit history, see the git log.
```

---

### Template: API.md

```markdown
# API Documentation - [Feature Name]

## Base URL
```
Production: https://api.example.com
Staging: https://staging-api.example.com
Development: http://localhost:3000
```

## Authentication
All API requests require authentication using Bearer token.

```typescript
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json
```

---

## Endpoints

### List Features

**GET** `/api/features`

Retrieve a paginated list of features.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 10) |
| status | string | No | Filter by status (active, inactive, archived) |
| category | string | No | Filter by category |
| search | string | No | Search in name and description |
| sort | string | No | Sort field (name, createdAt) |
| order | string | No | Sort order (asc, desc) |

**Request Example:**
```bash
curl -X GET \
  'https://api.example.com/api/features?page=1&limit=10&status=active' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "name": "Feature 1",
      "description": "Description here",
      "category": "electronics",
      "status": "active",
      "createdAt": "2025-11-14T10:00:00Z",
      "updatedAt": "2025-11-14T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Invalid query parameters",
  "message": "Page must be a positive number"
}
```

---

### Get Feature by ID

**GET** `/api/features/:id`

Retrieve a single feature by ID.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Feature ID |

**Request Example:**
```bash
curl -X GET \
  'https://api.example.com/api/features/uuid-1' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-1",
    "name": "Feature 1",
    "description": "Detailed description",
    "category": "electronics",
    "status": "active",
    "metadata": {
      "views": 1234,
      "likes": 56
    },
    "createdAt": "2025-11-14T10:00:00Z",
    "updatedAt": "2025-11-14T10:00:00Z"
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "error": "Not Found",
  "message": "Feature with ID uuid-1 not found"
}
```

---

### Create Feature

**POST** `/api/features`

Create a new feature.

**Request Body:**
```typescript
{
  name: string;          // Required, 3-100 characters
  description: string;   // Required, max 500 characters
  category: string;      // Required
  status?: string;       // Optional, defaults to 'active'
}
```

**Request Example:**
```bash
curl -X POST \
  'https://api.example.com/api/features' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "New Feature",
    "description": "This is a new feature",
    "category": "electronics"
  }'
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Feature created successfully",
  "data": {
    "id": "uuid-2",
    "name": "New Feature",
    "description": "This is a new feature",
    "category": "electronics",
    "status": "active",
    "createdAt": "2025-11-14T11:00:00Z",
    "updatedAt": "2025-11-14T11:00:00Z"
  }
}
```

**Error Response (422 Unprocessable Entity):**
```json
{
  "success": false,
  "error": "Validation Error",
  "message": "Validation failed",
  "errors": {
    "name": ["Name is required", "Name must be at least 3 characters"],
    "category": ["Category is required"]
  }
}
```

---

### Update Feature

**PUT** `/api/features/:id`

Update an existing feature.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Feature ID |

**Request Body:**
```typescript
{
  name?: string;
  description?: string;
  category?: string;
  status?: 'active' | 'inactive' | 'archived';
}
```

**Request Example:**
```bash
curl -X PUT \
  'https://api.example.com/api/features/uuid-1' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Updated Feature Name",
    "status": "inactive"
  }'
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Feature updated successfully",
  "data": {
    "id": "uuid-1",
    "name": "Updated Feature Name",
    "description": "Description here",
    "category": "electronics",
    "status": "inactive",
    "createdAt": "2025-11-14T10:00:00Z",
    "updatedAt": "2025-11-14T12:00:00Z"
  }
}
```

---

### Delete Feature

**DELETE** `/api/features/:id`

Delete a feature.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Feature ID |

**Request Example:**
```bash
curl -X DELETE \
  'https://api.example.com/api/features/uuid-1' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Feature deleted successfully"
}
```

**Error Response (403 Forbidden):**
```json
{
  "success": false,
  "error": "Forbidden",
  "message": "You don't have permission to delete this feature"
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 422 | Unprocessable Entity - Validation error |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

---

## Rate Limiting

- **Rate Limit:** 100 requests per minute per user
- **Headers:**
  ```
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 95
  X-RateLimit-Reset: 1699999999
  ```

---

## Webhooks (Optional)

Subscribe to feature events.

**Events:**
- `feature.created`
- `feature.updated`
- `feature.deleted`

**Webhook Payload:**
```json
{
  "event": "feature.created",
  "timestamp": "2025-11-14T12:00:00Z",
  "data": {
    "id": "uuid-1",
    "name": "New Feature"
  }
}
```

---

**Version:** 1.0.0
**Last Updated:** November 2025
```

---

### Template: COMPONENTS.md

```markdown
# Components Documentation - [Feature Name]

## Overview
This document provides detailed documentation for all components in the [Feature Name] module.

---

## Component Architecture

```
components/
|-- FeatureList.tsx       # Main list component
|-- FeatureCard.tsx       # Individual item card
|-- FeatureForm.tsx       # Form for create/edit
|-- FeatureDetail.tsx     # Detail view
|-- FeatureFilters.tsx    # Filter controls
`-- index.ts              # Exports
```

---

## Components

### FeatureList

Main component for displaying a list of features.

**Location:** `components/FeatureList.tsx`

**Props:**
```typescript
interface FeatureListProps {
  items: Feature[];
  loading?: boolean;
  onSelect?: (feature: Feature) => void;
  onEdit?: (feature: Feature) => void;
  onDelete?: (id: string) => void;
  emptyMessage?: string;
}
```

**Usage:**
```typescript
import { FeatureList } from '@features/feature-name';

<FeatureList
  items={features}
  loading={isLoading}
  onSelect={handleSelect}
  onEdit={handleEdit}
  onDelete={handleDelete}
  emptyMessage="No features found"
/>
```

**Features:**
- [ ] Virtualized scrolling for large lists
- [ ] Loading states
- [ ] Empty state handling
- [ ] Responsive grid layout
- [ ] Accessibility support (ARIA labels)

**Accessibility:**
- Keyboard navigation support
- Screen reader friendly
- Focus management

---

### FeatureCard

Card component for displaying individual feature items.

**Location:** `components/FeatureCard.tsx`

**Props:**
```typescript
interface FeatureCardProps {
  feature: Feature;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}
```

**Usage:**
```typescript
import { FeatureCard } from '@features/feature-name';

<FeatureCard
  feature={feature}
  onClick={handleClick}
  onEdit={handleEdit}
  onDelete={handleDelete}
  showActions={true}
/>
```

**Variants:**
- Default: Full card with all information
- Compact: Minimal information
- List: Horizontal layout

---

### FeatureForm

Form component for creating and editing features.

**Location:** `components/FeatureForm.tsx`

**Props:**
```typescript
interface FeatureFormProps {
  initialData?: Feature;
  onSubmit: (data: CreateFeatureDto | UpdateFeatureDto) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  mode?: 'create' | 'edit';
}
```

**Usage:**
```typescript
import { FeatureForm } from '@features/feature-name';

// Create mode
<FeatureForm
  onSubmit={handleCreate}
  onCancel={handleCancel}
  mode="create"
/>

// Edit mode
<FeatureForm
  initialData={feature}
  onSubmit={handleUpdate}
  onCancel={handleCancel}
  mode="edit"
/>
```

**Features:**
- [ ] Form validation using Zod
- [ ] Error handling and display
- [ ] Loading states
- [ ] Auto-save draft (optional)
- [ ] Rich text editor support

**Validation Rules:**
```typescript
const schema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500),
  category: z.string().min(1),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
});
```

---

### FeatureDetail

Detailed view component for a single feature.

**Location:** `components/FeatureDetail.tsx`

**Props:**
```typescript
interface FeatureDetailProps {
  feature: Feature;
  loading?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onBack?: () => void;
}
```

**Usage:**
```typescript
import { FeatureDetail } from '@features/feature-name';

<FeatureDetail
  feature={feature}
  loading={isLoading}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onBack={handleBack}
/>
```

**Sections:**
- Header with title and actions
- Main content area
- Metadata sidebar
- Related items (optional)

---

### FeatureFilters

Filter controls component.

**Location:** `components/FeatureFilters.tsx`

**Props:**
```typescript
interface FeatureFiltersProps {
  filters: FeatureFilters;
  onChange: (filters: FeatureFilters) => void;
  onReset?: () => void;
}
```

**Usage:**
```typescript
import { FeatureFilters } from '@features/feature-name';

<FeatureFilters
  filters={filters}
  onChange={handleFilterChange}
  onReset={handleReset}
/>
```

**Filter Options:**
- Status dropdown
- Category selector
- Search input
- Date range picker
- Sort options

---

## Styling

### Tailwind Classes
Components use Tailwind CSS for styling. Common classes:

```typescript
// Card
className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"

// Button
className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"

// Input
className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2"
```

### Custom Styles
Located in `components/styles/` for component-specific styles.

---

## Component Composition Example

```typescript
import { FC } from 'react';
import {
  FeatureList,
  FeatureFilters,
  FeatureForm,
} from '@features/feature-name';

const FeatureManagementPage: FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <FeatureFilters
          filters={filters}
          onChange={setFilters}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <FeatureList
            items={features}
            loading={isLoading}
            onEdit={handleEdit}
          />
        </div>

        <div>
          <FeatureForm
            onSubmit={handleCreate}
            mode="create"
          />
        </div>
      </div>
    </div>
  );
};
```

---

## Testing Components

### Unit Tests
```typescript
// features/feature-name/components/FeatureCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { FeatureCard } from './FeatureCard';

describe('FeatureCard', () => {
  const mockFeature = {
    id: '1',
    name: 'Test Feature',
    description: 'Test description',
  };

  it('renders feature information', () => {
    render(<FeatureCard feature={mockFeature} />);
    expect(screen.getByText('Test Feature')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<FeatureCard feature={mockFeature} onClick={onClick} />);

    fireEvent.click(screen.getByText('Test Feature'));
    expect(onClick).toHaveBeenCalled();
  });
});
```

---

## Performance Optimization

### Memoization
```typescript
import { memo } from 'react';

export const FeatureCard = memo<FeatureCardProps>(({ feature, onClick }) => {
  // Component implementation
}, (prevProps, nextProps) => {
  return prevProps.feature.id === nextProps.feature.id;
});
```

### Lazy Loading
```typescript
import { lazy, Suspense } from 'react';

const FeatureDetail = lazy(() => import('./FeatureDetail'));

<Suspense fallback={<LoadingSpinner />}>
  <FeatureDetail feature={feature} />
</Suspense>
```

---

**Last Updated:** November 2025
**Maintained by:** Development Team
```

---

### Template: TROUBLESHOOTING.md

```markdown
# Troubleshooting Guide - [Feature Name]

## Common Issues and Solutions

---

## 1. Data Not Loading

### Symptoms
- List remains empty
- Loading spinner never disappears
- No error messages

### Possible Causes
1. API endpoint not configured
2. Authentication token missing or invalid
3. Network connectivity issues
4. CORS errors

### Solutions

**Check API Configuration:**
```typescript
// Verify environment variables
console.log('API URL:', import.meta.env.VITE_API_URL);
console.log('Environment:', import.meta.env.MODE);
```

**Check Authentication:**
```typescript
// Verify token exists
const token = localStorage.getItem('token');
console.log('Token:', token ? 'exists' : 'missing');
```

**Check Network Requests:**
```bash
# Open DevTools > Network tab
# Look for failed requests
# Check response status and error messages
```

**Fix CORS Issues:**
```typescript
// Backend: Add CORS headers
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

---

## 2. Form Validation Errors

### Symptoms
- Form won't submit
- Validation errors not displaying
- Input fields not validating

### Solutions

**Check Validation Schema:**
```typescript
import { z } from 'zod';

const schema = z.object({
  name: z.string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must not exceed 100 characters'),
  description: z.string()
    .max(500, 'Description must not exceed 500 characters'),
});

// Test schema
try {
  schema.parse({ name: 'ab' }); // Should throw error
} catch (error) {
  console.error('Validation error:', error);
}
```

**Debug Form State:**
```typescript
const { register, handleSubmit, formState: { errors } } = useForm();

console.log('Form errors:', errors);
console.log('Is valid:', Object.keys(errors).length === 0);
```

---

## 3. TypeScript Errors

### Symptoms
- Type errors in IDE
- Build failures
- Red squiggly lines everywhere

### Solutions

**Clear TypeScript Cache:**
```bash
# Delete cache directories
rm -rf node_modules/.vite
rm -rf dist

# Reinstall dependencies
pnpm install

# Restart dev server
pnpm dev
```

**Check Type Imports:**
```typescript
// Good: Use type import
import type { Feature } from '../types/feature.types';

// Avoid: Regular import for types
import { Feature } from '../types/feature.types';
```

**Regenerate Types:**
```bash
# If using API type generation
pnpm generate:types
```

---

## 4. State Not Updating

### Symptoms
- UI doesn't reflect data changes
- Mutations don't update the list
- Stale data displayed

### Solutions

**Check Query Invalidation:**
```typescript
const createMutation = useMutation({
  mutationFn: (data: CreateFeatureDto) =>
    unwrapDomainResult(featureService.create(data)),
  onSuccess: () => {
    // Good: Invalidate queries
    queryClient.invalidateQueries({ queryKey: ['features'] });
  },
});
```

**Force Refetch:**
```typescript
const { data, refetch } = useQuery({
  queryKey: ['features'],
  queryFn: () => unwrapDomainResult(featureService.getAll()),
});

// Manually refetch
refetch();
```

**Check React Query DevTools:**
```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<ReactQueryDevtools initialIsOpen={false} />
```

---

## 5. Performance Issues

### Symptoms
- Slow rendering
- Laggy interactions
- High memory usage

### Solutions

**Use React DevTools Profiler:**
```bash
# Install React DevTools browser extension
# Open DevTools > Profiler
# Record interaction
# Analyze component render times
```

**Optimize Re-renders:**
```typescript
import { memo, useCallback, useMemo } from 'react';

// Memoize expensive computations
const filteredData = useMemo(() => {
  return data.filter(item => item.status === 'active');
}, [data]);

// Memoize callbacks
const handleClick = useCallback(() => {
  console.log('clicked');
}, []);

// Memoize components
const MemoizedCard = memo(FeatureCard);
```

**Implement Virtualization:**
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

// For large lists (1000+ items)
const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 100,
});
```

---

## 6. API Errors

### Symptoms
- 400/500 errors
- Unexpected responses
- Timeout errors

### Solutions

**Check Error Handling:**
```typescript
try {
  const result = await featureService.create(data);
} catch (error) {
  if (error.response) {
    // Server responded with error
    console.error('Status:', error.response.status);
    console.error('Data:', error.response.data);
  } else if (error.request) {
    // No response received
    console.error('No response:', error.request);
  } else {
    // Error in request setup
    console.error('Error:', error.message);
  }
}
```

**Add Request/Response Interceptors:**
```typescript
// client.ts
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
    });
    return Promise.reject(error);
  }
);
```

---

## 7. Build Errors

### Symptoms
- Build fails
- Module not found errors
- Import errors

### Solutions

**Check Path Aliases:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@features/*": ["./src/features/*"]
    }
  }
}
```

```typescript
// vite.config.ts
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@features': path.resolve(__dirname, './src/features'),
    },
  },
});
```

**Clear Build Cache:**
```bash
rm -rf node_modules dist .vite
pnpm install
pnpm build
```

---

## 8. Environment Variables Not Working

### Symptoms
- Undefined environment variables
- Wrong values being used

### Solutions

**Check Variable Prefix:**
```bash
# Good: With VITE_ prefix
VITE_API_URL=http://localhost:3000

# Avoid: No prefix
API_URL=http://localhost:3000
```

**Restart Dev Server:**
```bash
# Environment variables only load on server start
pnpm dev
```

**Type Environment Variables:**
```typescript
// vite-env.d.ts
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_API_KEY: string;
}
```

---

## Debug Checklist

When encountering issues, check:

```
- [ ] Browser console for errors
- [ ] Network tab for failed requests
- [ ] React DevTools for component state
- [ ] React Query DevTools for query state
- [ ] Environment variables are set
- [ ] Dependencies are installed
- [ ] TypeScript has no errors
- [ ] API is running and accessible
- [ ] Authentication is valid
- [ ] CORS is configured
```

---

## Getting Help

If you're still stuck:

1. **Check Documentation:** Review feature README and API docs
2. **Search Issues:** Look for similar issues on GitHub
3. **Enable Debug Mode:**
   ```typescript
   localStorage.setItem('debug', 'true');
   ```
4. **Collect Information:**
   - Error messages
   - Console logs
   - Network requests
   - Steps to reproduce
5. **Contact Support:** Open an issue with details

---

## Useful Commands

```bash
# Clear all caches
pnpm clean

# Reinstall dependencies
rm -rf node_modules
pnpm install

# Type check
pnpm type-check

# Lint
pnpm lint

# Test
pnpm test

# Build
pnpm build
```

---

**Last Updated:** November 2025
**Need More Help?** Contact the development team
```

---
