# Project Checklist and Migration

Includes additional resources, the new-project checklist, migration strategy, and implementation tips.

## Contents

- Additional Resources
- Checklist for New Projects
- Migration from Existing Projects
  - Gradual Migration Strategy
- Tips & Tricks

## Additional Resources

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Query](https://tanstack.com/query/latest)
- [Zustand](https://zustand-demo.pmnd.rs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Tailwind CSS Vite Guide](https://tailwindcss.com/docs/guides/vite)
- [shadcn/ui Vite Installation](https://ui.shadcn.com/docs/installation/vite)
- [Storybook React Vite](https://storybook.js.org/docs/get-started/frameworks/react-vite)
- [Testing Library](https://testing-library.com/)
- [Feature-Sliced Design](https://feature-sliced.design/)
- [Bulletproof React](https://github.com/alan2207/bulletproof-react)

---

## Checklist for New Projects

- [ ] Use pnpm for new projects unless the repo has another standard
- [ ] Setup TypeScript with strict mode
- [ ] Configure path aliases
- [ ] Setup Tailwind through the Vite plugin
- [ ] Configure shadcn/ui to write primitives to src/shared/components/ui
- [ ] Configure Storybook for React + Vite UI projects with the official CLI from the Vite app root
- [ ] Create `src/test/storybook/` for shared Storybook providers, decorators, fake services, router wrappers, and story fixtures
- [ ] Install and configure linting tools (ESLint, Prettier)
- [ ] Setup pre-commit hooks (Husky)
- [ ] Configure testing framework (Vitest, Jest)
- [ ] Configure Storybook testing for render smoke, interaction, accessibility, and optional visual regression checks
- [ ] Setup state management (React Query, Zustand)
- [ ] Create base folder structure (features, shared, core)
- [ ] Setup environment variables
- [ ] Configure CI/CD pipeline
- [ ] Document setup and conventions
- [ ] Create reusable component library
- [ ] Setup error boundary and error handling

---

## Migration from Existing Projects

### Gradual Migration Strategy

**Phase 1: Setup Foundation**
- Detect and keep the existing package manager from the lockfile
- Install TypeScript
- Configure path aliases
- Setup folder structure
- Add Tailwind/shadcn only if the app is standardizing on that UI stack
- Keep existing Storybook/visual-testing infrastructure if it is coherent

**Phase 2: Migrate Utilities**
- Move utility functions to `shared/utils`
- Add `shared/utils/cn.ts` before moving shadcn/ui primitives
- Add TypeScript types
- Update imports

**Phase 3: Migrate Components**
- Move shadcn/ui primitives to `shared/components/ui`
- Move generic app components to `shared/components`
- Move feature components to `features/*/components`
- Add or move colocated `*.stories.tsx` files for UI components and pages
- Add proper typing

**Phase 4: Migrate Business Logic**
- Extract hooks to feature folders
- Create service layer
- Add TypeScript interfaces

**Phase 5: Optimize**
- Add code splitting
- Optimize bundle size
- Add testing
- Add Storybook stories for primary UI states and layout-risk edge data

---

## Tips & Tricks

1. **Start Small**: Don't restructure everything at once
2. **Document as You Go**: Update docs when making changes
3. **Use Code Generators**: Create scripts for common structures
4. **Review Regularly**: Periodically review and refactor
5. **Team Agreement**: Ensure team agrees on conventions
6. **Automate**: Use tools to enforce standards
7. **Test Coverage**: Maintain good test coverage
8. **Performance**: Monitor bundle size and load times

---

**Version:** 1.0.0
**Last Updated:** November 2025
**License:** MIT
