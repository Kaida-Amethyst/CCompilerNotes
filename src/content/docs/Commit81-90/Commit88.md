---
title: 88. Goto and Labels
---

## commit log

```plaintext
Add goto and labeled statement
```

添加goto与标签。

## Lexer

```c
static bool is_keyword(Token *tok) {
  static char *kw[] = {
     "return", "if", "else", "for", "while", "int", "sizeof", "char",
     "struct", "union", "short", "long", "void", "typedef", "_Bool",
     "enum", "static", "goto",
  };
  // code
}
```

## Parser

```c
// chibicc.h
typedef enum {
  // ...
  ND_GOTO,
  ND_LABEL,
} NodeKind;

struct Node {
  // other fields

  // goto or labeled statement
  char *label;
  char *unqiue_label;
  Node *goto_next;
};

// parser.cc
// Lists of all goto statements and labels in the current function
static Node *gotos;
static Node *labels;

static Node *stmt(Token **rest, Token *tok) {
  // other cases
  if (equal(tok, "goto")) {
    Node *node = new_node(ND_GOTO, tok);
    node->label = get_ident(tok->next);
    node->goto_next = gotos;
    gotos = node;
    *rest = skip(tok->next->next, ";");
    return node;
  }
  if (tok->kind == TK_IDENT && equal(tok->next, ":")) {
    Node *node = new_node(ND_LABEL, tok);
    node->label = strndup(tok->loc, tok->len);
    node->unique_label = new_unique_name();
    node->lhs = stmt(rest, tok->next->next);
    node->goto_next = labels;
    labels = node;
    return node;
  }
}
```

注意一下上面的`goto`跟`label`的搭配问题，实际上，在代码生成阶段中，汇编代码并不是直接写源代码中的`label`的，而是会改写成一个`unique label`。但是`goto`并没有这个unique label。因此需要进行resolve。

```c

void dummy_function() {
  // ...
  goto A;
  // ...
A:            // <----- label name: A
              // unique label name: .L1
  // ...
}
// need to resolve
// change goto A to goto L1
```

```c
static void resolve_goto_labels(void) {
  for (Node *x = gotos; x; x = x->goto_next) {
    for (Node *y = labels; y; y = y->goto_next) 
      if (!strcmp(x->label, y->label)) {
        x->unique_label = y->unique_label;
        break;
      }
    if (x->unique_label == NULL)
      error_tok(x->tok->next, "use of undeclared label");
  }
  gotos = labels = NULL;
}

static Token *function(Token *tok, TYpe *basety, VarAttr *attr) {
  // code...
  resolve_goto_labels();
  return tok;
}
```

## codegen

```c
static void gen_stmt(Node *node) {
  switch(node->kind) {
  case ND_GOTO:
    println("  jmp %s", node->unique_label);
    return ;
  case ND_LABEL:
    println("%s:", node->unique_label);
    gen_stmt(node->lhs);
    return ;
  }
}
```

注意上面的`case ND_LABEL`有一个`gen_stmt`，这是因为`label`的语法是`label :  ident ":" stmt`。

## test

```c
// control.c
int main() {
  ASSERT(3, ({ int i=0; goto a; a: i++; b: i++; c: i++; i; }));
  ASSERT(2, ({ int i=0; goto e; d: i++; e: i++; f: i++; i; }));
  ASSERT(1, ({ int i=0; goto i; g: i++; h: i++; i: i++; i; }));
}
```
