# Gun Mayhem 2 (More Mayhem) — Research

> **Primary sources**: Armor Games listing (https://armorgames.com/play/13824/gun-mayhem-2-more-mayhem), MobyGames entry (https://www.mobygames.com/game/195996/gun-mayhem-2-more-mayhem/), MobyGames Gun Mayhem series group (https://www.mobygames.com/group/18180/gun-mayhem-series/), TCRF (https://tcrf.net/Gun_Mayhem_2_More_Mayhem), Gun Mayhem Fandom wiki (https://gunmayhem.fandom.com/wiki/Tier_Lists_(GM2)), Google AI overview of gameplay.

## Overview

- Title: **Gun Mayhem 2: More Mayhem** (often shortened "Gun Mayhem 2")
- Genre: Platform fighting / arena shooter (2D side view), inspired by *Super Smash Bros.*
- Platform: Browser (Adobe Flash)
- Release date: **August 30, 2012** (MobyGames / Armor Games)
- Developer: **Kevin Gu** (Armor Games author page: https://armorgames.com/author/kevingu)
- Publisher / host: Armor Games (armorgames.com)
- Series: Gun Mayhem series — prequel *Gun Mayhem* (2011), sequel *Gun Mayhem 2: More Mayhem* (2012). MobyGames lists only these two entries in the series group.

## Core Gameplay Loop

- Single character per player; gun down opponents until they fall off the stage.
- Objective is NOT depleting HP to 0 — it's **knocking opponents off the arena** (ring-out), Smash Bros. style.
- Players have a finite number of lives (respawns); first to run out loses.
- Randomly spawning crates grant superpowers and stronger weaponry.
- Up to **4 players local** on the same keyboard.
- Controls (default, editable in options):
  - Player 1: Arrow keys move, Z shoot, X throw bomb
  - Player 2: WASD move, T shoot, Y throw bomb
  - Players 3 & 4: configurable in options

## Physics / Movement Model (for replication)

- Side-view 2D platformer physics: gravity, jump, double/triple jump per character type.
- Knockback: each hit applies force proportional to weapon; higher knockback near stage edges = ring-out risk.
- Height advantage (high ground) = better firing angles + easier to push opponents downward.
- Lower position = defensive disadvantage; must jump up constantly to escape pressure.
- Collision markers used internally (TCRF: Symbol 825 hidden collision marker).
- Invisibility powerup icon exists in code (Symbol 836) but hardcoded to never spawn — leftover from GM1.

## Combat & Damage Model

- Weapons: ~60 total across multiple categories (handguns, shotguns, rifles, explosives, etc.).
- Each weapon has: fire rate, damage/knockback, ammo (some infinite like Gold Pistol), reload animation.
- Gold Pistol (gun_m1911gold2): infinite ammo, modified sprite from unused "LAME GUN" (gun_m1911gold) with shorter slide exposing muzzle.
- Bombs: thrown (X/Y keys), area damage.
- Crates: random spawn with weapons/bombs/powerups; AI cheats to prioritize crate collection (code: `if(randgun == 26 && _root.activeplayers[i].AI) { randgun = 55; }`).
- Powerups: superpowers from crates (invisibility exists in code but disabled).

## Characters & AI Tiers

Characters (playable + AI variants), tiered by TCRF/Fandom:

| Tier | Characters | Notes |
|---|---|---|
| S | Terminator | Strongest; has "De-materializer" weapon, uses it very well |
| A+ | Gangster (Black/White), Pistol Man | Gangsters use "Gangster Shotgun"; Pistol Man uses "Angry Cow" (Raging Bull M444) |
| A- | Too Fast, Tiny Guy, The Ghost, Triple Jumper | Ability-based: fastest / shortest / invisible / triple jump |
| A | Hard AI (×6) | Best AI weapon usage |
| B | Moderate AI (×3) | |
| C | Easy AI (×4) | |
| K | Simple AI | Weakest |
| Untiered | Dummy | No power; has pistol but can't use it well |

- Character customization: cosmetic (colors, hats/outfits) — "customize your character".
- AI difficulty tiers affect weapon usage quality, not stats.

## Modes

- Campaign: 16 progressively challenging missions; single-player and 2-player co-op.
- Challenge levels (new in GM2).
- Custom game: up to 4 players locally.
- 7 custom game modes (per Armor Games listing).

## New in Gun Mayhem 2 vs. Gun Mayhem (2011)

- Larger number of campaign levels.
- New maps, new music.
- New challenge game mode.
- New guns, perks, customization options.
- More maps, more guns, more cosmetics.

## Maps / Arenas

- Small arena maps; falling off edges = death.
- High ground advantage important.
- Specific map list not documented in primary sources (TCRF notes "more to this; map & weapon graphics").

## Weapons (sample, from Google AI overview)

- Handguns: Cool Pistol (M1911A1, balanced), Angry Cow (Raging Bull M444, high damage/high recoil), Sine Pistol, Glick (Glock).
- Shotguns: Gangster Shotgun.
- Special: De-materializer (Terminator), Gold Pistol (infinite ammo).
- Explosives: bombs (thrown), grenade bullets.

## Reception

- Armor Games: 88 rating; 6,842,036 plays; 6,138 ratings; 4,362 favorites (as scraped).
- MobyGames: 4.6/5 (1 rating, 0 reviews); Moby Score n/a.
- Prequel *Gun Mayhem* (2011): 4.4/5 (1 rating).

## Lineage

- Prequel: *Gun Mayhem* (released May 22, 2011, Browser) — https://www.mobygames.com/game/195993/gun-mayhem/
- Series group: https://www.mobygames.com/group/18180/gun-mayhem-series/
- GM2 has unused leftovers from GM1 (invisibility powerup code, most unused GM1 weapons except gun_nade1).

## Dev/Implementation Notes (for own framework)

- Engine: Adobe Flash (ActionScript) — original; for remake consider 2D physics engine (Godot/Unity/Phaser).
- State machine: menu → character select → arena → round end → results.
- Multiplayer: local only (same keyboard, up to 4); no online in original.
- AI: tier-based weapon proficiency; crate-rushing cheat code for AI.
- Ring-out win condition (not HP depletion) — core differentiator from typical shooters.
- Weapon randomization via crates; ~60 weapons to design.
- Character abilities: speed, size, invisibility, multi-jump — small stat/ability modifiers.
- Cosmetic customization layer separate from gameplay stats.

## Notes / limits

- Armor Games Flash content largely unavailable via Ruffle at scrape time; game page metadata still readable.
- No Wikipedia article exists for "Gun Mayhem"; MobyGames + Armor Games + TCRF + Fandom are the primary sources used.
- MobyGames credits page empty ("We don't have any credits for this game yet"); developer attribution comes from Armor Games author page (KevinGu).
- Specific weapon stats, map list, and full 60-weapon roster not documented in public sources; would require decompiling the SWF.