# Juice ❤ Tree-sitter

<a href="https://nixos.wiki/wiki/Flakes" target="_blank">
	<img alt="Nix Flakes Ready" src="https://img.shields.io/static/v1?logo=nixos&logoColor=d8dee9&label=Nix%20Flakes&labelColor=5e81ac&message=Ready&color=d8dee9&style=for-the-badge">
</a>
<a href="https://github.com/snowfallorg/lib" target="_blank">
	<img alt="Built With Snowfall" src="https://img.shields.io/static/v1?logoColor=d8dee9&label=Built%20With&labelColor=5e81ac&message=Snowfall&color=d8dee9&style=for-the-badge">
</a>
<a href="https://juice.dev" target="_blank">
	<img alt="Powered By Juice" src="https://img.shields.io/static/v1?logoColor=d8dee9&label=Powered%20By&labelColor=5e81ac&message=Juice&color=d8dee9&style=for-the-badge">
</a>

<p>
<!--
	This paragraph is not empty, it contains an em space (UTF-8 8195) on the next line in order
	to create a gap in the page.
-->
  
</p>

## Development

This repository comes with a Nix development shell and support for [Direnv](https://direnv.net/).
To start a development shell manually, run the following.

```shell
nix develop
```

A convenience script is added in the development shell to automatically run tree-sitter to
generate a parser and attempt to parse the `example.juice` file. To start this watcher, run
the following command.

```shell
watch-grammar
```

There is also a script for watching `example.juice` and performing highlighting on the file.
Note that this command does *not* generate the parser.

```shell
watch-highlight
```
