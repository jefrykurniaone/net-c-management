<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:coding-standards -->

## Coding Standards

### Code Quality

- Follow SonarQube coding standards for all code (clean code, no code smells)
- Target: 0 warnings, 0 vulnerabilities, 0 deprecated components
- Fix all lint/type errors before considering a task done

### Internationalization (i18n)

- New apps built from scratch must support at minimum 2 languages: Indonesian (ID) and English (EN)
- Default language is always English unless explicitly requested otherwise
- Single-language projects default to English

### General

- Prefer modern, non-deprecated APIs and components
- Security-first: follow OWASP Top 10 practices

<!-- END:coding-standards -->
