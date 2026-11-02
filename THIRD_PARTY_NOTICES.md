# Third-party notices

## Project independence

ccusage-dashboard is an independent community project. It is not an official
ccusage product and is not affiliated with or endorsed by the ccusage authors.
The ccusage name is used only to describe compatibility and the data source.
Other product names are used descriptively; their rights belong to their
respective owners.

## ccusage

This package uses ccusage as an external npm dependency and invokes its CLI.
The ccusage source code is not bundled into ccusage-dashboard's `dist` output.

- Upstream: https://github.com/ccusage/ccusage
- Author: ryoppippi
- License: MIT

The upstream package retains its own license when installed by npm. Its
attribution is also reproduced here for clarity:

MIT License

Copyright (c) 2025 ryoppippi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Frontend bundle

The production frontend bundle contains third-party JavaScript packages.
`dist/web/THIRD_PARTY_LICENSES.txt` is regenerated on every production build
and contains the license and notice texts for the dependencies actually
included in that bundle, including transitive dependencies and multiple
versions where applicable.

In particular, Apache ECharts is distributed under Apache-2.0 and its NOTICE
states:

> Apache ECharts
> Copyright 2017-2026 The Apache Software Foundation
>
> This product includes software developed at
> The Apache Software Foundation (https://www.apache.org/).
