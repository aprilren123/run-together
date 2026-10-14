## Running the app

- `bun run dev` starts MongoDB in a container, then the backend at http://127.0.0.1:3000 and the frontend at http://localhost:8080 (open it at that address: signing in is refused from any other, such as http://127.0.0.1:8080, unless `PUBLIC_ORIGIN` names it), both in watch mode.
- `bun run build` builds the frontend into `app/dist`, and `bun run start` runs only the backend, which serves `app/dist` and falls back to `index.html`. `bun run preview` does both against the local MongoDB at http://localhost:3000; stop `bun run dev` first, since it uses port 3000 too. The repository root's `build`, `start`, and `preview` run these in `app/`.
- `bun run up` runs all three in containers. `bun run down` stops them, and `bun run db:reset` deletes the local data.
- Change `design/` before the code. Check it with `bun run check:design`, then run `bun run generate` and `bun run check`.
