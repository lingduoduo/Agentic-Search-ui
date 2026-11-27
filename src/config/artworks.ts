/** Each image in src/images, named `Title-Artist.png`, resolved to its served URL. */
const images = import.meta.glob<string>("../images/*.png", {
  eager: true,
  query: "?url",
  import: "default",
});

export type Artwork = { title: string; artist: string; src: string };

/** Title and artist from a `Title-Artist.png` path; artists may contain hyphens. */
export function parseArtworkName(path: string): { title: string; artist: string } {
  const name = path
    .split("/")
    .pop()!
    .replace(/\.png$/, "");
  const dash = name.indexOf("-");
  return { title: name.slice(0, dash), artist: name.slice(dash + 1) };
}

export const ARTWORKS: Artwork[] = Object.entries(images)
  .map(([path, src]) => ({ ...parseArtworkName(path), src }))
  .sort((a, b) => a.title.localeCompare(b.title));
