{
  lib,
  mkShell,
  tree-sitter,
  nodejs,
  python38,
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
  watch-grammar = writeShellScriptBin "watch-grammar" ''
    ls grammar.js example.juice | entr ${lib.getExe generate-and-parse}
  '';
in
  mkShell {
    nativeBuildInputs = [
      (tree-sitter.override {webUISupport = true;})
      nodejs
      python38
      entr
      watch-grammar
      generate-and-parse
    ];
  }
