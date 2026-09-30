# Deployment

The site is a static Vite build, deployed to GitHub Pages from
<https://github.com/twlab/neuroblastoma-web> by the workflow in
`.github/workflows/deploy.yml`.

## What the workflow does

On every push to `main` (or a manual run from the Actions tab):

1. checks out the code and installs dependencies (`npm ci` from `package-lock.json`);
2. validates `src/data/manifest.json` (`npm run check:tracks`);
3. asks GitHub Pages for the site's base path (`actions/configure-pages`), so the
   build is correct both at `https://twlab.github.io/neuroblastoma-web/` and at a
   custom domain served from `/` — no configuration change needed when the domain
   is switched on;
4. runs `npm run build` and publishes `dist/` with `actions/deploy-pages`.

Node 22 (npm 10.9) is used in CI; locally anything ≥ 20 works.

If `npm ci` reports that `package-lock.json` is out of sync, the workflow falls
back to `npm install` and adds a warning to the run instead of failing. To get
back to reproducible installs, run `npm install` locally with npm 10.9 or newer
(`npm -v`) and commit the updated lock file. One known source of drift: older
npm versions leave the peer dependency `buffer@>=6.0.3` of `crc` (a transitive
dependency of `wuepgg`) unsatisfied, whereas npm 10.9 expects `buffer@6.0.3` at
the top level and `buffer@5.7.1` nested under `node-stdlib-browser`.

## One-time repository setup

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
   (The workflow also tries to enable Pages itself on the first run; if that
   step fails with a permissions error, set the source here and re-run.)
2. Push to `main` or trigger *Deploy to GitHub Pages* from the Actions tab.
   The first deployment appears at `https://twlab.github.io/neuroblastoma-web/`.

## Custom domain

1. **Settings → Pages → Custom domain**: enter the domain (for example
   `neuroblastoma.epigenomes.net`) and save. GitHub stores it for Actions-based
   deployments, so no `CNAME` file is required in the repository. If you prefer
   to keep it in the repo anyway, create `public/CNAME` containing just the
   domain; Vite copies it into `dist/`.
2. **DNS** at the provider of the domain:
   * subdomain (recommended): `CNAME  neuroblastoma  →  twlab.github.io`
   * apex domain: the four GitHub Pages `A` records (and `AAAA` records)
     listed in [GitHub's documentation](https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).
3. Wait for the DNS check on the Pages settings page to pass, then tick
   **Enforce HTTPS** once the certificate has been issued (can take a few
   minutes to an hour).
4. Redeploy once (push or manual run) so the build picks up the root base path.
   With a custom domain the site is served from `/`; `configure-pages` reports
   that automatically.

## Overriding the base path

`vite.config.ts` reads `BASE_PATH`. The workflow fills it from a repository
variable if one exists, otherwise from `configure-pages`:

| Situation | `BASE_PATH` |
| --------- | ----------- |
| custom domain, or a user/organisation site | `/` (auto) |
| project page `https://twlab.github.io/neuroblastoma-web/` | `/neuroblastoma-web/` (auto) |
| forcing a value | Settings → Secrets and variables → Actions → Variables → `BASE_PATH` |

For a local production preview of a project-page build:

```bash
BASE_PATH=/neuroblastoma-web/ npm run build && npm run preview
```

## Deploying somewhere else

`npm run build` produces a self-contained `dist/` folder (HTML, JS, CSS, the
favicon). Copy it to any static host; set `BASE_PATH` at build time to the path
the folder will be served from. No server-side code or environment variables are
needed at runtime — all data is fetched by the browser directly from
<https://epigenome.wustl.edu/tychele-lab/> and the WashU Epigenome Browser's
public annotation services.
