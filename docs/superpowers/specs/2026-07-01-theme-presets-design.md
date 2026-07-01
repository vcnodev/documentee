# Theme Presets Design

## Goal

Add named theme presets for Documentee static sites while preserving every existing custom theme token.

## Requirements

- Support `theme.preset` with the names `mint`, `slate`, `neutral`, and `highContrast`.
- Keep existing custom token fields: `primaryColor`, `accentColor`, `backgroundColor`, `textColor`, `mutedTextColor`, `borderColor`, `codeBackgroundColor`, `fontFamily`, `codeFontFamily`, `radius`, `navWidth`, `customCss`, and `darkMode`.
- Preserve this merge order: built-in defaults, then selected preset, then explicit custom tokens.
- `docs.json` and `documentee.config.ts` use the same `theme.preset` field.
- Invalid preset names should fail config validation through the schema.
- Renderer output remains static CSS variables and does not add client JavaScript.

## Architecture

The config schema owns the accepted preset names. The renderer owns final CSS variable resolution because it already maps theme settings into static CSS variables. A small preset map will live near `renderThemeCss`; this keeps the feature close to the only current consumer and avoids broad config materialization changes.

The merge is intentionally shallow. Presets only provide token defaults. Any explicit user token wins, including `darkMode`, fonts, radius, navigation width, and custom CSS.

## Presets

- `mint`: green/teal accent for fresh product docs.
- `slate`: quiet blue-gray technical docs.
- `neutral`: low-chroma black/gray baseline.
- `highContrast`: high-contrast light palette for accessibility-sensitive sites.

## Testing

- Config tests confirm valid presets load and invalid names are rejected.
- Renderer tests confirm preset tokens become CSS variables.
- Renderer tests confirm custom tokens override preset values.
- Documentation tests are covered by the existing contributor docs checks plus updated README/package docs.

## Documentation

Update the root README and core README to describe `theme.preset`, the supported names, and the override rule.
