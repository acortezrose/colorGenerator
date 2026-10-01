import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { generateArchetypes } from "./scripts/generateArchetypes.mjs";

// Regenerates src/generated/gradientArchetypes.js from archetypes/*.svg before
// each dev server start / build, and again whenever a file in archetypes/
// changes while the dev server is running.
function archetypesPlugin() {
	const archetypesDir = path.resolve(__dirname, "archetypes");
	return {
		name: "generate-archetypes",
		buildStart() {
			generateArchetypes();
		},
		configureServer(server) {
			server.watcher.add(archetypesDir);
			server.watcher.on("all", (_event, file) => {
				if (file.startsWith(archetypesDir) && file.toLowerCase().endsWith(".svg")) {
					generateArchetypes();
					server.ws.send({ type: "full-reload" });
				}
			});
		},
	};
}

// https://vite.dev/config/
export default defineConfig({
	plugins: [archetypesPlugin(), react(), tailwindcss()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
