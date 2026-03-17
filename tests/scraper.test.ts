import { describe, test, expect } from "bun:test";
import { parseEventsFromHtml } from "../src/scraper.js";
import { MOCK_EVENTS_HTML, MOCK_LOAD_MORE_RESPONSE } from "./mocks.js";

describe("parseEventsFromHtml", () => {
  test("parses initial events from full page HTML", () => {
    const events = parseEventsFromHtml(MOCK_EVENTS_HTML, 2026);
    expect(events).toHaveLength(5);
  });

  test("parses training event correctly", () => {
    const events = parseEventsFromHtml(MOCK_EVENTS_HTML, 2026);
    const training = events[0];
    expect(training).toBeDefined();
    if (!training) throw new Error("Expected training event");
    expect(training.id).toBe("10001");
    expect(training.type).toBe("training");
    expect(training.title).toBe("Training");
    expect(training.date).toBe("2026-04-15");
    expect(training.meetTime).toBe("19:00");
    expect(training.startTime).toBe("19:15");
    expect(training.endTime).toBe("20:45");
  });

  test("parses game event with subtitle", () => {
    const events = parseEventsFromHtml(MOCK_EVENTS_HTML, 2026);
    const game = events[1];
    expect(game).toBeDefined();
    if (!game) throw new Error("Expected game event");
    expect(game.id).toBe("20001");
    expect(game.type).toBe("game");
    expect(game.title).toBe("Testspiel bei Phantomkicker (Auswärtsspiel)");
    expect(game.subtitle).toBe("Phantomkicker");
    expect(game.date).toBe("2026-04-17");
    expect(game.meetTime).toBe("18:30");
    expect(game.startTime).toBe("19:00");
    expect(game.endTime).toBe("21:00");
    expect(game.description).toContain("freundschaftlich");
  });

  test("parses team name event (like a league game)", () => {
    const events = parseEventsFromHtml(MOCK_EVENTS_HTML, 2026);
    const leagueGame = events[2];
    expect(leagueGame).toBeDefined();
    if (!leagueGame) throw new Error("Expected league game event");
    expect(leagueGame.id).toBe("20002");
    expect(leagueGame.type).toBe("game");
    expect(leagueGame.title).toBe("Galaxie.Volley");
    expect(leagueGame.subtitle).toBe("3. Spieltag - Heimspiel");
  });

  test("parses other event type", () => {
    const events = parseEventsFromHtml(MOCK_EVENTS_HTML, 2026);
    const other = events[4];
    expect(other).toBeDefined();
    if (!other) throw new Error("Expected other event");
    expect(other.id).toBe("30001");
    expect(other.type).toBe("other");
    expect(other.title).toBe("Teamfeier");
  });

  test("parses load-more HTML fragment", () => {
    const events = parseEventsFromHtml(MOCK_LOAD_MORE_RESPONSE.html, 2026);
    expect(events).toHaveLength(1);
    expect(events[0]?.id).toBe("10003");
    expect(events[0]?.date).toBe("2026-05-01");
  });

  test("generates correct URLs", () => {
    const events = parseEventsFromHtml(MOCK_EVENTS_HTML, 2026);
    expect(events[0]?.url).toBe("https://www.spielerplus.de/training/view?id=10001");
    expect(events[1]?.url).toBe("https://www.spielerplus.de/game/view?id=20001");
  });
});
