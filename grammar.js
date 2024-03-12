const separated = (separator) => (rule) =>
	seq(rule, repeat(seq(separator, rule)));

const comma_separated = separated(",");
const period_separated = separated(".");
const new_line_separated = separated("\n");

module.exports = grammar({
	name: "juice",

	extras: ($) => [/\s/, $.comment],

	conflicts: ($) => [
		[$._statement, $.value_expression],
		[$.function_arguments]
	],

	rules: {
		program: ($) => seq(optional($.hash_bang_line), repeat($._root_statement)),

		comment: ($) => token(seq("//", /.*/)),

		hash_bang_line: ($) => /#!.*/,

		identifier: ($) => choice(/[a-z_]([a-z0-9_]+)?/),
		type_identifier: ($) => /'[a-z_]([a-z0-9_]+)?/,
		macro_identifier: ($) => /[a-z_]([a-z0-9_]+)?!/,
		_any_identifier: ($) => choice($.identifier, $.macro_identifier),

		int_literal: ($) => token(/[0-9](_?[0-9])*/),
		float_literal: ($) => token(/[0-9](_?[0-9])*\.([0-9](_?[0-9])*)?/),
		binary_literal: ($) => token(/0b[01](_?[01])*/),
		octal_literal: ($) => token(/0o[0-7](_?[0-7])*/),
		hex_literal: ($) => token(/0x[0-9a-fA-F](_?[0-9a-fA-F])*/),

		bool_literal: $ => choice("true", "false"),

		keyword: ($) =>
			choice(
				"fn",
				"import",
				"type",
				"if",
				"else",
				"for",
				"loop",
				"break",
				"await",
				"static",
				"foreign"
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
			choice(
				$.function_declaration,
				$.variable_assignment,
				$.variable_declaration,
				$.expression,
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

		_literal: ($) => choice($._number, $.string_literal, $.bool_literal, $.list_literal),

		value_expression: ($) =>
			prec.left(
				0,
				seq(
					choice(
						$.member_access,
						$.identifier,
						$._literal,
						$.tuple,
						$.function_call,
						$.function_declaration,
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
							field("operator", operator),
							field("right", $.expression),
						),
					),
				),
			),

		import_statement: ($) =>
			seq(
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
							field("operator", operator),
							field("right", $.type_expression),
						),
					),
				),
			),

		type_function_call: ($) =>
			prec.left(1, seq($.expression, "(", $.type_function_arguments, optional(","), ")")),

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
				$.identifier,
				choice(":=", seq(":", $.type_expression, "=")),
				$.expression,
			),

		variable_assignment: ($) => seq($.identifier, "=", $.expression),

		type_declaration: ($) =>
			seq(
				choice(seq("type", $.identifier), $.type_identifier),
				optional($.type_parameters),
				":=",
				choice($.type_expression, $.type_constructors),
			),

		type_parameters: ($) => seq("(", comma_separated($.type_parameter), ")"),

		type_parameter: ($) =>
			seq($.identifier, optional(seq(":", $.type_expression))),

		type_constructors: ($) =>
			seq(
				"{",
				choice(
					repeat($.type_constructor_shorthand),
					repeat($.type_constructor),
				),
				"}",
			),

		type_constructor: ($) => seq($.identifier, $.type_parameters),

		type_constructor_shorthand: ($) =>
			seq($.identifier, ":", $.type_expression),

		function_declaration: ($) =>
			seq(
				"fn",
				field("name", optional(choice($.identifier, $.macro_identifier))),
				optional($.function_parameters),
				optional($.function_return_type),
				$.block,
			),

		function_parameters: ($) =>
			seq("(", comma_separated($.function_parameter), optional(","), ")"),

		function_parameter: ($) =>
			seq($.identifier, optional(seq(":", $.type_expression))),

		function_return_type: ($) => seq("->", $.type_expression),

		block: ($) => seq("{", repeat($._statement), "}"),

		function_call: ($) =>
			prec(
				1,
				seq(
					choice($.expression, $.macro_identifier),
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

		impl_declaration: ($) =>
			seq("impl", choice($.impl_for, $.impl_shorthand), $.impl_block),

		impl_for: ($) => seq($.type_expression, "for", $.type_expression),

		impl_shorthand: ($) => $.type_expression,

		impl_block: ($) => seq("{", repeat($.function_declaration), "}"),

		if_expression: ($) =>
			seq("if", $.expression, $.block, optional($.else_expression)),

		else_expression: ($) => seq("else", choice($.if_expression, $.block)),

		list_literal: $ => seq("[", comma_separated($.expression), optional(","), "]"),

		match_expression: $ => seq(
			"match",
			$.expression,
			"{",
			repeat($.match_expression_matcher),
			"}",
		),

		match_expression_matcher: $ => seq(
			choice($.expression, $.type_expression),
			"->",
			$.block
		),
	},
});
