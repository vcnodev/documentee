# @documentee/cli

Command line interface for Documentee.

## Commands

```bash
documentee init <project>
documentee validate <project>
documentee build <project> --out <dir>
documentee dev <project> --port <port>
documentee preview <project> --out <dir> --port <port>
documentee migrate <mintlify|docusaurus|nextra> <source> <target>
```

`documentee dev` serves manifest-rendered routes directly from the source project. `documentee preview` builds the deployable static artifact first, then serves files from the output directory.

Migration helpers copy docs and API files into Documentee shape and normalize common Mintlify, Docusaurus, and Nextra MDX syntax.

See the [root README](../../README.md) and [repository rules](../../AGENTS.md).
