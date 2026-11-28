import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { parseArtworkName } from "../../../../config/artworks";
import { ListView } from "../ListView";

describe("parseArtworkName", () => {
  it("splits title and artist on the first hyphen", () => {
    expect(parseArtworkName("../images/Primavera-Sandro Botticelli.webp")).toEqual({
      title: "Primavera",
      artist: "Sandro Botticelli",
    });
  });

  it("keeps hyphens inside the artist name", () => {
    expect(parseArtworkName("The Swing-Jean-Honoré Fragonard.webp")).toEqual({
      title: "The Swing",
      artist: "Jean-Honoré Fragonard",
    });
  });
});

describe("ListView", () => {
  it("lists every artwork with its title and artist", () => {
    render(
      <MemoryRouter>
        <ListView />
      </MemoryRouter>,
    );

    const gallery = screen.getByRole("region", { name: "Artworks" });
    expect(within(gallery).getAllByRole("listitem")).toHaveLength(13);
    // One spelling per artist, so the count does not split anyone in two.
    expect(within(gallery).getByText("13 works · 8 artists")).toBeInTheDocument();

    const venus = within(gallery).getByRole("img", {
      name: "The Birth of Venus by Sandro Botticelli",
    });
    expect(venus).toHaveAttribute("src");
    expect(within(gallery).getByText("The Birth of Venus")).toBeInTheDocument();
  });
});
