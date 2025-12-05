/**
 * Static file server for Bluesky Blob Store
 * Uses deno serve with @std/media-types
 */

import { contentType } from "@std/media-types";
import { extname } from "@std/path";

const STATIC_DIR = "./static";

export default {
    async fetch(req: Request): Promise<Response> {
        const url = new URL(req.url);
        let pathname = url.pathname;

        // Default to index.html for root
        if (pathname === "/") {
            pathname = "/index.html";
        }

        const filePath = `${STATIC_DIR}${pathname}`;
        const ext = extname(filePath);

        try {
            const file = await Deno.readFile(filePath);
            const mimeType = contentType(ext) || "application/octet-stream";

            return new Response(file, {
                status: 200,
                headers: {
                    "Content-Type": mimeType,
                    "Cache-Control": "no-cache",
                },
            });
        } catch (error) {
            if (error instanceof Deno.errors.NotFound) {
                return new Response("Not Found", { status: 404 });
            }
            return new Response("Internal Server Error", { status: 500 });
        }
    },
};
