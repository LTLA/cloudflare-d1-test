/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npx wrangler dev src/index.js` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npx wrangler publish src/index.js --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { Router } from 'itty-router';

const router = Router();

router.put('/index_project', async (request, env, context) => {
    let body = await request.json();
    let project = body.project;
    let version = body.version;
    let paths = body.paths;

    let statements = [
        env.DB.prepare(`
CREATE TABLE IF NOT EXISTS gypsum_files (
    id TEXT PRIMARY KEY, 
    project TEXT NOT NULL,
    relpath TEXT NOT NULL,
    version TEXT NOT NULL
)`),
        env.DB.prepare(`
CREATE TABLE IF NOT EXISTS gypsum_meta_text (
    id TEXT NOT NULL,
    field TEXT NOT NULL,
    contents TEXT NOT NULL,
    FOREIGN KEY(id) REFERENCES gypsum_files(id)
)`)
    ];

    for (const f of paths) {
        let id = project + ":" + f.path + "@" + version;
        console.log(id);
        statements.push(
            env.DB.prepare("insert into gypsum_files (id, project, relpath, version) VALUES (?, ?, ?, ?)")
                .bind(id, project, f.path, version)
        );

        for (const field of f.text_fields) {
            statements.push(
                env.DB.prepare("insert into gypsum_meta_text (id, field, contents) VALUES (?, ?, ?)")
                    .bind(id, field.field, field.value)
            );
        }
    }

    let status = await env.DB.batch(statements);
    return new Response(null, { status: 202 });
});

export default {
    fetch: router.handle 
};