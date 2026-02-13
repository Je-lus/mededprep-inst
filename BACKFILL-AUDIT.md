# Backfill Audit

What each existing project needs to align with the template standard.

---

## Clinicals (highest priority)

- [ ] Create `app/eslint.config.js` (copy template's `app/eslint.config.js`)
- [ ] Add `typecheck`, `lint`, `lint:fix`, `format` scripts to `app/package.json`
- [ ] Install frontend ESLint deps: `eslint@9`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-config-prettier`, `globals`
- [ ] Rename scripts: `migrate:dev` -> `db:migrate`, `migrate:deploy` -> `db:deploy`, `prisma:generate` -> `db:generate`, `seed` -> `db:seed`
- [ ] Create `app/tsconfig.app.json` (exclude tests)
- [ ] Update build command to `tsc --project tsconfig.app.json && vite build`

## CE (minimal)

- [ ] Create `app/tsconfig.app.json` (already only has `tsconfig.json`)
- [ ] Add `typecheck` script: `tsc --noEmit --project tsconfig.app.json`
- [ ] Update build script to use `--project tsconfig.app.json`

## Portal (documented divergences OK)

- [ ] Consider adding root `eslint.config.js` for backend linting
- [ ] Consider aligning lint-staged to template pattern (currently uses `node --check`)

## CoAssist (documented divergence: backend/+frontend/ split)

- [ ] Replace `nodemon` with `node --watch` in dev script
- [ ] Upgrade Express 4 -> 5 when ready
- [ ] Create deploy.yml when deployment target is ready
