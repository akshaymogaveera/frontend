# SQIP — Frontend (React + MUI)

This README gives a new frontend developer the information needed to run, develop, and extend the React app in `frontend/`.

Quickstart (local)
1. Install node dependencies

   npm install

2. Start dev server (hot reload)

   npm start

3. Build for production

   npm run build

4. Lint / format (if configured)

   npm run lint
   npm run format

Environment and config
- The frontend is a standard Create-React-App style project (see `package.json`).
- The development server proxies API requests to the backend via the `proxy` key in `package.json` (if present) or by absolute URLs in the code.
- If you need to override API base URLs, search `fetch('/api/` in the code or add a small helper wrapper.

Structure & Important files
- `public/` — static HTML and public assets
- `src/index.js` — app entry
- `src/App.js` — top-level routes
- `src/pages/` — page components (e.g. `LoginPage.js`, `HomePage.js`, `AdminPage.js`)
- `src/components/` — reusable components (Login form, Navbar, etc.)
  - `LoginForm.js` — unified registration/login form used both on the `/login` page and inside the modal
  - `Navbar.js` — top navigation bar (shows user name from localStorage)
  - `AdminPage.js` — admin UI for creating organizations/categories and a dialog for adding to queue
- `src/contexts/` — React contexts
  - `LoginModalContext.js` — controls the login modal open/close and renders the `LoginForm` inside a Dialog
- `src/pages/LoginPage.js` — full-page login/registration UX

Auth flow (brief)
- The app stores tokens in `localStorage` after authentication: `accessToken`, `refreshToken`, `username`, `firstName`, `lastName`, `userId`.
- On login/registration the backend returns `access` and `refresh` tokens.
- The `Navbar` reads `firstName`/`lastName` from `localStorage` and shows a readable profile name.

Login UI notes & customization
- `LoginForm.js` handles registration + login toggles and the (commented-out) email OTP flow.
- For mobile, the login modal uses a centered dialog with reduced padding and smaller inputs. Desktop uses a `Paper` card that visually matches `/login`.
- Country dial codes are defined in `LoginForm.js` in the `COUNTRIES` constant. To update available countries, edit that list.
- The phone normalization is performed on the backend; frontend sends dial code + number (e.g. `+919812345678`).

Testing
- There are no frontend unit tests in this repo by default. You can add tests with Jest/React Testing Library.

How to debug UI issues
1. Open Chrome DevTools and use responsive mode to reproduce mobile breakpoints.
2. Inspect `LoginModalContext.js` and `LoginForm.js` for layout bugs; `useMediaQuery(theme.breakpoints.down('sm'))` is used to detect mobile.
3. If you change MUI theme or breakpoints, test the modal and `/login` page to ensure parity.

Contributing
- Keep components small and testable.
- When changing API calls, update backend docs in `sqip/README.md` if the contract changed (endpoint, parameters, response shape).

Support
- Ask in the repo issues or reach the maintainers listed in git history for help.
