# Velo Lab

Velo Lab is a development-only local chat and prompt workshop. It uses the production Velo system
instruction and curated public VTS guide knowledge, but sends inference requests only to Ollama on
the same computer.

## Start

1. Start Ollama.
2. Install at least one model, for example:

   ```powershell
   ollama pull qwen3:8b
   ```

3. Start the lab:

   ```powershell
   npm run velo:lab
   ```

4. Open <http://127.0.0.1:5395>.

Use `VELO_LAB_PORT` to change the local port and `VELO_LAB_MODEL` to change the suggested default
model. `VELO_LAB_OLLAMA_URL` may point to another loopback HTTP address, but external hosts and
HTTPS endpoints are rejected.

## Workflow

- Chat uses the current `workers/ai/prompt.js` instruction on every request.
- Curated retrieval selects relevant entries from `js/ai/vts-guide-knowledge.js` for the latest
  user prompt.
- Experiment instructions are temporary local overlays. They do not modify the production prompt.
- Mark a response as good or select **Needs work** and save a preferred answer. When enabled, the
  newest saved corrections are supplied as local few-shot behavior examples.
- Save evaluation cases with required and forbidden phrases, then replay all cases after changing
  the prompt, knowledge, examples, or model.
- Export the browser-local dataset as JSON for review or later fine-tuning preparation.

## Isolation

- The server binds to `127.0.0.1` and rejects non-loopback hosts and browser origins.
- The Ollama target must also be loopback HTTP.
- The Lab has no Firebase imports, production Worker endpoint, authentication, analytics, or cloud
  writes.
- `tools/velo-lab/` is absent from Vite's production inputs and the post-build copy lists, so the
  Lab is not included in `dist/`.

## Troubleshooting and promoting an experiment

If no models appear, confirm the loopback Ollama server is available and a model is installed. A model suggestion in this guide is an example, not a production dependency. If the port is busy, set VELO_LAB_PORT before restarting.

Export useful evaluations before clearing browser storage. Review a successful experiment as a normal code/data PR; the Lab does not publish its prompt overlays or examples automatically. Run the existing Velo Lab and AI contract tests, and keep private operational messages out of the curated public dataset.

[Knowledge intake](velo-knowledge-ingestion.md) · [Documentation index](README.md)
