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

router.put('/index', async (request, env, context) => {
    // Setting up the tables if they don't already exist.
    let statements = [
        env.DB.prepare("DROP TABLE IF EXISTS gifs"),
        env.DB.prepare(`
CREATE TABLE IF NOT EXISTS gifs (
    gif_path TEXT PRIMARY KEY, 
    show_id TEXT NOT NULL,
    origin_url TEXT NOT NULL
)`),
        env.DB.prepare("DROP TABLE IF EXISTS shows"),
        env.DB.prepare(`
CREATE TABLE IF NOT EXISTS shows (
    show_id TEXT PRIMARY KEY,
    show_name TEXT NOT NULL
)`),
        env.DB.prepare("DROP TABLE IF EXISTS characters"),
        env.DB.prepare(`
CREATE TABLE IF NOT EXISTS characters (
    character_id TEXT PRIMARY KEY,
    character_name TEXT NOT NULL
)`),
        env.DB.prepare("DROP TABLE IF EXISTS character_show"),
        env.DB.prepare(`
CREATE TABLE IF NOT EXISTS character_show (
    show_id TEXT NOT NULL,
    character_id TEXT NOT NULL
)`),
        env.DB.prepare("DROP TABLE IF EXISTS character_gif"),
        env.DB.prepare(`
CREATE TABLE IF NOT EXISTS character_gif (
    gif_path TEXT NOT NULL,
    character_id TEXT NOT NULL
)`),
        env.DB.prepare("DROP TABLE IF EXISTS gif_sentiment"),
        env.DB.prepare(`
CREATE TABLE IF NOT EXISTS gif_sentiment (
    gif_path TEXT NOT NULL,
    sentiment TEXT NOT NULL
)`)
    ];

    // Fetching the prebuilt indices.
    let gif_res = await fetch("https://github.com/LTLA/acceptable-anime-gifs/releases/download/latest/gifs.json");
    if (!gif_res.ok) {
        return new Response({ "error": "failed to retrieve the GIF manifest from GitHub" }, { status: gif_res.status });
    }
    let gif_body = await gif_res.json();

    let gif_characters = {};
    let sentiments = [];

    for (const gif of gif_body) {
        statements.push(
            env.DB.prepare("INSERT into gifs (gif_path, show_id, origin_url) VALUES (?, ?, ?)")
                .bind(gif.path, gif.show_id, gif.url)
        );

        for (const s of gif.sentiments) {
            statements.push(
                env.DB.prepare("INSERT into gif_sentiment (gif_path, sentiment) VALUES (?, ?)")
                    .bind(gif.path, s)
            );
        }

        for (const c of gif.characters) {
            if (!(c in gif_characters)) {
                gif_characters[c] = [];
            }
            gif_characters[c].push(gif.path);
        }
    }

    let show_res = await fetch("https://github.com/LTLA/acceptable-anime-gifs/releases/download/latest/shows.json");
    if (!show_res.ok) {
        return new Response({ "error": "failed to retrieve the show manifest from GitHub" }, { status: show_res.status });
    }
    let show_body = await show_res.json();

    let used_character_ids = new Set;
    let character_to_id = {}

    for (const show of show_body) {
        statements.push(
            env.DB.prepare("INSERT into shows (show_id, show_name) VALUES (?, ?)")
                .bind(show.id, show.name)
        );

        for (const [k, v] of Object.entries(show.characters)) {
            if (!used_character_ids.has(v)) {
                used_character_ids.add(v);
                statements.push(
                    env.DB.prepare("INSERT into characters (character_id, character_name) VALUES (?, ?)")
                        .bind(v, k)
                );
            }

            character_to_id[k] = v;
            statements.push(
                env.DB.prepare("INSERT into character_show (show_id, character_id) VALUES (?, ?)")
                    .bind(show.id, v)
            );
        }
    }

    // Inserting the character information.
    for (const [key, val] of Object.entries(gif_characters)) {
        if (!(key in character_to_id)) {
            throw new Response({ "error": "cannot find ID for character '" + key + "'" }, { status: 500 });
        }
        let char_id = character_to_id[key];

        for (const vx of val) {
            statements.push(
                env.DB.prepare("INSERT into character_gif (gif_path, character_id) VALUES (?, ?)")
                    .bind(vx, char_id)
            );
        }
    }

    let status = await env.DB.batch(statements);
    return new Response(null, { status: 202 });
});

router.get('/random', async (request, env, context) => {
    let command = "SELECT gif_path, show_id FROM gifs ORDER BY RANDOM() LIMIT 1";
    let res = await env.DB.prepare(command).all();
    return Response.json(res); 
});

router.get('/search', async (request, env, context) => {
    const { query } = request;
    console.log(query);

    let args = ["%" + query.query + "%"];
    let command = "SELECT id FROM gypsum_meta_text\nWHERE contents LIKE ?\n";
    if ("field" in query) {
        command += "AND field == ?";
        args.push(query.field);
    }

    console.log(command);
    let res = await env.DB.prepare(command).bind(...args).all();
    return Response.json(res); 
});

export default {
    fetch: router.handle 
};
