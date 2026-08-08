// _worker.js
//
// Presence of this file at the project root puts this Cloudflare Pages
// project into "Advanced Mode": every request to the deployed site - static
// assets and API alike - is routed through this single module instead of
// Pages' default static-only serving. This is what lets the whole project
// (site + API) deploy as ONE Cloudflare Pages project, on the free
// *.pages.dev domain if desired, with no separate Worker to deploy, no
// custom domain/zone requirement, and no Worker Route to configure.
//
// The actual request handling - including serving static files for
// everything outside /api/* via env.ASSETS - lives in workers/d1-api.js so
// it isn't duplicated between this entry point and any other context that
// might import it (e.g. automated tests import workers/d1-api.js directly).
export { default } from './workers/d1-api.js';
