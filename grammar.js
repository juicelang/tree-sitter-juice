/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const separated = (separator) => (rule) =>
	seq(rule, repeat(seq(separator, rule)));

const comma_separated = separated(",");
const period_separated = separated(".");
const new_line_separated = separated("\n");

module.exports = grammar({
	name: "juice",

	extras: ($) => [/\s/, $.comment],

	conflicts: ($) => [
		[$.function_arguments],
		[$.identifier, $.type_identifier],
		[$.variable_assignment, $.record_literal_field],
		[$.record_literal, $.block]
	],

	rules: {
		program: ($) => seq(optional($.hash_bang_line), repeat($._root_statement)),

		comment: ($) => token(seq("//", /.*/)),

		hash_bang_line: ($) => /#!.*/,

		identifier: ($) => choice(/[a-z_]([a-z0-9_]+)?/),
		type_identifier: ($) => /[a-z_]([a-z0-9_]+)?/,
		macro_identifier: ($) => prec(1, seq($.identifier, "!")),
		_any_identifier: ($) => choice($.identifier, $.macro_identifier),

		int_literal: ($) => token(/[0-9](_?[0-9])*/),
		float_literal: ($) =>
			token.immediate(/[0-9](_?[0-9])*\.([0-9](_?[0-9])*)?/),
		binary_literal: ($) => token(/0b[01](_?[01])*/),
		octal_literal: ($) => token(/0o[0-7](_?[0-7])*/),
		hex_literal: ($) => token(/0x[0-9a-fA-F](_?[0-9a-fA-F])*/),

		bool_literal: ($) => choice("true", "false"),

		keyword: ($) =>
			choice(
				"fn",
				"import",
				"if",
				"else",
				"for",
				"loop",
				"break",
				"await",
				"static",
				"foreign",
				"return",
				"break",
				"continue",
			),

		string_literal: ($) =>
			choice(seq('"', '"'), seq('"', $.string_content, '"')),

		string_content: ($) =>
			choice(
				seq(
					/\s*\n/,
					repeat(
						choice(
							$.string_indent,
							$.string_escape_sequence,
							$.string_text,
							$.string_interpolation,
						),
					),
					/\n\s*/,
				),
				repeat1(
					choice(
						$.string_escape_sequence,
						$.string_text,
						$.string_interpolation,
					),
				),
			),

		string_indent: ($) => /\s*\| /,

		string_interpolation: ($) => seq("${", $.expression, "}"),

		string_escape_sequence: ($) => seq("\\", /(\"|\\|\/|b|f|n|r|t|u|.)/),

		string_text: ($) => /[^\\"$]+/,

		_root_statement: ($) =>
			choice(
				$.import_statement,
				$.function_declaration,
				$.type_declaration,
				$.variable_assignment,
				$.variable_declaration,
				$.impl_declaration,
				$._exported_function_declaration,
				$._exported_type_declaration,
				$._exported_variable_declaration,
			),

		_exported_type_declaration: ($) => seq("export", $.type_declaration),

		_exported_function_declaration: ($) =>
			seq("export", $.function_declaration),

		_exported_variable_declaration: ($) =>
			seq("export", $.variable_declaration),

		_statement: ($) =>
			prec(2,
				choice(
					$.return_statement,
					$.function_declaration,
					$.macro_call_with_body,
					$.macro_call,
					$.function_call,
					$.variable_assignment,
					$.variable_declaration,
					$.for_loop,
					$.expression,
				)
			),

		_number: ($) =>
			choice(
				$.int_literal,
				$.float_literal,
				$.binary_literal,
				$.octal_literal,
				$.hex_literal,
			),

		expression: ($) =>
			choice(
				$.value_expression,
				$.unary_expression,
				$.binary_expression,
				$.if_expression,
				$.match_expression,
			),

		_literal: ($) =>
			choice($._number, $.string_literal, $.bool_literal, $.list_literal, prec(1, $.record_literal)),

		value_expression: ($) =>
			prec.left(
				0,
				seq(
					choice(
						$.type_access,
						$.member_access,
						$.identifier,
						$.tuple,
						$.function_call,
						$.function_declaration,
						$.macro_call,
						$._literal,
					),
					optional("?"),
				),
			),

		unary_expression: ($) =>
			prec.left(
				1,
				seq(
					field("operator", choice("!", "-")),
					field("argument", $.expression),
				),
			),

		binary_expression: ($) =>
			choice(
				...[
					["+", 1],
					["-", 1],
					[">>", 4],
					["<<", 4],
					["*", 2],
					["/", 2],
					["**", 2],
					["&", 1],
					["|", 1],
					["^", 1],
					["%", 1],
					["&&", 1],
					["||", 1],
					["==", 3],
					[">", 3],
					["<", 3],
					[">=", 3],
					["<=", 3],
					["!=", 3],
				].map(([operator, precedence]) =>
					prec.left(
						precedence,
						seq(
							field("left", $.expression),
							// @ts-ignore
							field("operator", operator),
							field("right", $.expression),
						),
					),
				),
			),

		import_statement: ($) =>
			seq(
				optional("foreign"),
				"import",
				$.import_path,
				optional($.import_as),
				optional($.import_expose),
			),

		import_path: ($) => seq(optional("."), period_separated($.identifier)),

		import_as: ($) => seq("as", $.identifier),

		import_expose: ($) => seq("(", comma_separated($._any_identifier), ")"),

		type_expression: ($) =>
			choice($.type_value_expression, $.type_binary_expression),

		type_value_expression: ($) =>
			prec.left(
				11,
				choice(
					$.builtin_type,
					$.identifier,
					$.type_identifier,
					$._literal,
					$.type_function_call,
					$.type_tuple,
				),
			),

		type_binary_expression: ($) =>
			choice(
				...[
					["&", 1],
					["|", 1],
				].map(([operator, precedence]) =>
					prec.left(
						precedence,
						seq(
							field("left", $.type_expression),
							// @ts-ignore
							field("operator", operator),
							field("right", $.type_expression),
						),
					),
				),
			),

		type_function_call: ($) =>
			prec.left(1, seq($.identifier, "(", $.type_function_arguments, ")")),

		type_function_arguments: ($) =>
			prec.left(1, comma_separated($.type_function_argument)),

		type_function_argument: ($) =>
			prec.left(
				1,
				seq(
					optional(seq(choice($.identifier, $.type_identifier), ":")),
					$.type_expression,
				),
			),

		variable_declaration: ($) =>
			seq(
				field("name", $.identifier),
				choice(":=", seq(":", $.type_expression, "=")),
				choice($.expression, $.block),
			),

		variable_assignment: ($) =>
			seq($.identifier, "=", choice($.expression, $.block)),

		type_declaration: ($) =>
			seq(
				"type",
				choice(
					field("name", $.identifier),
					field("name", $.type_identifier),
				),
				optional($.type_parameters),
				":=",
				choice($.type_expression, $.type_constructors),
			),

		type_parameters: ($) => seq("(", comma_separated($.type_parameter), ")"),

		type_parameter: ($) =>
			seq(field("name", $.identifier), optional(seq(":", $.type_expression))),

		type_constructors: ($) =>
			seq(
				"{",
				choice(
					repeat($.type_constructor_shorthand),
					repeat($.type_constructor),
				),
				"}",
			),

		type_constructor: ($) =>
			seq(field("constructor_name", $.identifier), $.type_parameters),

		type_constructor_shorthand: ($) =>
			seq($.identifier, ":", $.type_expression),

		function_declaration: ($) =>
			seq(
				optional("static"),
				"fn",
				field("name", optional(choice($.identifier, $.macro_identifier))),
				field("params", optional($.function_parameters)),
				optional($.function_return_type),
				seq("{", repeat($._statement), "}"),
			),

		function_parameters: ($) =>
			seq("(", comma_separated($.function_parameter), optional(","), ")"),

		function_parameter: ($) =>
			seq(
				field("param_name", $.identifier),
				optional(seq(":", field("param_type", $.type_expression))),
			),

		function_return_type: ($) => seq("->", $.type_expression),

		block: ($) => prec(1, seq("{", repeat($._statement), "}")),

		function_call: ($) =>
			prec(
				1,
				seq(
					field("name", choice($.identifier, $.expression)),
					"(",
					$.function_arguments,
					optional(","),
					")",
				),
			),

		function_arguments: ($) => comma_separated($.function_argument),

		function_argument: ($) =>
			seq(
				optional(seq(choice($.identifier, $.type_identifier), ":")),
				$.expression,
			),

		macro_call: ($) =>
			prec.left(
				2,
				seq(
					field("name", $.macro_identifier),
					choice(
						field("arguments", seq(
							"(",
							$.macro_arguments,
							optional(","),
							")",
						)),
						field("body", $.macro_body),
					)
				),
			),

		macro_call_with_body: ($) =>
			prec.left(
				3,
				seq(
					field("name", $.macro_identifier),
					field("arguments", seq(
						"(",
						$.macro_arguments,
						optional(","),
						")",
					)),
					field("body", $.macro_body),
				),
			),

		macro_body: ($) => seq("{", optional($.macro_body_content), "}"),

		macro_body_content: ($) => repeat1(/.+/),

		macro_arguments: ($) => prec.left(2, comma_separated($.macro_argument)),

		macro_argument: ($) =>
			seq(
				optional(seq(choice($.identifier, $.type_identifier), ":")),
				$.expression,
			),

		tuple: ($) =>
			seq(
				"(",
				$.expression,
				",",
				$.expression,
				optional(seq(",", comma_separated($.expression))),
				")",
			),

		type_tuple: ($) =>
			seq(
				"(",
				$.type_expression,
				",",
				$.type_expression,
				optional(seq(",", comma_separated($.type_expression))),
				")",
			),

		member_access: ($) => prec.left(0, seq($.expression, ".", $.expression)),

		type_access: ($) => prec.left(1, seq($.expression, "::", $.expression)),

		impl_declaration: ($) =>
			seq("impl", choice($.impl_for, $.impl_shorthand), $.impl_block),

		impl_for: ($) => seq($.type_expression, "for", $.type_expression),

		impl_shorthand: ($) => $.type_expression,

		impl_block: ($) => seq("{", repeat($.function_declaration), "}"),

		if_expression: ($) =>
			seq(
				"if",
				$.expression,
				"{",
				repeat($._statement),
				"}",
				optional($.else_expression),
			),

		else_expression: ($) =>
			seq("else", choice($.if_expression, seq("{", repeat($._statement), "}"))),

		list_literal: ($) =>
			seq("[", comma_separated($.expression), optional(","), "]"),

		record_literal: ($) =>
			prec(1,
				seq(
					"{",
					repeat(
						seq(
							choice(
								$.record_literal_shorthand,
								$.record_literal_field
							),
							optional(",")
						)
					),
					"}",
				)
			),

		record_literal_shorthand: ($) => prec(1, seq($.identifier)),

		record_literal_field: ($) =>
			seq($.identifier, "=", $.expression),

		match_expression: ($) =>
			seq("match", $.expression, "{", repeat($.match_expression_matcher), "}"),

		match_expression_matcher: ($) =>
			seq(choice($.expression, $.type_expression), "->", $.block),

		for_loop: ($) =>
			choice(
				seq("for", $.block),
				seq("for", $.for_loop_iterator, $.block),
				seq("for", $.identifier, "of", $.for_loop_iterator, $.block),
			),

		for_loop_iterator: ($) => choice($.expression, $.range),

		range: ($) => seq($.expression, "..", $.expression),

		return_statement: ($) =>
			prec.left(1, seq("return", optional($.expression))),

		builtin_type: ($) =>
			choice("string", "int", "float", "string", "list", "unit"),
	},
});
