/**
 * Which task, if any, an open pull request claims.
 * The canonical `Task: tasks/NNNN-slug.md` line that CLAUDE.md mandates is
 * authoritative; a loose `task NNNN` mention is only a fallback, because a body
 * may legitimately mention other tasks (follow-ups) before naming its own.
 * @param {string} text branch name and pull request body, concatenated
 * @returns {string | null} the four-digit task id
 */
export function taskIdFrom(text) {
  const match =
    /\btasks\/(\d{4})-[a-z0-9-]+\.md\b/.exec(text) ??
    /\btask[-/ ]?(\d{4})\b/i.exec(text);
  return match ? match[1] : null;
}
