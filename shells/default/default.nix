{
  lib,
  mkShell,
  tree-sitter,
  nodejs,
  python39,
  entr,
  writeShellScriptBin,
  ...
}: let
  tree-sitter-cli = lib.getExe tree-sitter;
  entr-cli = lib.getExe entr;
  generate-and-parse = writeShellScriptBin "generate-and-parse" ''
    clear
    ${tree-sitter-cli} generate
    ${tree-sitter-cli} parse ./example.juice
  '';
  highlight = writeShellScriptBin "highlight" ''
    clear
    ${tree-sitter-cli} --config-path config.json highlight ./example.juice
  '';
  watch-grammar = writeShellScriptBin "watch-grammar" ''
    ls grammar.js example.juice | entr ${lib.getExe generate-and-parse}
  '';
  watch-highlight = writeShellScriptBin "watch-highlight" ''
    ls grammar.js example.juice ./queries/highlights.scm | entr ${lib.getExe highlight}
  '';
in
  mkShell {
    nativeBuildInputs = [
      (tree-sitter.override {webUISupport = true;})
      nodejs
      python39
      entr
      generate-and-parse
      watch-grammar
      watch-highlight
    ];
  }
