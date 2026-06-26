# Engineering Records

This directory is the development memory for `ai-pm-dev` itself. Read it selectively:
start here, choose the smallest matching record, and avoid loading every file by default.

| When you need to know... | Read this |
| --- | --- |
| Product direction, positioning, and long-term restructuring intent | `../PRODUCT_VISION_AND_RESTRUCTURE.zh-CN.md` |
| What shipped in each version, and which hypothesis it validated or disproved | `iterations.md` |
| What a reviewer approved or challenged in a specific release/refactor | `reviews/` |
| Why an architectural or process decision exists | `decisions/` |
| Public user-facing release notes | `../CHANGELOG.md` |

`engineering/` is not part of the npm package. It is for maintainers and AI-assisted
development loops, while generated target-project operating docs still live in each
target project's `docs/` directory.
