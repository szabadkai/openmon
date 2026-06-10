import { defineConfig } from 'vite';

// base './' makes the build path-relative, so it works at
// https://<user>.github.io/<repo>/ without hardcoding the repo name.
export default defineConfig({ base: './' });
