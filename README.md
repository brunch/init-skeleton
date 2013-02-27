# init-recipe

A simple interface that clones or copies recipes.
Recipe is a base repo for your application (any technology).

`init-recipe` currently just clones or copies the repository, executes `npm install` and removes `.git` directory. Useful for Brunch and Grunt base repos
(skeletons).

Supported formats:

* File system
* Git URI
* GitHub URI (gh:user/project)

## Usage

Examples:

```bash
init-recipe ../recipes/my-recipe
init-recipe gh:paulmillr/brunch-with-chaplin
init-recipe git@github.com:nezoomie/brunch-with-eggs-and-bacon.git
init-recipe https://github.com/scotch/angular-brunch-seed
```

## License

The MIT License (MIT)

Copyright (c) 2013 Paul Miller (http://paulmillr.com/)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the “Software”), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
