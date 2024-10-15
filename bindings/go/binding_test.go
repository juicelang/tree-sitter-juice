package tree_sitter_juice_test

import (
	"testing"

	tree_sitter "github.com/smacker/go-tree-sitter"
	"github.com/tree-sitter/tree-sitter-juice"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_juice.Language())
	if language == nil {
		t.Errorf("Error loading Juice grammar")
	}
}
